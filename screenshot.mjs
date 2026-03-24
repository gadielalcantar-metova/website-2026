import puppeteer from '/usr/local/lib/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = decodeURIComponent(new URL('.', import.meta.url).pathname);
const DIR = join(ROOT, 'temporary screenshots');
mkdirSync(DIR, { recursive: true });

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';

// Auto-increment filename
const existing = readdirSync(DIR).filter(f => f.startsWith('screenshot-')).map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0', 10));
const next = existing.length ? Math.max(...existing) + 1 : 1;
const filename = `screenshot-${next}${label}.png`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Scroll through the page to trigger IntersectionObserver animations
await page.evaluate(async () => {
  const distance = 400;
  const delay = 100;
  const scrollHeight = document.body.scrollHeight;
  let currentPosition = 0;
  while (currentPosition < scrollHeight) {
    window.scrollBy(0, distance);
    currentPosition += distance;
    await new Promise(r => setTimeout(r, delay));
  }
  // Scroll back to top for the final screenshot
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
});

await page.screenshot({ path: join(DIR, filename), fullPage: true });
await browser.close();
console.log(`Saved: temporary screenshots/${filename}`);
