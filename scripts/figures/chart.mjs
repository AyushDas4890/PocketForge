#!/usr/bin/env node
// Render a chart/diagram PNG (2x) from a JSON spec. Data must come from research files; spec.source records which.
// usage: node scripts/figures/chart.mjs <spec.json> <out.png>
// kinds: bars (default) | panels | steps | bands | flow
// common: { title, source, sourceLabel, palette:[ink,primary,accent,paper], badge }
import fs from 'node:fs';
import { launch } from '../character/common.mjs';

const [specPath, out] = process.argv.slice(2);
if (!specPath || !out) { console.error('usage: chart.mjs <spec.json> <out.png>'); process.exit(2); }
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
if (!spec.source) { console.error('spec.source (research file) is required'); process.exit(1); }
const [ink, pri, acc, paper] = spec.palette || ['#233046', '#2F7F79', '#F2C57C', '#FFF8EC'];
// Quote "Source Sans 3": an unquoted name ending in a digit invalidates the whole font list (falls back to serif).
const FONT = "'Source Sans 3', 'Segoe UI', system-ui, sans-serif";
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const fmt = (v) => `${spec.prefix || ''}${Number(v).toLocaleString('en-US')}${spec.unit || ''}`;
const W = 1200;
let H = 0, body = '';
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size || 22}" font-weight="${o.w || 400}" fill="${o.fill || ink}" text-anchor="${o.anchor || 'start'}">${esc(s)}</text>`;
const R = (x, y, w, h, fill, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 6}" fill="${fill}" stroke="${o.stroke || ink}" stroke-width="${o.sw ?? 3}"/>`;

