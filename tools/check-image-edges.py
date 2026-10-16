#!/usr/bin/env python3
"""Find the 1px light line some exports bake onto an image's right/bottom edge.

A frame rendered at a fractional size leaves its last row and column only
half covered, and that half pixel gets blended with the white artboard
behind it. The result is a hairline that is invisible against the light
theme and reads as a white border against the dark one, so it survives
eyeballing and only shows up once the page is in dark mode.

Run it over a folder after dropping in a new batch:

    python3 tools/check-image-edges.py images/archive/design

Exits non-zero if anything is flagged. Needs Pillow (not stdlib, which is
why this is separate from check-deploy.py, the pre-deploy gate).
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is needed for this check: python3 -m pip install --user Pillow')

RASTER = ('.jpg', '.jpeg', '.png', '.gif', '.webp')
THRESHOLD = 25  # luminance the outer line has to beat the rows just inside it by


def luma(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def edges(path):
    """(top, right, bottom, left) luminance of the outermost line minus the
    mean of the four lines just inside it. Positive = outer line is lighter."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    if w < 8 or h < 8:
        return None
    px = im.load()
    sx, sy = max(1, w // 200), max(1, h // 200)
    xs, ys = range(0, w, sx), range(0, h, sy)
    mean = lambda v: sum(v) / len(v)
    outer = (
        mean([luma(px[x, 0]) for x in xs]),
        mean([luma(px[w - 1, y]) for y in ys]),
        mean([luma(px[x, h - 1]) for x in xs]),
        mean([luma(px[0, y]) for y in ys]),
    )
    inner = (
        mean([luma(px[x, d]) for d in range(2, 6) for x in xs]),
        mean([luma(px[w - 1 - d, y]) for d in range(2, 6) for y in ys]),
        mean([luma(px[x, h - 1 - d]) for d in range(2, 6) for x in xs]),
        mean([luma(px[d, y]) for d in range(2, 6) for y in ys]),
    )
    return [o - i for o, i in zip(outer, inner)]


def main(folder):
    if not os.path.isdir(folder):
        sys.exit(f'not a folder: {folder}')
    names = sorted(
        f for f in os.listdir(folder)
        if f.lower().endswith(RASTER) and not f.startswith('._')
    )
    flagged = []
    for name in names:
        diff = edges(os.path.join(folder, name))
        if not diff:
            continue
        hits = [('TRBL'[i], round(d)) for i, d in enumerate(diff) if d > THRESHOLD]
        if hits:
            flagged.append((name, hits))
    print(f'{len(names)} images checked in {folder}')
    if not flagged:
        print('No baked edge lines.')
        return 0
    print(f'\n{len(flagged)} with a light line on an edge '
          '(T=top R=right B=bottom L=left, + = how much lighter):')
    for name, hits in flagged:
        print('  %-12s %s' % (name, '  '.join(f'{s} +{d}' for s, d in hits)))
    print('\nRe-export at a whole-pixel size, or trim the flagged row/column.')
    return 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'images/archive/design'))
