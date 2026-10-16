#!/usr/bin/env python3
"""Pre-deploy check. The site has no build step, so this stands in for one:
it confirms every local file the pages reference exists with the EXACT
spelling and case. macOS ignores case in filenames; Vercel's Linux servers
do not, so images/Info/x.png referenced as images/info/x.png works here
and 404s once deployed.

Run from anywhere: python3 tools/check-deploy.py
Exits 1 if anything is missing.
"""
import json
import os
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = sorted(f for f in os.listdir(ROOT) if f.endswith('.html') and not f.startswith('._'))

ATTR = re.compile(r'''(?:src|href|poster|data-src|content)\s*=\s*["']([^"']+)["']''', re.I)
SRCSET = re.compile(r'''srcset\s*=\s*["']([^"']+)["']''', re.I)
CSS_URL = re.compile(r'''url\(\s*["']?([^"')]+)["']?\s*\)''')
CSS_IMPORT = re.compile(r'''@import\s+["']([^"']+)["']''')
JS_IMPORT = re.compile(r'''(?:from|import)\s*\(?\s*["'](\.{1,2}/[^"']+)["']''')
JS_PATH = re.compile(r'''["'`]((?:\.{0,2}/)?(?:images|fonts|js|css)/[^"'`$\s]+\.[a-z0-9]{2,5})["'`]''', re.I)
ASSET_EXT = re.compile(r'\.[a-z0-9]{2,5}$', re.I)


def exists_exact(path):
    """True only if every path component matches a directory entry's case."""
    cur = ROOT
    for part in os.path.relpath(path, ROOT).split(os.sep):
        if part in ('.', ''):
            continue
        try:
            if part not in os.listdir(cur):
                return False
        except (NotADirectoryError, FileNotFoundError):
            return False
        cur = os.path.join(cur, part)
    return True


def local_target(ref, base_dir):
    ref = ref.strip()
    if not ref or ref.startswith(('#', 'data:', 'mailto:', 'tel:', 'javascript:', '//')):
        return None
    parts = urlsplit(ref)
    if parts.scheme or parts.netloc:
        return None
    path = unquote(parts.path)
    if not path:
        return None
    if path.startswith('/'):
        return os.path.normpath(os.path.join(ROOT, path.lstrip('/')))
    return os.path.normpath(os.path.join(base_dir, path))


def read(path):
    with open(path, encoding='utf-8', errors='replace') as f:
        return f.read()


def walk(sub, exts):
    for d, _, files in os.walk(os.path.join(ROOT, sub)):
        for f in files:
            if not f.startswith('._') and f.endswith(exts):
                yield os.path.join(d, f)


missing = []
checked = 0


def check(ref, base_dir, source):
    global checked
    target = local_target(ref, base_dir)
    if target is None:
        return
    checked += 1
    if not exists_exact(target):
        missing.append((os.path.relpath(source, ROOT), ref))


for page in PAGES:
    src = os.path.join(ROOT, page)
    text = read(src)
    for m in ATTR.finditer(text):
        ref = m.group(1)
        # content="..." is mostly prose; only follow it when it names a file
        if m.group(0).lower().startswith('content') and not ASSET_EXT.search(ref):
            continue
        check(ref, ROOT, src)
    for m in SRCSET.finditer(text):
        for cand in m.group(1).split(','):
            if cand.strip():
                check(cand.strip().split()[0], ROOT, src)
    for m in CSS_URL.finditer(text):
        check(m.group(1), ROOT, src)

for css in walk('css', ('.css',)):
    text = re.sub(r'/\*.*?\*/', '', read(css), flags=re.S)
    for rx in (CSS_URL, CSS_IMPORT):
        for m in rx.finditer(text):
            check(m.group(1), os.path.dirname(css), css)

for js in walk('js', ('.js', '.mjs')):
    text = read(js)
    for m in JS_IMPORT.finditer(text):
        check(m.group(1), os.path.dirname(js), js)
    # asset paths in scripts resolve against the page, i.e. the site root
    for m in JS_PATH.finditer(text):
        check(m.group(1), ROOT, js)

# every image with a blur-up placeholder must still be on disk (keys are
# relative to images/, see phApply in main.js)
ph = os.path.join(ROOT, 'js', 'placeholders.json')
if os.path.exists(ph):
    for key in json.loads(read(ph)):
        check(key, os.path.join(ROOT, 'images'), ph)

# the Design archive builds its paths at runtime, under
# images/archive/design/, one per DESIGN_BANDS entry. The set is mixed
# media, so each entry names its own file (f: '01.gif') and that is what
# gets checked, extension and case included.
design = os.path.join(ROOT, 'images', 'archive', 'design')
main_js = os.path.join(ROOT, 'js', 'main.js')
design_files = re.findall(r"\bf:\s*'([^']+)'", read(main_js))
for name in design_files:
    check(name, design, main_js)

# the entries must number 1..N with no gap and no repeat: the two layouts
# and the lightbox all index off n, and the alt text reads "N of <count>"
nums = [int(n) for n in re.findall(r'\{\s*n:\s*(\d+)\s*,\s*f:', read(main_js))]
if sorted(nums) != list(range(1, len(nums) + 1)):
    dupes = sorted({n for n in nums if nums.count(n) > 1})
    gaps = [n for n in range(1, (max(nums) if nums else 0) + 1) if n not in nums]
    print(f'\nDESIGN_BANDS numbering is not 1..{len(nums)}'
          + (f' (repeated: {dupes})' if dupes else '')
          + (f' (missing: {gaps})' if gaps else ''))
    sys.exit(1)

print(f'{len(PAGES)} pages, {checked} local references checked')
if missing:
    print(f'\n{len(missing)} BROKEN (missing, or wrong upper/lower case):')
    for source, ref in sorted(set(missing)):
        print(f'  {source}: {ref}')
    sys.exit(1)
print('All references resolve, including exact case.')
