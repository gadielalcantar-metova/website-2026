#!/usr/bin/env node
// Fetches each individual case-study sub-page on metova.com and pulls every
// content image (filtering out icons/badges/sprites by URL hint and size).
// Walks listing pagination too. Saves images to assets/photos/metova-source/<slug>/<filename>.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE_OUT = join(ROOT, 'assets/photos/metova-source');
mkdirSync(BASE_OUT, { recursive: true });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractImageUrls(html, baseUrl) {
  const urls = new Set();
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)) urls.add(m[1]);
  for (const m of html.matchAll(/<img[^>]+srcset=["']([^"']+)["']/g)) {
    // Take the largest candidate (last one in srcset, sorted by descriptor desc)
    const candidates = m[1].split(',')
      .map(s => s.trim())
      .map(s => {
        const [u, d] = s.split(/\s+/);
        const w = d ? parseInt(d) : 0;
        return { u, w };
      });
    candidates.sort((a, b) => b.w - a.w);
    if (candidates[0]) urls.add(candidates[0].u);
  }
  for (const m of html.matchAll(/background-image\s*:\s*url\(['"]?([^'")]+)['"]?\)/g)) urls.add(m[1]);
  for (const m of html.matchAll(/data-(?:src|lazy|background|bg)=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi)) urls.add(m[1]);
  return [...urls].map(u => {
    try { return new URL(u, baseUrl).href; } catch { return null; }
  }).filter(Boolean);
}

function extractCaseStudyLinks(html) {
  const out = new Set();
  for (const m of html.matchAll(/href=["']https:\/\/metova\.com\/case-studies\/([a-z0-9-]+)\/?["']/g)) {
    if (m[1] === 'page' || m[1] === 'feed') continue;
    out.add(`https://metova.com/case-studies/${m[1]}/`);
  }
  return [...out];
}

function looksLikeContent(url) {
  const lower = url.toLowerCase();
  if (/\.(svg)(?:\?|$)/.test(lower)) return false;
  if (/(logo|icon|sprite|favicon|emoji|badge|seal|cert|vosb|ribbon|gravatar)/i.test(lower)) return false;
  return true;
}

async function downloadImage(url, slug, idx) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return { url, slug, status: 'error', code: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 8000) return { url, slug, status: 'skipped-tiny', bytes: buf.length };
    let ext = extname(new URL(url).pathname).toLowerCase() || '.jpg';
    if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) ext = '.jpg';
    const dir = join(BASE_OUT, slug);
    mkdirSync(dir, { recursive: true });
    const filename = `${slug}-${String(idx).padStart(2, '0')}${ext}`;
    writeFileSync(join(dir, filename), buf);
    return { url, slug, status: 'ok', file: `${slug}/${filename}`, bytes: buf.length };
  } catch (e) {
    return { url, slug, status: 'error', err: e.message };
  }
}

async function main() {
  // Discover all case-study URLs (page 1 + page 2)
  const allLinks = new Set();
  for (const listing of ['https://metova.com/case-studies/', 'https://metova.com/case-studies/page/2/']) {
    try {
      const html = await fetchHtml(listing);
      extractCaseStudyLinks(html).forEach(u => allLinks.add(u));
      console.log(`Listing ${listing}: discovered ${allLinks.size} total so far`);
    } catch (e) { console.warn(`Listing ${listing} failed: ${e.message}`); }
    await sleep(400);
  }
  console.log(`\nCase-study sub-pages to scrape (${allLinks.size}):`);
  for (const u of allLinks) console.log(`  - ${u}`);
  console.log();

  const allResults = [];
  for (const subUrl of allLinks) {
    const slug = subUrl.replace(/\/$/, '').split('/').pop();
    console.log(`\n→ ${slug} (${subUrl})`);
    let html;
    try { html = await fetchHtml(subUrl); }
    catch (e) { console.warn(`  fetch failed: ${e.message}`); continue; }

    const imgUrls = extractImageUrls(html, subUrl).filter(looksLikeContent);
    console.log(`  ${imgUrls.length} candidate images after filter`);
    for (let i = 0; i < imgUrls.length; i++) {
      const r = await downloadImage(imgUrls[i], slug, i + 1);
      allResults.push(r);
      const tag = r.status === 'ok' ? `${(r.bytes / 1024).toFixed(0)}KB ${r.file}` : r.status;
      console.log(`    [${i + 1}/${imgUrls.length}] ${tag}`);
      await sleep(150);
    }
  }

  writeFileSync(join(BASE_OUT, '_subpages_manifest.json'), JSON.stringify(allResults, null, 2));
  const ok = allResults.filter(r => r.status === 'ok');
  console.log(`\nDone. ${ok.length} content images saved.`);
}

main().catch(e => { console.error(e); process.exit(1); });
