#!/usr/bin/env node
// Optional: generate cover art, chapter openers and promo art with the Higgsfield CLI (`higgsfield`, logged in).
// Prompts come from projects/<slug>/book.json -> art.{cover, chapters[], promo[]}; palette from art.style or brand defaults.
// usage: node scripts/extras/hf-art.mjs projects/<slug> [--model nano_banana_flash]
// Writes assets/higgsfield/<name>.png + <name>.url and chNN.jpg (1500 px print copies). Skips images that already exist.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadBook } from '../lib/book.mjs';

const proj = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(proj, 'manuscript'))) { console.error('usage: hf-art.mjs projects/<slug>'); process.exit(2); }
const mi = process.argv.indexOf('--model');
const MODEL = mi > 0 ? process.argv[mi + 1] : 'nano_banana_flash';
const book = loadBook(proj);
const out = path.join(proj, 'assets', 'higgsfield');
fs.mkdirSync(out, { recursive: true });
const STYLE = book.art.style || 'Flat vector editorial illustration, warm and hopeful, clean shapes, one consistent thin dark outline weight, limited brand palette, soft paper texture, no text, no letters, no numbers, no logos, no watermark.';

const jobs = [];
if (book.art.cover) jobs.push(['cover', '2:3', 'Book cover artwork, top third left as calm empty space for a title: ' + book.art.cover]);
(book.art.chapters || []).forEach((p, i) => jobs.push([`ch${String(i + 1).padStart(2, '0')}`, '3:2', p]));
(book.art.promo || []).forEach((p, i) => jobs.push([`promo-${i + 1}`, '2:3', p]));

const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
for (const [name, ar, prompt] of jobs) {
  const png = path.join(out, name + '.png');
  if (fs.existsSync(png)) { console.log('skip', name); continue; }
  let url = '';
  for (let t = 0; t < 2 && !url; t++) {
    try {
      const res = sh('higgsfield', ['generate', 'create', MODEL, '--prompt', JSON.stringify(`${prompt} ${STYLE}`), '--aspect_ratio', ar, '--resolution', '2k', '--wait']);
      url = (res.match(/https:\/\/\S+\.(png|jpe?g|webp)/) || [''])[0];
    } catch (e) { console.error(name, 'failed:', String(e.stderr || e.message).split('\n')[0]); }
  }
  if (!url) { console.error('no image for', name); continue; }
  fs.writeFileSync(path.join(out, name + '.url'), url + '\n');
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  fs.writeFileSync(png, buf);
  console.log(name, url);
}
// Print copies for chapter openers (keeps PDFs small).
try {
  const { default: sharp } = await import('sharp');
  for (const f of fs.readdirSync(out).filter((f) => /^ch\d+\.png$/.test(f))) {
    const jpg = path.join(out, f.replace('.png', '.jpg'));
    if (!fs.existsSync(jpg)) await sharp(path.join(out, f)).resize(1500).jpeg({ quality: 86 }).toFile(jpg);
  }
} catch {
  console.log('note: install `sharp` (npm i -D sharp) or run scripts/extras/hf-print-copies.py to make 1500 px chNN.jpg print copies');
}
console.log('done; log these images in assets/credits.md');
