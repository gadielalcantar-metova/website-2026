#!/usr/bin/env node
// Rewrites every <img src="https://images.unsplash.com/photo-XXX...?params"> across
// all HTML files to point at the locally-generated asset: assets/generated/<slug>.png.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const catalog = JSON.parse(readFileSync(join(ROOT, 'scripts/prompt_catalog.json'), 'utf8'));

const photoIdToSlug = new Map();
for (const img of catalog.images) {
  if (img.caseStudy) continue;
  photoIdToSlug.set(img.photoId, img.slug);
}

// Real metova.com case-study photography. Each Unsplash photoId maps to a
// SPECIFIC variant per brand so we don't reuse the same image in 4 slots of
// the same case-study page. Cross-brand reuse cases (same photoId used as
// brand A on one page and brand B on another) are resolved via overrides
// below.
const caseStudyByPhotoId = {
  // Barwis (work/barwis.html has 4 internal slots + index.html card)
  'photo-1571019614242-c5c5dee9f50b': 'barwis-hero.png',     // line 185 hero on work/barwis
  'photo-1517836357463-d25dfeac3438': 'barwis-challenge.png',
  'photo-1549060279-7e168fcee0c2': 'barwis-solution.png',
  'photo-1534438327276-14e5300c3a48': 'barwis-results.png',  // line 320 on work/barwis (also FitOn card on index — see overrides)
  'photo-1517963879433-6ad2b056d712': 'barwis-hero.png',     // unified cover — homepage scrolling, work.html grid

  // Acoustic
  'photo-1460925895917-afdab827c52f': 'acoustic-hero.png',
  'photo-1553877522-43269d4ea984': 'acoustic-challenge.png',

  // FitOn
  'photo-1571019613454-1cb2f99b2d8b': 'fiton-hero.png',
  'photo-1540497077202-7c8a3999166f': 'fiton-challenge.png',
  'photo-1476480862126-209bfaa8edc8': 'fiton-solution.png',
  'photo-1512941937669-90a1b58e7e9c': 'mybambu-results.png', // shared with mybambu — overridden in fiton context

  // MyBambu
  'photo-1563986768609-322da13575f3': 'mybambu-hero.png',
  'photo-1563013544-824ae1b704d3': 'mybambu-hero.png',     // unified cover
  'photo-1556742049-0cfed4f6a45d': 'mybambu-challenge.jpg',
  'photo-1434626881859-194d67b2b86f': 'mybambu-solution.jpg',

  // SETF
  'photo-1488521787991-ed7bbaae773c': 'setf-hero.jpg',
  'photo-1593113630400-ea4288922497': 'setf-challenge.png',
  'photo-1609921212029-bb5a28e60960': 'setf-solution.png',
  'photo-1532629345422-7515f3d16bb6': 'setf-results.jpg',

  // TNAA
  'photo-1551836022-deb4988cc6c0': 'tnaa-hero.jpg',
  'photo-1579154204601-01588f351e67': 'tnaa-challenge.jpg',
  'photo-1526628953301-3e589a6a8b74': 'tnaa-results.png',
};

// File-path overrides for cross-brand reuse and related-work cards.
// Format: { photoId, fileMatch (regex or string), target }
const caseStudyOverrides = [
  // photo-1534438327276 default = barwis-results. But on index.html and second-hero.html
  // it's the FitOn square card (alt="FitOn") — use unified FitOn cover.
  { photoId: 'photo-1534438327276-14e5300c3a48', fileMatch: /^(index|second-hero)\.html$/, target: 'fiton-hero.png' },
  // photo-1512941937669 default = mybambu-results. But on work/fiton.html it's a generic
  // "mobile app development" shot meant to represent the FitOn case — use the animated GIF here for variety.
  { photoId: 'photo-1512941937669-90a1b58e7e9c', fileMatch: /^work\/fiton\.html$/, target: 'fiton-results.gif' },
];

// Brand-card mapping for related-work cards across work/*.html (line ~361).
// Each work/<X>.html points to a DIFFERENT brand at that slot.
const relatedCardByAlt = [
  [/fiton/i, 'fiton-card.png'],
  [/mybambu|bambu/i, 'mybambu-card.png'],
  [/barwis/i, 'barwis-card.png'],
  [/acoustic/i, 'acoustic-card.png'],
  [/setf|syrian|syria/i, 'setf-card.png'],
  [/tnaa|travel nurse/i, 'tnaa-card.png'],
];

