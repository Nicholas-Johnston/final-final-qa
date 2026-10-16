#!/usr/bin/env python3
"""Sync the home page carousels with the images/ folders.

For every project section in index.html, rebuilds its slide block from
the files actually in images/<project>/ (sorted by their -NN number):

- images  -> <img> slides (lazy, except the first project's slides 1-4)
- video   -> <video autoplay muted loop playsinline> slides (mp4/webm/mov)
- numbering gaps (e.g. cf-10 then cf-12) -> grey placeholder slides
- descriptions carry over by file CONTENT (md5), so renaming or
  reordering keeps each image's label; genuinely new files get a
  generic label until a description is added to
  tools/carousel-descriptions.json (md5 -> text)

Safe by construction: parses the current markup, rebuilds, validates
slot sequences, and only writes when something changed. Regenerates
js/placeholders.json (via tools/generate-placeholders.py) after a write.

Run manually or let the dev server trigger it (serve.py does, on page
loads after an images/ change).
"""
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
IMAGES = os.path.join(ROOT, 'images')
DESCRIPTIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            'carousel-descriptions.json')

IMG_EXTS = {'.jpg', '.jpeg', '.png', '.gif'}
VIDEO_EXTS = {'.mp4', '.webm', '.mov'}

CAROUSEL_RE = re.compile(
    r'(<div class="carousel" tabindex="0" aria-label="(?P<title>[^"]+) project images">\n)'
    r'(?P<body>.*?)'
    r'(\n      </div>)',
    re.S,
)
SLIDE_RE = re.compile(
    r'<div class="slide" data-slot="(?P<slot>[a-z0-9-]+?)-(?P<num>\d\d)"[^>]*'
    r'aria-label="(?P<label>[^"]*)"[^>]*>(?:<(?:img|video) [^>]*src="(?P<src>[^"]+)"[^>]*>(?:</video>)?)?</div>'
)
FILE_RE = re.compile(r'^.*-(\d{2,})\.([A-Za-z0-9]+)$')


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def load_descriptions():
    if os.path.exists(DESCRIPTIONS):
        with open(DESCRIPTIONS) as f:
            return json.load(f)
    return {}


def main():
    html = open(INDEX, encoding='utf-8').read()
    descriptions = load_descriptions()
    changed_sections = []
    missing_descriptions = []

    sections = list(CAROUSEL_RE.finditer(html))
    if not sections:
        print('no carousel sections found; aborting', file=sys.stderr)
        return 1

    new_html = html
    for section_index, m in enumerate(sections):
        title = m.group('title')
        slides = list(SLIDE_RE.finditer(m.group('body')))
        if not slides:
            continue
        slot_prefix = slides[0].group('slot')
        folder = os.path.join(IMAGES, slot_prefix)
        if not os.path.isdir(folder):
            print(f'warn: no folder for "{title}" ({folder}); leaving as is')
            continue

        # Harvest current descriptions into the manifest (by content)
        for s in slides:
            src = s.group('src')
            label = s.group('label')
            desc = label.split(': ', 1)[1] if ': ' in label else ''
            if src and desc:
                path = os.path.join(ROOT, src)
                if os.path.exists(path):
                    descriptions.setdefault(md5(path), desc)

        # Scan the folder: number -> filename (numbering gaps allowed)
        found = {}
        for name in sorted(os.listdir(folder)):
            if name.startswith('.'):
                continue
            fm = FILE_RE.match(name)
            if not fm:
                continue
            ext = '.' + fm.group(2).lower()
            if ext not in IMG_EXTS | VIDEO_EXTS:
                continue
            num = int(fm.group(1))
            if num in found:
                print(f'warn: {slot_prefix} has two files numbered {num:02d} '
                      f'({found[num]} + {name}); keeping {found[num]}')
                continue
            found[num] = name
        if not found:
            continue

        total = max(found)
        lines = []
        for i in range(1, total + 1):
            label = f'{title} image {i} of {total}'
            inner = ''
            if i in found:
                name = found[i]
                ext = os.path.splitext(name)[1].lower()
                src = f'images/{slot_prefix}/{name}'
                digest = md5(os.path.join(folder, name))
                desc = descriptions.get(digest, '')
                if desc:
                    label += f': {desc}'
                else:
                    descriptions.setdefault(digest, '')
                    missing_descriptions.append(src)
                if ext in VIDEO_EXTS:
                    inner = (f'<video src="{src}" autoplay muted loop '
                             f'playsinline preload="metadata"></video>')
                else:
                    eager = section_index == 0 and i <= 4
                    lazy = '' if eager else ' loading="lazy"'
                    inner = f'<img src="{src}" alt=""{lazy}>'
            lines.append(
                f'        <div class="slide" data-slot="{slot_prefix}-{i:02d}" '
                f'role="group" aria-label="{label}">{inner}</div>'
            )
        new_body = '\n'.join(lines)
        if new_body != m.group('body'):
            changed_sections.append(title)
            new_html = new_html.replace(
                m.group(0), m.group(1) + new_body + m.group(4)
            )

    if new_html != html:
        # Validate every carousel before writing: sequential, no dupes
        for m in CAROUSEL_RE.finditer(new_html):
            nums = [int(s.group('num')) for s in SLIDE_RE.finditer(m.group('body'))]
            assert nums == list(range(1, len(nums) + 1)), (m.group('title'), nums)
        open(INDEX, 'w', encoding='utf-8').write(new_html)
        subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                          'generate-placeholders.py')],
            check=False, capture_output=True,
        )
        print('updated:', ', '.join(changed_sections))
    else:
        print('carousels already in sync')

    with open(DESCRIPTIONS, 'w') as f:
        json.dump(descriptions, f, indent=2, sort_keys=True)
    if missing_descriptions:
        print('needs descriptions:', ', '.join(missing_descriptions))
    return 0


if __name__ == '__main__':
    sys.exit(main())