if (!spec.kind || spec.kind === 'bars') {
  const rowH = 64, top = 100, left = spec.left || 300;
  const max = Math.max(...spec.bars.map((b) => b.value));
  H = top + spec.bars.length * rowH + 70;
  body = spec.bars.map((b, i) => {
    const y = top + i * rowH, w = ((W - left - 170) * b.value) / max;
    return T(left - 16, y + 30, b.label, { anchor: 'end' }) + R(left, y + 8, w, 34, b.accent ? acc : pri) + T(left + w + 12, y + 33, fmt(b.value), { w: 700 });
  }).join('');
} else if (spec.kind === 'panels') {
  const n = spec.panels.length, pw = (W - 80) / n, ch = 360, top = 150;
  H = top + ch + 170;
  body = spec.panels.map((p, i) => {
    const x0 = 40 + i * pw, max = Math.max(...p.bars.map((b) => b.value)) * 1.15, bw = Math.min(150, pw / (p.bars.length * 1.8));
    const gap = (pw - p.bars.length * bw) / (p.bars.length + 1);
    let s = T(x0 + pw / 2, top - 30, p.title, { anchor: 'middle', w: 700, size: 24 });
    s += `<line x1="${x0 + 20}" x2="${x0 + pw - 20}" y1="${top + ch}" y2="${top + ch}" stroke="${ink}" stroke-width="3"/>`;
    p.bars.forEach((b, j) => {
      const h = (ch * b.value) / max, x = x0 + gap + j * (bw + gap);
      s += R(x, top + ch - h, bw, h, b.accent ? acc : pri) + T(x + bw / 2, top + ch - h - 12, (p.prefix ?? spec.prefix ?? '') + Number(b.value).toLocaleString('en-US') + (p.unit ?? spec.unit ?? ''), { anchor: 'middle', w: 700, size: 24 }) + T(x + bw / 2, top + ch + 34, b.label, { anchor: 'middle' });
    });
    return s;
  }).join('');
  if (spec.note) body += R(40, top + ch + 60, W - 80, 56, paper, { stroke: acc }) + T(W / 2, top + ch + 96, spec.note, { anchor: 'middle', size: 21 });
} else if (spec.kind === 'steps') {
  const L = 120, Rr = W - 80, top = 130, ch = 380, pts = [spec.start, ...spec.points];
  const xmax = Math.max(...pts.map((p) => p.x)), vmax = Math.max(...pts.map((p) => p.value)) * 1.15;
  const X = (x) => L + ((Rr - L) * (x - spec.start.x)) / (xmax - spec.start.x), Y = (v) => top + ch - (ch * v) / vmax;
  H = top + ch + 160;
  let d = `M ${X(pts[0].x)} ${Y(pts[0].value)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${X(pts[i].x)} ${Y(pts[i - 1].value)} L ${X(pts[i].x)} ${Y(pts[i].value)}`;
  body = `<line x1="${L}" x2="${Rr}" y1="${Y(0)}" y2="${Y(0)}" stroke="${ink}" stroke-width="3"/>` + T(L - 12, Y(0) + 7, '$0', { anchor: 'end' });
  if (spec.redFrom != null) body += `<rect x="${X(spec.redFrom)}" y="${top}" width="${X(spec.redTo) - X(spec.redFrom)}" height="${ch}" fill="${acc}" opacity="0.35"/>` + T((X(spec.redFrom) + X(spec.redTo)) / 2, top + 24, spec.redLabel || '', { anchor: 'middle', w: 700, size: 20 });
  body += `<path d="${d}" fill="none" stroke="${pri}" stroke-width="6" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    body += `<circle cx="${X(p.x)}" cy="${Y(p.value)}" r="9" fill="${paper}" stroke="${ink}" stroke-width="4"/>` +
      T(X(p.x) + (i === 0 ? 14 : 0), Y(p.value) - 20, `$${p.value.toLocaleString('en-US')}`, { anchor: i === 0 ? 'start' : 'middle', w: 700 });
    if (p.label) body += T(X(p.x), top + ch + 34, p.label, { anchor: 'middle', size: 19 }) + T(X(p.x), top + ch + 58 + (i % 2 ? 26 : 0), p.sub || '', { anchor: 'middle', size: 17, fill: pri, w: 600 });
  });
} else if (spec.kind === 'bands') {
  const L = 100, Rr = W - 80, top = 120, rowH = 90, a = spec.axis;
  const X = (v) => L + ((Rr - L) * (v - a.min)) / (a.max - a.min);
  H = top + spec.bands.length * rowH + 150;
  const axisY = top + spec.bands.length * rowH + 10;
  body = spec.bands.map((b, i) => {
    const y = top + i * rowH;
    return R(X(b.from), y, X(b.to) - X(b.from), 52, i % 2 ? acc : pri, { rx: 10 }) +
      T(X(b.from) + 14, y + 34, b.label, { w: 700, fill: i % 2 ? ink : '#ffffff', size: 21 }) + T(X(b.from) + 4, y + 76, b.note, { size: 18 });
  }).join('') + `<line x1="${L}" x2="${Rr}" y1="${axisY}" y2="${axisY}" stroke="${ink}" stroke-width="3"/>`;
  for (let v = a.min; v <= a.max; v++) body += `<line x1="${X(v)}" x2="${X(v)}" y1="${axisY}" y2="${axisY + 10}" stroke="${ink}" stroke-width="3"/>` + T(X(v), axisY + 36, String(v), { anchor: 'middle', size: 20 });
  body += T((L + Rr) / 2, axisY + 66, spec.axisLabel || 'Child age (years)', { anchor: 'middle', size: 20, w: 600 });
} else if (spec.kind === 'flow') {
  const n = spec.steps.length, bw = 250, bh = 110, top = 120, gap = (W - 80 - n * bw) / (n - 1);
  H = top + bh + 70 + 240;
  body = spec.steps.map((s, i) => {
    const x = 40 + i * (bw + gap), words = s.split(' / ');
    let g = R(x, top, bw, bh, i === n - 1 ? acc : paper, { rx: 16 });
    words.forEach((w2, k) => { g += T(x + bw / 2, top + bh / 2 + (k - (words.length - 1) / 2) * 28 + 8, w2, { anchor: 'middle', w: k === 0 ? 700 : 400, size: 22 }); });
    if (i < n - 1) { const x1 = x + bw + 8, x2 = x + bw + gap - 8, y = top + bh / 2; g += `<line x1="${x1}" x2="${x2 - 10}" y1="${y}" y2="${y}" stroke="${ink}" stroke-width="5"/><path d="M ${x2} ${y} l -16 -11 v 22 z" fill="${ink}"/>`; }
    return g;
  }).join('');
  const lx = 40 + (n - 1) * (bw + gap) + bw / 2, ty = top + bh + 70;
  body += `<line x1="${lx}" x2="${lx}" y1="${top + bh}" y2="${ty - 24}" stroke="${ink}" stroke-width="4"/>`;
  const cols = 3, cw = (W - 80) / cols;
  body += T(W / 2, ty + 4, spec.toolsTitle || 'Enforcement tools the agency can use', { anchor: 'middle', w: 700, size: 23 });
  spec.tools.forEach((t, i) => { const cx = 40 + (i % cols) * cw + 10, cy = ty + 26 + Math.floor(i / cols) * 70; body += R(cx, cy, cw - 20, 54, '#ffffff', { stroke: pri, rx: 27 }) + T(cx + (cw - 20) / 2, cy + 35, t, { anchor: 'middle', size: 21 }); });
}
if (spec.badge) body += R(W - 330, 18, 290, 40, acc, { rx: 20 }) + T(W - 185, 46, spec.badge, { anchor: 'middle', w: 800, size: 21 });
const src = T(40, H - 20, 'Source: ' + (spec.sourceLabel || spec.source), { size: 16 }).replace('<text', '<text opacity="0.7"');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="${FONT}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${T(40, 56, spec.title, { size: 30, w: 700 })}${body}
  ${src}</svg>`;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
// Load the brand fonts so charts don't fall back to a serif.
await page.setContent(`<head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&display=block"></head><body style="margin:0">${svg}</body>`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await (await page.$('svg')).screenshot({ path: out });
await browser.close();
console.log(`chart ${out}`);
