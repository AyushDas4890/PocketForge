#!/usr/bin/env node
// Build a KDP paperback wrap cover (back + spine + front, with 0.125in bleed) as PDF + PNG preview.
// usage: node scripts/layout/paperback-cover.mjs projects/<slug> <pageCount> [paper]
//   paper: "color" (default, 0.002347 in/page) or "white" (0.002252 in/page). Check KDP's cover calculator before upload.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadBook } from '../lib/book.mjs';

const [projArg, pagesArg, paper = 'color'] = process.argv.slice(2);
const proj = path.resolve(projArg || '');
const pages = Number(pagesArg);
if (!fs.existsSync(proj) || !pages) { console.error('usage: paperback-cover.mjs projects/<slug> <pageCount> [color|white]'); process.exit(2); }

const TRIM_W = 6, TRIM_H = 9, BLEED = 0.125;
const spine = +(pages * (paper === 'white' ? 0.002252 : 0.002347)).toFixed(4);
const W = +(BLEED + TRIM_W + spine + TRIM_W + BLEED).toFixed(4), H = TRIM_H + 2 * BLEED;
const NAVY = '#152740', INK = '#233046', TEAL = '#2F7F79', SAND = '#F2C57C', CREAM = '#FFF8EC';
const out = path.join(proj, 'output');
// Inline images: a page built with setContent cannot load file:// images.
const url = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const cover = path.join(out, 'cover.png');
const pose = path.join(proj, 'assets', 'character', 'poses', 'holding-checklist.png');

const book = loadBook(proj);
const blurb = book.blurb; // back-cover copy from book.json
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@700;800&family=Source+Sans+3:wght@400;600&display=block">
<style>
@page { size: ${W}in ${H}in; margin: 0; }
html, body { margin: 0; width: ${W}in; height: ${H}in; background: ${NAVY}; }
.wrap { position: relative; width: ${W}in; height: ${H}in; overflow: hidden; background: ${NAVY}; }
.front { position: absolute; top: 0; right: 0; height: ${H}in; }
.spine { position: absolute; top: 0; left: ${BLEED + TRIM_W}in; width: ${spine}in; height: ${H}in; background: ${TEAL}; }
.back { position: absolute; top: ${BLEED + 0.55}in; left: ${BLEED + 0.55}in; width: ${TRIM_W - 1.1}in; color: ${CREAM}; font-family: 'Source Sans 3', sans-serif; }
.back h2 { font-family: 'Merriweather Sans', sans-serif; font-weight: 800; font-size: 22pt; line-height: 1.15; margin: 0 0 6pt; color: ${CREAM}; }
.back h2 span { color: ${SAND}; }
.back .sub { font-size: 11pt; color: ${SAND}; margin: 0 0 16pt; }
.back p { font-size: 12pt; line-height: 1.45; margin: 0 0 10pt; }
.back .author { margin-top: 16pt; font-family: 'Merriweather Sans', sans-serif; font-weight: 700; letter-spacing: .12em; font-size: 10pt; }
.back .disc { margin-top: 10pt; font-size: 8.5pt; opacity: .8; }
.tally { position: absolute; left: ${BLEED + 0.55}in; bottom: ${BLEED + 0.5}in; height: 2.1in; background: ${CREAM}; border-radius: 10pt; padding: 6pt 10pt; }
/* KDP prints the barcode bottom-right of the back cover: keep 2in x 1.2in clear */
.barcode { position: absolute; left: ${BLEED + TRIM_W - 0.25 - 2}in; bottom: ${BLEED + 0.25}in; width: 2in; height: 1.2in; background: #fff; }
</style></head><body><div class="wrap">
<img class="front" src="${url(cover)}" alt="">
<div class="spine"></div>
<div class="back">
  <h2>${esc(book.coverTitle || book.title)}${book.coverTitleAccent ? ` <span>${esc(book.coverTitleAccent)}</span>` : ''}</h2>
  <div class="sub">${esc(book.shortSubtitle)}</div>
  ${blurb.map((b) => `<p>${esc(b)}</p>`).join('')}
  <div class="author">${esc(book.author.toUpperCase())}</div>
  <div class="disc">${esc([book.disclaimer, book.asOf].filter(Boolean).join(' '))}</div>
</div>
${fs.existsSync(pose) ? `<img class="tally" src="${url(pose)}" alt="">` : ''}
<div class="barcode"></div>
</div></body></html>`;

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage({ viewport: { width: Math.round(W * 96), height: Math.round(H * 96) }, deviceScaleFactor: 300 / 96 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(out, 'paperback-cover.pdf'), width: `${W}in`, height: `${H}in`, printBackground: true, pageRanges: '1' });
await page.screenshot({ path: path.join(out, 'paperback-cover-preview.png'), fullPage: false });
await b.close();
console.log(`paperback cover ${W}in x ${H}in | spine ${spine}in (${pages} pages, ${paper} paper) | no spine text (under 79 pages)`);
