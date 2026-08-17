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

import sys, io, json, subprocess, tempfile
from pathlib import Path
from PIL import Image

try:
    import cairosvg
except ModuleNotFoundError:
    cairosvg = None

ROOT       = Path(__file__).parent
LOGO_SVG   = ROOT / 'img' / 'logo.svg'
IMAGE_DIR  = ROOT / 'img' / 'kleurplaten'
THUMB_DIR  = IMAGE_DIR / 'thumbs'
DONE_FILE  = IMAGE_DIR / '.watermarked.json'
THUMB_WIDTH = 400  # px — genoeg voor scherpe weergave op 300px-brede kaarten (incl. retina)

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
    if cairosvg is not None:
        png = cairosvg.svg2png(url=str(LOGO_SVG), output_width=w, output_height=h)
        return Image.open(io.BytesIO(png)).convert('RGBA')

    # macOS ships `sips`, which can rasterize SVG without an extra Python
    # dependency. This keeps the publishing script usable in Codex runtimes
    # where Pillow is present but CairoSVG is not.
    with tempfile.TemporaryDirectory() as tmp:
        raster = Path(tmp) / 'logo.png'
        subprocess.run(
            ['sips', '-s', 'format', 'png', str(LOGO_SVG), '--out', str(raster)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with Image.open(raster) as logo:
            return logo.convert('RGBA').resize((w, h), Image.LANCZOS)


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
        final = base.convert('RGB')
        final.save(img_path, 'JPEG', quality=90, dpi=(150, 150))

    make_thumbnail(img_path, final)


def make_thumbnail(img_path: Path, img: Image.Image = None) -> None:
    """Genereert een kleine JPEG (400px breed) voor gebruik in de grid,
    zodat kaartjes niet de volledige afdrukkwaliteit-JPEG (500-800KB)
    hoeven te downloaden — belangrijk voor LCP/paginagewicht."""
    THUMB_DIR.mkdir(exist_ok=True)
    if img is None:
        img = Image.open(img_path).convert('RGB')
    w, h = img.size
    thumb_h = round(THUMB_WIDTH * h / w)
    thumb = img.resize((THUMB_WIDTH, thumb_h), Image.LANCZOS)
    thumb.save(THUMB_DIR / img_path.name, 'JPEG', quality=72, dpi=(96, 96))


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
    ok = fail = skip = thumbs = 0

    for f in files:
        if not force and f.name in done:
            # Al gewatermerkt — check alleen of de thumbnail nog ontbreekt
            # (bijv. voor bestanden van vóór de thumbnail-functionaliteit).
            if not dry and not (THUMB_DIR / f.name).exists():
                try:
                    make_thumbnail(f)
                    thumbs += 1
                except Exception as e:
                    print(f"  ✗ thumbnail {f.name}: {e}")
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

    if thumbs:
        print(f"  ({thumbs} ontbrekende thumbnails alsnog aangemaakt)")

    if not dry and ok:
        _save_done(done)

    print(f"\nKlaar: {ok} gewatermerkt, {skip} al gedaan, {fail} mislukt")
    return 0 if fail == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
