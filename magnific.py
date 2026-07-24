#!/usr/bin/env python3
"""
magnific.py — KidsLoveColor.com
Genereert kleurplaten via Magnific AI en voegt ze toe aan de site.

Gebruik:
  python3 magnific.py <categorie> <moeilijkheid> "<beschrijving>" [--landscape]
  python3 magnific.py kawaii easy "cute cat with flowers"
  python3 magnific.py dieren medium "elephant family in savanna" --landscape

  python3 magnific.py --batch [n]      # genereer n kleurplaten (default 5) uit de rotatiepool
  python3 magnific.py --batch --no-push

Categorieën: dieren, voertuigen, prinsessen, seizoenen, feestdagen,
             eten, kawaii, natuur, sprookjes, ruimte, oceaan, letters, mandala, gezichten
Moeilijkheid: easy, medium, hard

Elke run genereert het beeld op A4 (portret of liggend), zet het watermerk
erop, registreert de kleurplaat in alle 5 talen, werkt de sitemap bij en
pusht automatisch naar git (tenzij --no-push).
"""

import sys, os, time, re, subprocess, io
from pathlib import Path
import requests
from PIL import Image

ROOT     = Path(__file__).parent
ENV      = ROOT / '.env'
API_BASE = 'https://api.magnific.com/v1'
IMG_DIR  = ROOT / 'img' / 'kleurplaten'

A4_PORTRAIT  = (1240, 1754)
A4_LANDSCAPE = (1754, 1240)

VALID_CATS = {
    'dieren','voertuigen','prinsessen','seizoenen','feestdagen',
    'eten','kawaii','natuur','sprookjes','ruimte','oceaan',
    'letters','mandala','gezichten',
}

# Stijlhints per categorie voor de prompt
CAT_HINTS = {
    'dieren':     'cute friendly animal character',
    'voertuigen': 'vehicle, transportation machine, clear bold shapes',
    'prinsessen': 'princess, fairy tale character, magical, fantasy dress',
    'seizoenen':  'seasonal nature scene, seasonal elements',
    'feestdagen': 'celebration holiday scene, festive decorations',
    'eten':       'cute kawaii food item, adorable food character',
    'kawaii':     'kawaii Japanese cute style, big round eyes, super cute character',
    'natuur':     'nature scene, plants, flowers, trees',
    'sprookjes':  'fairy tale magical scene, enchanted fantasy',
    'ruimte':     'outer space scene, stars, planets, rockets',
    'oceaan':     'underwater ocean scene, sea creatures, coral',
    'letters':    'decorative alphabet letter, ornamental design',
    'mandala':    'symmetrical mandala pattern, geometric repeating design',
    'gezichten':  'cute character face, expressive portrait, simple face features',
}

DIFF_HINTS = {
    'easy':   'very simple large shapes, minimal detail, big areas to fill, for ages 3-6',
    'medium': 'moderate detail, varied line widths, for ages 6-10',
    'hard':   'detailed intricate design, many small areas, for ages 10 and up',
}

# Categorieën waar een close-up gezicht/hoofd wél de bedoeling is
HEAD_OK_CATS = {'gezichten'}

