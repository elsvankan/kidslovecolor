#!/usr/bin/env python3
"""
watermark.py — KidsLoveColor.com
Voegt het logo toe aan kleurplaat-afbeeldingen (linksboven in de hoek).

Gebruik:
  python3 watermark.py                    # verwerk alle afbeeldingen in img/kleurplaten/
  python3 watermark.py pad/beeld.jpg ...  # verwerk specifieke bestanden
  python3 watermark.py --dry              # droge run (geen wijzigingen)
  python3 watermark.py --force            # herverwerk al-gewatermerkte afbeeldingen

Logo-positie is afgeleid van de InDesign-sjablonen (IDML):
  Portret A4  (595.276 × 841.890 pt): logo 43×40 pt, links 27 pt, onder 25 pt
  Liggend A4  (841.890 × 595.276 pt): logo 43×40 pt, links 23 pt, onder 19 pt
"""

import sys, io, json
from pathlib import Path
from PIL import Image
import cairosvg

ROOT      = Path(__file__).parent
LOGO_SVG  = ROOT / 'img' / 'logo.svg'
IMAGE_DIR = ROOT / 'img' / 'kleurplaten'
DONE_FILE = IMAGE_DIR / '.watermarked.json'

# InDesign-afmetingen in punten (1 pt = 1/72 inch)
LOGO_W_PT   = 43.125
LOGO_H_PT   = 39.847
SVG_RATIO   = 462 / 500   # hoogte/breedte van logo.svg viewBox

# Positie per oriëntatie (marge = afstand van rand tot logohoek)
PORTRAIT = dict(page_w=595.276, page_h=841.890, left=26.645, bottom=25.066)
LANDSCAPE = dict(page_w=841.890, page_h=595.276, left=23.489, bottom=18.911)


def _dims(img_w: int, img_h: int):
    """Bereken logo-afmetingen en -positie voor een afbeelding."""
    ref = LANDSCAPE if img_w > img_h else PORTRAIT
    scale_w = img_w / ref['page_w']
    scale_h = img_h / ref['page_h']
    logo_w = max(30, round(LOGO_W_PT * scale_w))
    logo_h = round(logo_w * SVG_RATIO)
    left   = round(ref['left']   * scale_w)
    bottom = round(ref['bottom'] * scale_h)
    top    = img_h - bottom - logo_h
    return logo_w, logo_h, left, top


def _render_logo(w: int, h: int) -> Image.Image:
    png = cairosvg.svg2png(url=str(LOGO_SVG), output_width=w, output_height=h)
    return Image.open(io.BytesIO(png)).convert('RGBA')


def watermark(img_path: Path, dry: bool = False) -> None:
    with Image.open(img_path) as img:
        iw, ih = img.size

    lw, lh, left, top = _dims(iw, ih)

    if dry:
        print(f"  [DRY] {img_path.name}: logo {lw}×{lh} @ ({left},{top})")
        return

    logo = _render_logo(lw, lh)

    with Image.open(img_path) as img:
        base = img.convert('RGBA')
        base.paste(logo, (left, top), mask=logo)
        base.convert('RGB').save(img_path, 'JPEG', quality=90, dpi=(150, 150))


def _load_done() -> set:
    if DONE_FILE.exists():
        return set(json.loads(DONE_FILE.read_text()))
    return set()


def _save_done(done: set) -> None:
    DONE_FILE.write_text(json.dumps(sorted(done), indent=2))


def main() -> int:
    dry   = '--dry'   in sys.argv
    force = '--force' in sys.argv
    args  = [a for a in sys.argv[1:] if not a.startswith('-')]

    if args:
        files = [Path(a) for a in args]
    else:
        files = sorted(IMAGE_DIR.glob('*.jpg')) + sorted(IMAGE_DIR.glob('*.png'))

    done = _load_done()
    ok = fail = skip = 0

    for f in files:
        if not force and f.name in done:
            skip += 1
            continue
        try:
            watermark(f, dry)
            if not dry:
                done.add(f.name)
            print(f"  {'[DRY] ' if dry else ''}✓ {f.name}")
            ok += 1
        except Exception as e:
            print(f"  ✗ {f.name}: {e}")
            fail += 1

    if not dry and ok:
        _save_done(done)

    print(f"\nKlaar: {ok} gewatermerkt, {skip} al gedaan, {fail} mislukt")
    return 0 if fail == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
