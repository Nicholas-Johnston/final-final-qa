#!/usr/bin/env python3
"""Blur-up placeholder generator (no-dependency fallback).

Same output as generate-placeholders.mjs but uses macOS's built-in
`sips`, so it runs without Node/sharp. Emits 20px-wide JPEG data URIs
(sips cannot write WebP); at blur-up scale the two are indistinguishable.

    python3 tools/generate-placeholders.py
"""
import base64
import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, 'images')
OUT = os.path.join(ROOT, 'js', 'placeholders.json')
RASTER = {'.jpg', '.jpeg', '.png', '.gif'}

mapping = {}
with tempfile.TemporaryDirectory() as tmp:
    tiny = os.path.join(tmp, 'tiny.jpg')
    for dirpath, dirnames, filenames in os.walk(IMAGES):
        dirnames[:] = [d for d in dirnames if not d.startswith('.')]
        for name in sorted(filenames):
            if name.startswith('.') or os.path.splitext(name)[1].lower() not in RASTER:
                continue
            src = os.path.join(dirpath, name)
            proc = subprocess.run(
                ['sips', '--resampleWidth', '20', '-s', 'format', 'jpeg',
                 '-s', 'formatOptions', 'low', src, '--out', tiny],
                capture_output=True,
            )
            if proc.returncode != 0 or not os.path.exists(tiny):
                print('skip (sips failed):', src, file=sys.stderr)
                continue
            with open(tiny, 'rb') as f:
                data = base64.b64encode(f.read()).decode('ascii')
            key = os.path.relpath(src, IMAGES)
            mapping[key] = 'data:image/jpeg;base64,' + data
            print(key, f'{len(data) * 3 // 4}B')
            os.remove(tiny)

with open(OUT, 'w') as f:
    json.dump(mapping, f)
print(f'\nwrote {OUT} ({len(mapping)} images)')
