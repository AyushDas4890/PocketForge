#!/usr/bin/env node
// Compose the front cover: Higgsfield art (assets/higgsfield/cover.png) + typeset title/subtitle/author.
// usage: node scripts/layout/compose-cover.mjs projects/<slug>  -> output/cover.png (1600x2400)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { loadBook } from '../lib/book.mjs';

const proj = path.resolve(process.argv[2] || '');
const art = path.join(proj, 'assets', 'higgsfield', 'cover.png');
if (!fs.existsSync(art)) { console.error('missing ' + art); process.exit(2); }
const out = path.join(proj, 'output', 'cover.png');
const keep = path.join(proj, 'output', 'cover-options', 'cover-canva.png');
if (fs.existsSync(out) && !fs.existsSync(keep)) fs.copyFileSync(out, keep); // keep the old Canva cover

const book = loadBook(proj);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const img = 'data:image/png;base64,' + fs.readFileSync(art).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@700;800&family=Source+Sans+3:wght@600&display=block">
<style>
html,body{margin:0;width:1600px;height:2400px;}
.c{position:relative;width:1600px;height:2400px;overflow:hidden;background:#FFF8EC;}
.c img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.top{position:absolute;left:0;right:0;top:0;padding:120px 110px 80px;background:linear-gradient(#FFF8EC 72%,rgba(255,248,236,0));text-align:center;color:#233046;}
h1{font-family:'Merriweather Sans',sans-serif;font-weight:800;font-size:132px;line-height:1.02;margin:0;}
h1 span{display:block;color:#2F7F79;font-size:108px;margin-top:10px;}
.sub{font-family:'Source Sans 3',sans-serif;font-weight:600;font-size:46px;line-height:1.25;margin:36px auto 0;max-width:1250px;}
.bar{position:absolute;left:0;right:0;bottom:0;background:#233046;color:#FFF8EC;text-align:center;padding:42px 0;font-family:'Merriweather Sans',sans-serif;font-weight:700;letter-spacing:.18em;font-size:52px;}
</style></head><body><div class="c"><img src="${img}">
<div class="top"><h1>${esc(book.coverTitle || book.title)}${book.coverTitleAccent ? `<span>${esc(book.coverTitleAccent)}</span>` : ''}</h1>
<div class="sub">${esc(book.shortSubtitle)}</div></div>
<div class="bar">${esc(book.author.toUpperCase())}</div></div></body></html>`;

const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 2400 } });
await p.setContent(html, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: out });
await b.close();
console.log('cover ' + out);
