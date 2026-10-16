#!/usr/bin/env node
/**
 * Blur-up placeholder generator (canonical version).
 *
 * Scans images/, renders each raster image as a 20px-wide WebP, encodes
 * it as a base64 data URI, and writes the filename -> data URI map to
 * js/placeholders.json. Run manually whenever images are added:
 *
 *   npm install sharp   (once, in tools/)
 *   node tools/generate-placeholders.mjs
 *
 * NOTE: Node is not installed on the studio Mac as of 2026-07.
 * tools/generate-placeholders.py is a zero-dependency fallback that
 * produces the same JSON (JPEG data URIs instead of WebP).
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('..', import.meta.url).pathname;
const IMAGES = join(ROOT, 'images');
const OUT = join(ROOT, 'js', 'placeholders.json');
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.gif']);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (RASTER.has(extname(entry.name).toLowerCase())) yield path;
  }
}

const map = {};
for await (const path of walk(IMAGES)) {
  const buf = await sharp(await readFile(path), { pages: 1 })
    .resize({ width: 20 })
    .webp({ quality: 55 })
    .toBuffer();
  map[relative(IMAGES, path)] = `data:image/webp;base64,${buf.toString('base64')}`;
  console.log(relative(IMAGES, path), `${buf.length}B`);
}

await writeFile(OUT, JSON.stringify(map));
console.log(`\nwrote ${OUT} (${Object.keys(map).length} images)`);
