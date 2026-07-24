#!/usr/bin/env python3
"""
magnific.py — KidsLoveColor.com
Genereert een kleurplaat via Magnific AI en voegt hem toe aan de site.

Gebruik:
  python3 magnific.py <categorie> <moeilijkheid> "<beschrijving>"
  python3 magnific.py kawaii easy "cute cat with flowers"
  python3 magnific.py dieren medium "elephant family in savanna"
  python3 magnific.py --batch                  # genereer 5 kleurplaten uit built-in lijst

Categorieën: dieren, voertuigen, prinsessen, seizoenen, feestdagen,
             eten, kawaii, natuur, sprookjes, ruimte, oceaan, letters, mandala, gezichten
Moeilijkheid: easy, medium, hard
"""

import sys, os, time, re, subprocess, io
from pathlib import Path
import requests
from PIL import Image

ROOT    = Path(__file__).parent
ENV     = ROOT / '.env'
API_BASE = 'https://api.magnific.com/v1'
IMG_DIR = ROOT / 'img' / 'kleurplaten'

VALID_CATS = {
    'dieren','voertuigen','prinsessen','seizoenen','feestdagen',
    'eten','kawaii','natuur','sprookjes','ruimte','oceaan',
    'letters','mandala','gezichten',
}

# Stijlhints per categorie voor de prompt
CAT_HINTS = {
    'dieren':     'cute friendly animal, child-friendly character',
    'voertuigen': 'vehicle, transportation machine, clear shapes',
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

# Prioriteitslijst voor --batch (categorieën die het minst vertegenwoordigd zijn)
BATCH_QUEUE = [
    ('prinsessen', 'easy',   'cute princess with magic wand'),
    ('prinsessen', 'medium', 'princess dress with flowers'),
    ('gezichten',  'easy',   'happy girl face with pigtails'),
    ('kawaii',     'easy',   'kawaii unicorn with stars'),
    ('feestdagen', 'easy',   'christmas tree with ornaments'),
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
    return (
        f'black and white coloring page for children: {description}. '
        f'{CAT_HINTS.get(category, "")}. '
        f'{DIFF_HINTS.get(difficulty, DIFF_HINTS["easy"])}. '
        'Style: clean bold outlines only, pure white background, absolutely no shading, '
        'no color fills, no gradients, simple line art ready to color with crayons. '
        'High contrast black lines on white paper. Printable coloring book style.'
    )


def _slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9 ]+', '', text)
    return re.sub(r'\s+', '-', text).strip('-')


def _headers(key):
    return {'x-magnific-api-key': key, 'Content-Type': 'application/json'}


def _generate(key, prompt):
    payload = {
        'prompt': prompt,
        'resolution': '2k',
        'aspect_ratio': 'traditional_3_4',
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


def _save(url, out_path):
    r = requests.get(url, timeout=120)
    r.raise_for_status()
    img = Image.open(io.BytesIO(r.content)).convert('RGB')
    img = img.resize((1240, 1754), Image.LANCZOS)
    img.save(out_path, 'JPEG', quality=92, dpi=(150, 150))


def generate_one(category, difficulty, description, key):
    slug_desc = _slugify(description)
    filename  = f'{category}--{difficulty}--{slug_desc}.jpg'
    out_path  = IMG_DIR / filename

    if out_path.exists():
        print(f'  Bestaat al, overgeslagen: {filename}')
        return False

    prompt = _build_prompt(description, category, difficulty)

    print(f'\n--- {filename} ---')
    print(f'  Prompt: {prompt[:90]}...')

    print('  [1/3] Genereren via Magnific...')
    task_id = _generate(key, prompt)

    print(f'  [2/3] Wachten op resultaat (task {task_id[:8]}...)...')
    img_url = _poll(key, task_id)

    print('  [3/3] Opslaan als A4 JPG (1240×1754)...')
    _save(img_url, out_path)
    print(f'  Opgeslagen: {filename}')
    return True


def run_add_colorings():
    print('\n  add-colorings.js uitvoeren (watermark + data.js + sitemap)...')
    result = subprocess.run(
        ['node', str(ROOT / 'add-colorings.js')],
        capture_output=True, text=True, cwd=ROOT
    )
    print(result.stdout)
    if result.returncode != 0 and result.stderr:
        print('WAARSCHUWING:', result.stderr[:300])


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    flags = [a for a in sys.argv[1:] if a.startswith('-')]

    key = _load_key()

    if '--batch' in flags:
        print(f'Batch-modus: {len(BATCH_QUEUE)} kleurplaten genereren...')
        added = 0
        for cat, diff, desc in BATCH_QUEUE:
            try:
                if generate_one(cat, diff, desc, key):
                    added += 1
            except Exception as e:
                print(f'  FOUT: {e}')
        if added:
            run_add_colorings()
        print(f'\nKlaar: {added} nieuw gegenereerd.')
        return

    if len(args) < 3:
        print(__doc__)
        sys.exit(1)

    category, difficulty, description = args[0], args[1], ' '.join(args[2:])

    if category not in VALID_CATS:
        print(f'Ongeldige categorie: {category}')
        print(f'Kies uit: {", ".join(sorted(VALID_CATS))}')
        sys.exit(1)
    if difficulty not in ('easy', 'medium', 'hard'):
        print('Moeilijkheid moet easy, medium of hard zijn.')
        sys.exit(1)

    if generate_one(category, difficulty, description, key):
        run_add_colorings()
    print('\nKlaar!')


if __name__ == '__main__':
    main()