# ─────────────────────────────────────────────────────────────
# ROTATIEPOOL — grote lijst met volledige scènes/figuren (geen
# geïsoleerde hoofden, behalve bij 'gezichten'). Elk item:
# (categorie, moeilijkheid, beschrijving, landscape:bool)
# --batch kiest hieruit de eerstvolgende N die nog niet bestaan.
# ─────────────────────────────────────────────────────────────
TOPIC_POOL = [
    # dieren — volledige lijven, scènes
    ('dieren', 'easy',   'full body elephant walking in the jungle', False),
    ('dieren', 'medium', 'lion family resting under a tree',          True),
    ('dieren', 'easy',   'puppy playing with a ball in the garden',   False),
    ('dieren', 'medium', 'giraffe eating leaves from a tall tree',    False),
    ('dieren', 'hard',   'zoo scene with many different animals',    True),
    ('dieren', 'medium', 'monkey swinging from jungle vines',         False),
    ('dieren', 'easy',   'farm scene with cow, pig and chicken',      True),
    ('dieren', 'hard',   'horse galloping through a meadow',          True),

    # voertuigen — altijd volledige machine, vaak liggend
    ('voertuigen', 'easy',   'fire truck with ladder driving to a rescue', True),
    ('voertuigen', 'medium', 'race cars competing on a track',             True),
    ('voertuigen', 'easy',   'rocket ship launching into space',           False),
    ('voertuigen', 'medium', 'pirate ship sailing on ocean waves',         True),
    ('voertuigen', 'hard',   'busy airport scene with airplanes',          True),
    ('voertuigen', 'easy',   'tractor working in a farm field',            True),
    ('voertuigen', 'medium', 'train crossing a bridge over a river',       True),

    # prinsessen — volledige figuur in een setting
    ('prinsessen', 'easy',   'princess dancing in a castle ballroom',      False),
    ('prinsessen', 'medium', 'princess riding a unicorn through a forest', True),
    ('prinsessen', 'hard',   'princess castle with towers and a garden',   True),
    ('prinsessen', 'medium', 'princess having a tea party with friends',   True),
    ('prinsessen', 'easy',   'princess walking with her pet swan',         False),

    # seizoenen — volledige buitenscène
    ('seizoenen', 'medium', 'children building a snowman in winter',       True),
    ('seizoenen', 'easy',   'autumn scene with falling leaves and a tree', False),
    ('seizoenen', 'medium', 'spring garden full of blooming flowers',      True),
    ('seizoenen', 'easy',   'kids playing at the beach in summer',         True),
    ('seizoenen', 'hard',   'four seasons tree in one picture',            False),

    # feestdagen — volledige scène
    ('feestdagen', 'easy',   'santa claus delivering presents by sleigh',  True),
    ('feestdagen', 'medium', 'halloween scene with pumpkins and a bat',    True),
    ('feestdagen', 'easy',   'birthday party table with cake and balloons',True),
    ('feestdagen', 'medium', 'easter bunny hiding eggs in a garden',       True),
    ('feestdagen', 'easy',   'fireworks celebration at new year',          True),

    # eten — kawaii personage met omgeving
    ('eten', 'easy',   'kawaii ice cream cone with a happy face on a beach', False),
    ('eten', 'medium', 'fruit basket full of different kawaii fruits',      True),
    ('eten', 'easy',   'kawaii cupcake with sprinkles and a cherry',        False),
    ('eten', 'medium', 'picnic scene with sandwiches and juice',            True),

    # kawaii — volledig figuur, actie
    ('kawaii', 'easy',   'kawaii bear having a picnic under a tree',   True),
    ('kawaii', 'medium', 'kawaii fox playing in autumn leaves',        False),
    ('kawaii', 'easy',   'kawaii penguin sliding on ice',              False),
    ('kawaii', 'medium', 'kawaii dinosaur playing with balloons',      False),

    # natuur — landschap
    ('natuur', 'medium', 'forest scene with tall trees and a stream',  True),
    ('natuur', 'easy',   'sunflower field under a smiling sun',        True),
    ('natuur', 'hard',   'jungle scene with waterfall and plants',     True),
    ('natuur', 'medium', 'butterfly garden with many flowers',         False),

    # sprookjes — volledige scène
    ('sprookjes', 'medium', 'dragon guarding a treasure in a cave',      True),
    ('sprookjes', 'hard',   'enchanted forest with fairies and mushrooms', True),
    ('sprookjes', 'medium', 'knight riding a horse to a castle',         True),
    ('sprookjes', 'easy',   'friendly wizard casting a magic spell',     False),

    # ruimte — volledige scène
    ('ruimte', 'medium', 'astronaut floating among planets and stars', False),
    ('ruimte', 'easy',   'friendly alien waving next to a UFO',        False),
    ('ruimte', 'hard',   'solar system with all planets and the sun',  True),

    # oceaan — volledige scène
    ('oceaan', 'medium', 'dolphin family jumping over ocean waves',   True),
    ('oceaan', 'easy',   'happy octopus playing with a beach ball',   False),
    ('oceaan', 'hard',   'coral reef scene with fish and a turtle',   True),
    ('oceaan', 'medium', 'mermaid sitting on a rock by the sea',      False),

    # letters — decoratief, portret
    ('letters', 'medium', 'letter A decorated with apples and ants',    False),
    ('letters', 'medium', 'letter B decorated with butterflies',        False),
    ('letters', 'medium', 'letter S decorated with stars and a sun',    False),

    # mandala — altijd portret, symmetrisch
    ('mandala', 'hard',   'animal themed mandala with birds',          False),
    ('mandala', 'medium', 'simple flower mandala for beginners',       False),
    ('mandala', 'hard',   'ocean themed mandala with shells and waves',False),

    # gezichten — hier is een close-up wél de bedoeling
    ('gezichten', 'easy', 'happy boy face with a big smile',      False),
    ('gezichten', 'easy', 'cute puppy face with floppy ears',     False),
    ('gezichten', 'medium', 'lion face with a fluffy mane',       False),
    ('gezichten', 'easy', 'smiling sun face with rays',           False),
]


