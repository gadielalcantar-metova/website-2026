#!/usr/bin/env node
// Inventory every <img src="https://images.unsplash..."> across all HTML files.
// Output: scripts/image_inventory.json with unique photo IDs + alt + sizes + files.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'assets' || name === 'brand_assets') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const byPhotoId = new Map();
const imgTagRe = /<img\b[^>]*>/gi;

for (const f of files) {
  const html = readFileSync(f, 'utf8');
  let m;
  while ((m = imgTagRe.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch = tag.match(/src="(https:\/\/images\.unsplash\.com\/photo-[^"?]+)(\?[^"]*)?"/);
    if (!srcMatch) continue;
    const photoId = srcMatch[1].split('/').pop();
    const query = srcMatch[2] || '';
    const wMatch = query.match(/[?&]w=(\d+)/);
    const hMatch = query.match(/[?&]h=(\d+)/);
    const w = wMatch ? parseInt(wMatch[1]) : null;
    const h = hMatch ? parseInt(hMatch[1]) : null;
    const altMatch = tag.match(/alt="([^"]*)"/);
    const alt = altMatch ? altMatch[1] : '';
    const rel = relative(ROOT, f);

    if (!byPhotoId.has(photoId)) {
      byPhotoId.set(photoId, { photoId, alts: new Set(), sizes: new Set(), files: new Set(), occurrences: 0 });
    }
    const rec = byPhotoId.get(photoId);
    if (alt) rec.alts.add(alt);
    if (w && h) rec.sizes.add(`${w}x${h}`);
    rec.files.add(rel);
    rec.occurrences++;
  }
}

const out = [...byPhotoId.values()].map(r => ({
  photoId: r.photoId,
  occurrences: r.occurrences,
  alts: [...r.alts],
  sizes: [...r.sizes],
  files: [...r.files],
}));

writeFileSync(join(ROOT, 'scripts/image_inventory.json'), JSON.stringify(out, null, 2));
console.log(`Unique photos: ${out.length}`);
console.log(`Total occurrences: ${out.reduce((s, r) => s + r.occurrences, 0)}`);
console.log(`Across ${files.length} HTML files`);