function caseStudyTargetForImgTag(tag, photoId, fileRel) {
  // 1. file-path override (highest priority — handles cross-brand reuse)
  for (const ov of caseStudyOverrides) {
    if (ov.photoId === photoId && ov.fileMatch.test(fileRel)) return ov.target;
  }
  // 2. default per-photoId map
  return caseStudyByPhotoId[photoId] || null;
}

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

function prefixFor(file) {
  const rel = relative(ROOT, file);
  const depth = rel.split('/').length - 1;
  return depth === 0 ? 'assets/photos' : '../'.repeat(depth) + 'assets/photos';
}

const files = walk(ROOT);
let totalReplaced = 0;
const unmapped = new Set();

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const prefix = prefixFor(file);
  const before = html;

  const fileRel = relative(ROOT, file);

  // 1. Whole <img ...> tags — case-study targets win when alt matches a brand.
  html = html.replace(
    /<img\b[^>]*\bsrc="https:\/\/images\.unsplash\.com\/(photo-[a-z0-9-]+)(\?[^"]*)?"[^>]*>/g,
    (tag, photoId) => {
      const csFile = caseStudyTargetForImgTag(tag, photoId, fileRel);
      if (csFile) {
        return tag.replace(
          /src="https:\/\/images\.unsplash\.com\/photo-[a-z0-9-]+(\?[^"]*)?"/,
          `src="${prefix}/${csFile}"`
        );
      }
      const slug = photoIdToSlug.get(photoId);
      if (!slug) { unmapped.add(photoId); return tag; }
      return tag.replace(
        /src="https:\/\/images\.unsplash\.com\/photo-[a-z0-9-]+(\?[^"]*)?"/,
        `src="${prefix}/${slug}.png"`
      );
    }
  );

  // 2. CSS background: url('https://images.unsplash...') — no alt, photoId only.
  html = html.replace(
    /url\((['"]?)https:\/\/images\.unsplash\.com\/(photo-[a-z0-9-]+)(\?[^'")]*)?\1\)/g,
    (match, quote, photoId) => {
      const csFile = caseStudyByPhotoId[photoId];
      if (csFile) return `url(${quote}${prefix}/${csFile}${quote})`;
      const slug = photoIdToSlug.get(photoId);
      if (!slug) { unmapped.add(photoId); return match; }
      return `url(${quote}${prefix}/${slug}.png${quote})`;
    }
  );

  // 3. data-* custom attribute — no alt, photoId only.
  html = html.replace(
    /(data-[a-z-]+)="https:\/\/images\.unsplash\.com\/(photo-[a-z0-9-]+)(\?[^"]*)?"/g,
    (match, attr, photoId) => {
      const csFile = caseStudyByPhotoId[photoId];
      if (csFile) return `${attr}="${prefix}/${csFile}"`;
      const slug = photoIdToSlug.get(photoId);
      if (!slug) { unmapped.add(photoId); return match; }
      return `${attr}="${prefix}/${slug}.png"`;
    }
  );

  // 4. Post-pass: wrap product-mockup variants with .product-mockup-frame.
  //    Mockups need an editorial dark-gradient backdrop so their transparent
  //    or thin backgrounds don't look cropped on the dark canvas. The frame
  //    also flips the inner img's object-fit:cover → object-fit:contain so
  //    the product stays whole.
  //    NOTE: the brand HEROES (e.g. barwis-hero) are now real product
  //    screenshots (phones with dark UI). We frame them too — they read as
  //    mockups, not lifestyle photography.
  const needsFrame = new Set([
    // barwis-hero & mybambu-hero intentionally NOT framed — they cover-crop their rectangle
    'fiton-hero.png', 'acoustic-hero.png',
    'barwis-card.png', 'barwis-solution.png', 'barwis-results.png',
    'acoustic-card.png', 'acoustic-challenge.png',
    'fiton-card.png', 'fiton-challenge.png', 'fiton-solution.png', 'fiton-results.gif',
    'mybambu-card.png', 'mybambu-challenge.jpg', 'mybambu-results.png',
    'setf-card.png', 'setf-solution.png',
    'tnaa-card.png', 'tnaa-results.png',
  ]);
  const needsGradientBg = new Set();

  // Pattern A: <div ...style="...aspect-ratio:..."> <img src="<file>"...> </div>
  //            (work/*.html secondary slots — inline style)
  html = html.replace(
    /(<div\b)([^>]*?\bstyle="[^"]*\baspect-ratio[^"]*"[^>]*?)(>)(\s*)(<img\b[^>]*\bsrc="[^"]*\/([a-z0-9-]+\.(?:png|jpg|jpeg|gif|webp))"[^>]*>)(\s*<\/div>)/g,
    (full, divOpen, attrs, gt, ws1, imgTag, fileName, divClose) => {
      if (!needsFrame.has(fileName)) return full;
      const classMatch = attrs.match(/\bclass="([^"]*)"/);
      let newAttrs;
      if (classMatch) {
        if (classMatch[1].includes('product-mockup-frame')) return full;
        newAttrs = attrs.replace(/\bclass="([^"]*)"/, `class="$1 product-mockup-frame"`);
      } else {
        newAttrs = ` class="product-mockup-frame"${attrs}`;
      }
      const newImg = imgTag.replace(/object-fit\s*:\s*cover/g, 'object-fit:contain');
      return `${divOpen}${newAttrs}${gt}${ws1}${newImg}${divClose}`;
    }
  );

  // Helper: pick which class to apply based on file membership.
  function classForFile(fileName) {
    if (needsFrame.has(fileName)) return 'product-mockup-frame';
    if (needsGradientBg.has(fileName)) return 'case-card-gradient-bg';
    return null;
  }

  // Pattern B: <div class="...aspect-square..."> <img src="<file>"...> </div>
  //            (homepage scrolling mobile cards — Tailwind class)
  html = html.replace(
    /(<div\b)([^>]*?\bclass="[^"]*\baspect-(?:square|video|\[[^\]]*\])[^"]*"[^>]*?)(>)(\s*)(<img\b[^>]*\bsrc="[^"]*\/([a-z0-9-]+\.(?:png|jpg|jpeg|gif|webp))"[^>]*>)(\s*<\/div>)/g,
    (full, divOpen, attrs, gt, ws1, imgTag, fileName, divClose) => {
      const cls = classForFile(fileName);
      if (!cls) return full;
      if (new RegExp(`\\bclass="[^"]*\\b${cls}\\b`).test(attrs)) return full;
      const newAttrs = attrs.replace(/\bclass="([^"]*)"/, `class="$1 ${cls}"`);
      // Only flip object-fit when applying the full frame (image gets contain'd).
      const newImg = cls === 'product-mockup-frame'
        ? imgTag.replace(/\bobject-cover\b/g, 'object-contain')
        : imgTag;
      return `${divOpen}${newAttrs}${gt}${ws1}${newImg}${divClose}`;
    }
  );

  // Pattern C: <a class="cs-img aspect-square..."> <img src="<file>"...> </a>
  //            (homepage desktop scrolling cards — anchor wrapper)
  html = html.replace(
    /(<a\b)([^>]*?\bclass="[^"]*\baspect-(?:square|video|\[[^\]]*\])[^"]*"[^>]*?)(>)(\s*)(<img\b[^>]*\bsrc="[^"]*\/([a-z0-9-]+\.(?:png|jpg|jpeg|gif|webp))"[^>]*>)(\s*<\/a>)/g,
    (full, openTag, attrs, gt, ws1, imgTag, fileName, closeTag) => {
      const cls = classForFile(fileName);
      if (!cls) return full;
      if (new RegExp(`\\bclass="[^"]*\\b${cls}\\b`).test(attrs)) return full;
      const newAttrs = attrs.replace(/\bclass="([^"]*)"/, `class="$1 ${cls}"`);
      const newImg = cls === 'product-mockup-frame'
        ? imgTag.replace(/\bobject-cover\b/g, 'object-contain')
        : imgTag;
      return `${openTag}${newAttrs}${gt}${ws1}${newImg}${closeTag}`;
    }
  );

  if (html !== before) {
    const changes = (before.match(/images\.unsplash\.com/g) || []).length
                  - (html.match(/images\.unsplash\.com/g) || []).length;
    writeFileSync(file, html);
    console.log(`  ${relative(ROOT, file)}: ${changes} replacements`);
    totalReplaced += changes;
  }
}

console.log(`\nTotal replacements: ${totalReplaced}`);
if (unmapped.size) {
  console.log(`\nPhoto IDs without catalog mapping:`);
  for (const id of unmapped) console.log(`  - ${id}`);
}