def _load_key():
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            if line.startswith('MAGNIFIC_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"\'')
    key = os.environ.get('MAGNIFIC_API_KEY', '')
    if key:
        return key
    print('ERROR: Geen API key gevonden. Zet MAGNIFIC_API_KEY in .env')
    sys.exit(1)


def _build_prompt(description, category, difficulty):
    framing = (
        'Show the full character or the full scene composition, not just an isolated head or face close-up.'
        if category not in HEAD_OK_CATS else
        'Close-up portrait framing is fine here.'
    )
    return (
        f'black and white coloring page for children: {description}. '
        f'{CAT_HINTS.get(category, "")}. {framing} '
        f'{DIFF_HINTS.get(difficulty, DIFF_HINTS["easy"])}. '
        'Style: clean bold outlines only, pure white background, absolutely no shading, '
        'no color fills, no gradients, simple line art ready to color with crayons. '
        'High contrast black lines on white paper. Printable coloring book style.'
    )


def _slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9 ]+', '', text)
    return re.sub(r'\s+', '-', text).strip('-')


def _filename_for(category, difficulty, description):
    return f'{category}--{difficulty}--{_slugify(description)}.jpg'


def _headers(key):
    return {'x-magnific-api-key': key, 'Content-Type': 'application/json'}


def _generate(key, prompt, landscape):
    payload = {
        'prompt': prompt,
        'resolution': '2k',
        'aspect_ratio': 'classic_4_3' if landscape else 'traditional_3_4',
        'model': 'fluid',
        'creative_detailing': 20,
        'filter_nsfw': True,
    }
    r = requests.post(f'{API_BASE}/ai/mystic', json=payload,
                      headers=_headers(key), timeout=30)
    r.raise_for_status()
    return r.json()['data']['task_id']


def _poll(key, task_id, max_wait=300):
    start = time.time()
    while time.time() - start < max_wait:
        r = requests.get(f'{API_BASE}/ai/mystic/{task_id}',
                         headers={'x-magnific-api-key': key}, timeout=30)
        r.raise_for_status()
        data = r.json()['data']
        status = data.get('status', '')
        print(f'  Status: {status}   ', end='\r', flush=True)
        if status == 'COMPLETED':
            print()
            return data['generated'][0]
        if status == 'FAILED':
            raise RuntimeError(f'Generatie mislukt: {data}')
        time.sleep(6)
    raise TimeoutError('Timeout na 5 minuten')


