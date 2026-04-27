#!/usr/bin/env node
// OpenAI image generation pipeline. Reads scripts/prompt_catalog.json and
// generates each image via the /v1/images/generations endpoint using the
// gpt-image-2 model. Writes PNGs to assets/generated/<slug>.png.
// Pass --only=<slug> to generate a single image, --force to overwrite.
// Requires OPENAI_API_KEY in .env at repo root.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

// Lightweight .env reader (avoids adding a dependency).
function loadEnv() {
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('Missing OPENAI_API_KEY in .env');
  process.exit(1);
}

const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const OUT_DIR = join(ROOT, 'assets/photos');
mkdirSync(OUT_DIR, { recursive: true });

const force = process.argv.includes('--force');
const only = process.argv.find(a => a.startsWith('--only='))?.split('=')[1];
const quality = process.argv.find(a => a.startsWith('--quality='))?.split('=')[1] || 'high';

const catalog = JSON.parse(readFileSync(join(ROOT, 'scripts/prompt_catalog.json'), 'utf8'));
const { styleSuffix, humansStyleSuffix, images } = catalog;

// gpt-image-2 / gpt-image-1 supported sizes: 1024x1024, 1024x1536, 1536x1024
function mapSize(w, h) {
  const ratio = w / h;
  if (ratio > 1.2) return '1536x1024';
  if (ratio < 0.85) return '1024x1536';
  return '1024x1024';
}

function buildPrompt(img) {
  const suffix = img.style === 'humans' ? humansStyleSuffix : styleSuffix;
  return `${img.prompt}. ${suffix}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function generateOne(img, idx, total) {
  const outPath = join(OUT_DIR, `${img.slug}.png`);
  if (!force && existsSync(outPath)) {
    console.log(`[${idx + 1}/${total}] skip (exists) ${img.slug}`);
    return { slug: img.slug, status: 'skipped' };
  }

  const size = mapSize(img.w, img.h);
  const prompt = buildPrompt(img);
  const started = Date.now();

  const body = {
    model: MODEL,
    prompt,
    size,
    n: 1,
    quality,
  };

  let attempt = 0;
  while (attempt < 3) {
    attempt++;
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        // Retry transient errors; fail fast on auth/model errors.
        if ([429, 500, 502, 503, 504].includes(res.status) && attempt < 3) {
          const backoff = 5000 * attempt;
          console.warn(`[${idx + 1}/${total}] ${res.status} on ${img.slug} (attempt ${attempt}), backoff ${backoff / 1000}s`);
          await sleep(backoff);
          continue;
        }
        console.error(`[${idx + 1}/${total}] FAIL ${img.slug} HTTP ${res.status}: ${errText.slice(0, 400)}`);
        return { slug: img.slug, status: 'error', code: res.status, err: errText.slice(0, 400) };
      }

      const json = await res.json();
      const item = json.data?.[0];
      let buf;
      if (item?.b64_json) {
        buf = Buffer.from(item.b64_json, 'base64');
      } else if (item?.url) {
        const dl = await fetch(item.url);
        if (!dl.ok) throw new Error(`download failed HTTP ${dl.status}`);
        buf = Buffer.from(await dl.arrayBuffer());
      } else {
        throw new Error('no image data in response');
      }

      writeFileSync(outPath, buf);
      const kb = (buf.length / 1024).toFixed(1);
      const s = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`[${idx + 1}/${total}] ok   ${img.slug} (${kb} KB, ${s}s, ${size}, q=${quality})`);
      return { slug: img.slug, status: 'ok', bytes: buf.length };
    } catch (e) {
      console.error(`[${idx + 1}/${total}] ERR  ${img.slug} (attempt ${attempt}): ${e.message}`);
      if (attempt < 3) await sleep(3000 * attempt);
    }
  }
  return { slug: img.slug, status: 'error', err: 'exhausted retries' };
}

async function main() {
  let queue = only ? images.filter(i => i.slug === only) : images.filter(i => !i.caseStudy);
  if (only && queue.length === 0) {
    console.error(`No image with slug "${only}" found in catalog.`);
    process.exit(1);
  }
  console.log(`Model: ${MODEL} | quality: ${quality} | images: ${queue.length}`);
  const results = [];
  for (let i = 0; i < queue.length; i++) {
    const res = await generateOne(queue[i], i, queue.length);
    results.push(res);
    if (res.status === 'ok' && i < queue.length - 1) await sleep(1500);
  }
  const ok = results.filter(r => r.status === 'ok').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'error');
  console.log(`\nDone: ${ok} generated, ${skipped} skipped, ${failed.length} failed`);
  if (failed.length) {
    console.log('Failed:', failed.map(f => `${f.slug} (${f.code || f.err})`).join('\n  '));
  }
  writeFileSync(join(ROOT, 'scripts/generation_results_openai.json'), JSON.stringify(results, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
