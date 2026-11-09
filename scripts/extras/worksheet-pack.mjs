#!/usr/bin/env node
// Build a printable worksheet pack (US Letter) from the assembled book HTML.
// usage: node scripts/extras/worksheet-pack.mjs projects/<slug>
// Reads output/book.html, keeps the title and every .worksheet section, one per page.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadBook } from '../lib/book.mjs';

const proj = path.resolve(process.argv[2] || '');
const bookHtml = path.join(proj, 'output', 'book.html');
if (!fs.existsSync(bookHtml)) { console.error('usage: worksheet-pack.mjs projects/<slug> (needs output/book.html)'); process.exit(2); }
const out = path.join(proj, 'output', 'worksheet-pack.pdf');
const book = loadBook(proj);

const b = await chromium.launch({ channel: 'chrome' });
const page = await b.newPage();
await page.goto('file:///' + bookHtml.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const count = await page.evaluate((author) => {
  const sheets = [...document.querySelectorAll('section.worksheet')];
  // Chapter label for each worksheet: nearest preceding chapter heading.
  const chapters = [...document.querySelectorAll('.chapter')];
  const items = sheets.map((ws) => {
    const ch = chapters.filter((c) => c.compareDocumentPosition(ws) & Node.DOCUMENT_POSITION_FOLLOWING || c.contains(ws)).pop();
    const kicker = ch ? (ch.querySelector('.kicker, .ch-kicker')?.textContent || '') : '';
    const title = ch ? (ch.querySelector('h1, h2')?.textContent || '') : '';
    const clone = ws.cloneNode(true);
    // Drop the EPUB/print cross-reference line if any, keep everything else.
    return { kicker: kicker.trim(), title: title.trim(), html: clone.outerHTML };
  });
  const bookTitle = document.querySelector('title')?.textContent || '';
  const style = [...document.querySelectorAll('style, link[rel=stylesheet]')].map((s) => s.outerHTML).join('\n');
  document.open();
  document.write(`<!doctype html><html><head><meta charset="utf-8">${style}
<style>
@page { size: 8.5in 11in; margin: 0.6in; }
@page :first { margin: 0.6in; }
body { font-size: 12pt; }
.pack-title { text-align: center; padding-top: 2.4in; break-after: page; }
.pack-title h1 { font-size: 30pt; margin-bottom: 10pt; }
.pack-title p { font-size: 13pt; }
.ws-page { break-after: page; break-inside: avoid; }
.ws-page:last-child { break-after: auto; }
.ws-page .from { font-size: 10pt; color: #2F7F79; margin-bottom: 8pt; letter-spacing: .04em; text-transform: uppercase; }
.worksheet { break-before: auto !important; break-after: auto !important; font-size: 12pt; }
.worksheet td { height: 20pt !important; }
</style></head><body>
<section class="pack-title"><h1>Printable Worksheets</h1><p>${bookTitle}</p><p>By ${author}</p><p style="margin-top:24pt">Nine one-page worksheets, one per chapter. Print as many copies as you need for your own household.</p></section>
${items.map((it) => `<section class="ws-page"><div class="from">${it.kicker} ${it.title}</div>${it.html}</section>`).join('\n')}
</body></html>`);
  document.close();
  return items.length;
}, book.author);
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
await b.close();
console.log(`worksheet pack ${out} | worksheets ${count}`);
