#!/usr/bin/env node
// Fetches https://metova.com/case-studies/ and pulls every image referenced
// from the page (excluding logos/SVG icons under a size threshold). Saves to
// assets/photos/metova-source/<slug>.<ext> and writes a manifest so we can
// map them to local case-study slots later.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'assets/photos/metova-source');
mkdirSync(OUT_DIR, { recursive: true });

const PAGE = 'https://metova.com/case-studies/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractImageUrls(html, baseUrl) {
  const urls = new Set();
  // <img src="...">
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)) urls.add(m[1]);
  // <img srcset="url1 1x, url2 2x"> — take largest
  for (const m of html.matchAll(/<img[^>]+srcset=["']([^"']+)["']/g)) {
    const candidates = m[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    candidates.forEach(c => urls.add(c));
  }
  // CSS background-image: url(...)
  for (const m of html.matchAll(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/g)) urls.add(m[1]);
  // data-src lazy load
  for (const m of html.matchAll(/data-(?:src|lazy|background|bg)=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi)) urls.add(m[1]);

  return [...urls].map(u => {
    try { return new URL(u, baseUrl).href; }
    catch { return null; }
  }).filter(Boolean);
}

function inferCaseStudySlug(url, html) {
  // Look at filename
  const fname = url.split('/').pop().split('?')[0].toLowerCase();
  const lower = fname.replace(/[-_]/g, '');
  const map = [
    ['fiton', 'fiton'],
    ['mybambu', 'mybambu'],
    ['bambu', 'mybambu'],
    ['barwis', 'barwis'],
    ['acoustic', 'acoustic'],
    ['setf', 'setf'],
    ['syria', 'setf'],
    ['tnaa', 'tnaa'],
    ['travelnurse', 'tnaa'],
    ['fleetpulse', 'fleetpulse'],
    ['medisync', 'medisync'],
    ['verdant', 'verdant'],
  ];
  for (const [needle, slug] of map) if (lower.includes(needle)) return slug;
  return null;
}

async function downloadImage(url, idx) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    if (!res.ok) return { url, status: 'error', code: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) return { url, status: 'skipped-tiny', bytes: buf.length };
    let ext = extname(new URL(url).pathname).toLowerCase() || '.jpg';
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext)) ext = '.jpg';
    if (ext === '.svg') return { url, status: 'skipped-svg' };
    const guessed = inferCaseStudySlug(url);
    const baseName = guessed ? `${guessed}-${idx}` : `metova-${String(idx).padStart(3, '0')}`;
    const filename = `${baseName}${ext}`;
    const outPath = join(OUT_DIR, filename);
    writeFileSync(outPath, buf);
    return { url, status: 'ok', file: filename, bytes: buf.length, slugGuess: guessed };
  } catch (e) {
    return { url, status: 'error', err: e.message };
  }
}

async function main() {
  console.log(`Fetching ${PAGE}`);
  const html = await fetchHtml(PAGE);
  writeFileSync(join(OUT_DIR, '_page.html'), html);
  const imgUrls = extractImageUrls(html, PAGE);
  console.log(`Found ${imgUrls.length} candidate image URLs`);

  // Filter out tiny icons / sprites by URL hint (no perfect signal yet — will filter on size after fetch)
  const candidates = imgUrls.filter(u => !/\.(svg)(?:\?|$)/i.test(u))
                            .filter(u => !/(logo|icon|sprite|favicon|emoji)/i.test(u));
  console.log(`After URL-level filter: ${candidates.length}`);

  const results = [];
  for (let i = 0; i < candidates.length; i++) {
    const url = candidates[i];
    const r = await downloadImage(url, i + 1);
    results.push(r);
    const tag = r.status === 'ok' ? `${(r.bytes / 1024).toFixed(0)}KB ${r.file}` : r.status;
    console.log(`  [${i + 1}/${candidates.length}] ${tag} ${r.slugGuess ? `(slug guess: ${r.slugGuess})` : ''}`);
    if (i < candidates.length - 1) await sleep(200);
  }

  writeFileSync(join(OUT_DIR, '_manifest.json'), JSON.stringify(results, null, 2));
  const ok = results.filter(r => r.status === 'ok');
  console.log(`\nDone. ${ok.length} images saved to ${OUT_DIR}`);
  console.log(`Manifest: ${OUT_DIR}/_manifest.json`);
}

main().catch(e => { console.error(e); process.exit(1); });