def _save(url, out_path, landscape):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert('RGB')

    target_w, target_h = A4_LANDSCAPE if landscape else A4_PORTRAIT

    # "Contain"-fit: schaal zonder vervorming, vul de rest met wit
    # (voorkomt uitgerekte lijntekeningen bij afwijkende AI-ratio's).
    src_ratio = img.width / img.height
    dst_ratio = target_w / target_h
    if src_ratio > dst_ratio:
        new_w = target_w
        new_h = round(target_w / src_ratio)
    else:
        new_h = target_h
        new_w = round(target_h * src_ratio)
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new('RGB', (target_w, target_h), 'white')
    canvas.paste(resized, ((target_w - new_w) // 2, (target_h - new_h) // 2))
    canvas.save(out_path, 'JPEG', quality=92, dpi=(150, 150))


def generate_one(category, difficulty, description, key, landscape=False):
    filename = _filename_for(category, difficulty, description)
    out_path = IMG_DIR / filename

    if out_path.exists():
        print(f'  Bestaat al, overgeslagen: {filename}')
        return False

    prompt = _build_prompt(description, category, difficulty)
    orientation = 'liggend' if landscape else 'portret'

    print(f'\n--- {filename} ({orientation}) ---')
    print(f'  Prompt: {prompt[:90]}...')

    print('  [1/3] Genereren via Magnific...')
    task_id = _generate(key, prompt, landscape)

    print(f'  [2/3] Wachten op resultaat (task {task_id[:8]}...)...')
    img_url = _poll(key, task_id)

    dims = 'A4 liggend (1754×1240)' if landscape else 'A4 portret (1240×1754)'
    print(f'  [3/3] Opslaan als {dims}...')
    _save(img_url, out_path, landscape)
    print(f'  Opgeslagen: {filename}')
    return True


def pick_topics(n):
    """Kies de eerstvolgende n onderwerpen uit TOPIC_POOL die nog geen
    bestand hebben, zodat elke dag nieuwe onderwerpen aan bod komen."""
    chosen = []
    for cat, diff, desc, landscape in TOPIC_POOL:
        filename = _filename_for(cat, diff, desc)
        if (IMG_DIR / filename).exists():
            continue
        chosen.append((cat, diff, desc, landscape))
        if len(chosen) >= n:
            break
    return chosen


def run_add_colorings():
    print('\n  add-colorings.js uitvoeren (watermark + data.js + sitemap)...')
    result = subprocess.run(
        ['node', str(ROOT / 'add-colorings.js')],
        capture_output=True, text=True, cwd=ROOT
    )
    print(result.stdout)
    if result.returncode != 0 and result.stderr:
        print('WAARSCHUWING:', result.stderr[:300])


def git_push(message):
    """Commit + push alle wijzigingen op de huidige branch."""
    subprocess.run(['git', 'add', '-A'], cwd=ROOT, check=True)
    diff = subprocess.run(['git', 'diff', '--cached', '--quiet'], cwd=ROOT)
    if diff.returncode == 0:
        print('\n  Geen wijzigingen om te pushen.')
        return
    subprocess.run(['git', 'commit', '-m', message], cwd=ROOT, check=True)
    branch = subprocess.run(
        ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
        cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.strip()
    result = subprocess.run(
        ['git', 'push', '-u', 'origin', branch],
        cwd=ROOT, capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f'  Gepusht naar {branch}.')
    else:
        print(f'  WAARSCHUWING: git push mislukt:\n{result.stderr[:500]}')


def main():
    args  = [a for a in sys.argv[1:] if not a.startswith('-')]
    flags = [a for a in sys.argv[1:] if a.startswith('-')]

    key = _load_key()
    do_push = '--no-push' not in flags

    if '--batch' in flags:
        n = 5
        for a in args:
            if a.isdigit():
                n = int(a)
        topics = pick_topics(n)
        if not topics:
            print('Rotatiepool is uitgeput — alle onderwerpen zijn al gegenereerd.')
            print('Voeg nieuwe onderwerpen toe aan TOPIC_POOL in magnific.py.')
            return

        print(f'Batch-modus: {len(topics)} kleurplaten genereren...')
        added = 0
        for cat, diff, desc, landscape in topics:
            try:
                if generate_one(cat, diff, desc, key, landscape):
                    added += 1
            except Exception as e:
                print(f'  FOUT: {e}')

        if added:
            run_add_colorings()
            if do_push:
                git_push(f'Dagelijkse kleurplaten: {added} nieuwe pagina\'s')
        print(f'\nKlaar: {added} nieuw gegenereerd.')
        return

    if len(args) < 3:
        print(__doc__)
        sys.exit(1)

    category, difficulty, description = args[0], args[1], ' '.join(args[2:])
    landscape = '--landscape' in flags

    if category not in VALID_CATS:
        print(f'Ongeldige categorie: {category}')
        print(f'Kies uit: {", ".join(sorted(VALID_CATS))}')
        sys.exit(1)
    if difficulty not in ('easy', 'medium', 'hard'):
        print('Moeilijkheid moet easy, medium of hard zijn.')
        sys.exit(1)

    if generate_one(category, difficulty, description, key, landscape):
        run_add_colorings()
        if do_push:
            git_push(f'Nieuwe kleurplaat: {description}')
    print('\nKlaar!')


if __name__ == '__main__':
    main()
