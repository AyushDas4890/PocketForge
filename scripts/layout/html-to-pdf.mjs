#!/usr/bin/env node
// Fallback layout: manuscript/*.md -> output/book.html (print CSS) -> output/ebook.pdf via Playwright.
// Page order: cover, title, copyright, contents, how-to-use, chapters (opener, body, worksheet page), next steps, endnotes, credits, about.
// Handles: headings, paragraphs, lists, blockquotes, tables, images, bold/italic, :::worksheet, :::example,
// [POSE:x] (placed on the side opposite its gaze, so it faces the content), [SCENE:...] (chNN-*.png), [^n] (renumbered book-wide).
// usage: node scripts/layout/html-to-pdf.mjs projects/<slug>   (env: BOOK_FONT_PT, PAGE_W_IN, PDF_OUT, NO_COVER)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { launch } from '../character/common.mjs';
import { loadBook } from '../lib/book.mjs';

const proj = path.resolve(process.argv[2] || '');
const msDir = path.join(proj, 'manuscript');
if (!fs.existsSync(msDir)) { console.error('usage: html-to-pdf.mjs projects/<slug>'); process.exit(2); }
const book = loadBook(proj);
const outDir = path.join(proj, 'output');
fs.mkdirSync(outDir, { recursive: true });
const PW = Number(process.env.PAGE_W_IN || 5.625), PH = 9; // cover is 1600x2560 = 5.625x9 exactly
const FS = Number(process.env.BOOK_FONT_PT || 9.5);

const brand = fs.existsSync(path.join(proj, 'brand.md')) ? fs.readFileSync(path.join(proj, 'brand.md'), 'utf8') : '';
const colour = (name, d) => (brand.match(new RegExp(`\\|\\s*${name}\\s*\\|\\s*(#[0-9a-fA-F]{6})`)) || [, d])[1];
const INK = colour('Ink', '#233046'), TEAL = colour('Teal', '#2F7F79'), SAND = colour('Sand', '#F2C57C'), CREAM = colour('Cream', '#FFF8EC');
const HFONT = (brand.match(/Headings:\s*([A-Za-z0-9 ]+?)\s*\(/) || [, 'Merriweather Sans'])[1];
const BFONT = (brand.match(/Body:\s*([A-Za-z0-9 ]+?)\s*\(/) || [, 'Source Sans 3'])[1];

const charDir = path.join(proj, 'assets', 'character');
const gaze = (n) => { const f = path.join(charDir, 'pose-data', `${n}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).gaze || 'right' : 'right'; };
const url = (p) => pathToFileURL(p).href;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const missing = [];
const resolved = { poses: new Set(), scenes: [], figures: [] };

const poseImg = (n, cls = '') => {
  const f = path.join(charDir, 'poses', `${n}.png`);
  if (!fs.existsSync(f)) { missing.push(`POSE:${n}`); return `<span class="missing">[missing pose ${n}]</span>`; }
  resolved.poses.add(n);
  return `<img class="pose ${cls}" src="${url(f)}" alt="">`;
};
const sideOf = (n) => (gaze(n) === 'right' ? 'left' : 'right'); // pose stands on the side opposite its gaze

let notes = []; // {ch, text}
function makeInline(local) {
  return (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[\^([^\]]+)\]/g, (_, id) => {
      if (!local.map.has(id)) { notes.push({ ch: local.ch, text: local.defs.get(id) || `(missing footnote ${id})` }); local.map.set(id, notes.length); }
      return `<sup class="fn">${local.map.get(id)}</sup>`;
    });
}

function chapterHtml(md, num) {
  const local = { defs: new Map(), map: new Map(), ch: num };
  const lines = md.split(/\r?\n/).map((l) => l.trimEnd());
  for (const l of lines) { const m = l.match(/^\[\^([^\]]+)\]:\s*(.+)$/); if (m) local.defs.set(m[1], m[2]); }
  const inl = makeInline(local);
  const L = lines.filter((l) => !/^\[\^[^\]]+\]:/.test(l) && !/^<!--.*-->$/.test(l.trim()));
  const out = [];
  let list = null, mode = null, i = 0, title = '';
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const mdInlineWithPose = (s) => inl(s.replace(/\[POSE:[^\]]+\]\s*/g, ''));

  // opener: "# Chapter N: Title", [POSE:x], "> goal"
  if (/^#\s+/.test(L[0] || '')) {
    title = L[0].replace(/^#\s+/, '');
    const pm = (L[1] || '').match(/^\[POSE:([^\]]+)\]$/);
    const gm = (L[2] || '').match(/^>\s?(.*)/);
    const t = title.match(/^Chapter\s+(\d+):\s*(.*)$/);
    const pose = pm ? poseImg(pm[1].trim(), 'opener') : '';
    out.push(`<header class="opener ${pm ? sideOf(pm[1].trim()) : 'left'}">${pose}<div><div class="kicker">${t ? `Chapter ${t[1]}` : ''}</div><h1>${esc(t ? t[2] : title)}</h1>${gm ? `<p class="goal">${inl(gm[1])}</p>` : ''}</div></header>`);
    // Chapter art band (Higgsfield illustration), if present.
    const art = path.join(proj, 'assets', 'higgsfield', `ch${String(num).padStart(2, '0')}.jpg`);
    if (fs.existsSync(art)) { resolved.figures.push(path.relative(proj, art)); out.push(`<figure class="ch-art"><img src="${url(art)}" alt=""></figure>`); }
    i = 1 + (pm ? 1 : 0) + (gm ? 1 : 0);
  }
  for (; i < L.length; i++) {
    const l = L[i];
    let m;
    if (/^:::worksheet/.test(l)) {
      closeList(); mode = 'ws';
      out.push(`<section class="worksheet"><div class="ws-label">Worksheet</div><div class="ws-head"><h3>${esc(l.replace(/^:::worksheet\s*/, ''))}</h3>@@POSE@@</div>`);
      continue;
    }
    if (/^:::example/.test(l)) { closeList(); mode = 'ex'; out.push(`<aside class="example"><div class="ex-label">${esc(l.replace(/^:::example\s*/, '') || 'Hypothetical')} example</div>`); continue; }
    if (l.trim() === ':::' && mode) {
      closeList();
      out.push(mode === 'ws' ? '</section>' : '</aside>');
      if (mode === 'ws') out[out.length - 1] = '</section>';
      mode = null; continue;
    }
    if (mode === 'ws' && (m = l.match(/^\[POSE:([^\]]+)\]$/))) {
      const n = m[1].trim();
      const idx = out.findLastIndex((x) => x.includes('@@POSE@@'));
      out[idx] = out[idx].replace('@@POSE@@', poseImg(n, 'ws-pose'));
      continue;
    }
    if ((m = l.match(/^(#{1,4})\s+(.*)/))) { closeList(); out.push(`<h${m[1].length + 0}>${inl(m[2])}</h${m[1].length}>`); continue; }
    if ((m = l.match(/^!\[([^\]]*)\]\(([^)]+)\)/))) {
      closeList();
      const src = path.resolve(msDir, m[2]);
      if (fs.existsSync(src)) { resolved.figures.push(path.relative(proj, src)); let cap = ''; let j = i + 1; while (j < L.length && !L[j].trim()) j++; const cm = (L[j] || '').match(/^[*](.+)[*]$/); if (cm) { cap = `<figcaption>${inl(cm[1])}</figcaption>`; i = j; } out.push(`<figure><img src="${url(src)}" alt="${esc(m[1])}">${cap}</figure>`); }
      else { missing.push(`FIG:${m[2]}`); out.push(`<p class="missing">[missing figure ${esc(m[2])}]</p>`); }
      continue;
    }
    if ((m = l.match(/^\[SCENE:([^\]]+)\]$/))) {
      closeList();
      const dir = path.join(charDir, 'scenes');
      const hit = fs.existsSync(dir) && fs.readdirSync(dir).find((f) => f.endsWith('.png') && f.startsWith(`ch${String(num).padStart(2, '0')}-`));
      if (hit) { resolved.scenes.push(`ch${num}:${hit}`); out.push(`<figure class="scene"><img src="${url(path.join(dir, hit))}" alt="${esc(m[1].trim())}"></figure>`); }
      else { missing.push(`SCENE:ch${num}`); out.push(`<p class="missing">[missing scene ch${num}]</p>`); }
      continue;
    }
    if (/^\|/.test(l)) {
      closeList();
      const rows = [];
      while (i < L.length && /^\|/.test(L[i])) { rows.push(L[i]); i++; }
      i--;
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(`<table><thead><tr>${cells(head).map((c) => `<th>${inl(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if ((m = l.match(/^\s*([-*]|\d+[.)])\s+(.*)/)) && !/^\*\*/.test(l)) {
      const kind = /\d/.test(m[1]) ? 'ol' : 'ul';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      const box = /^\[ \]\s*/.test(m[2]);
      out.push(`<li${box ? ' class="chk"' : ''}>${inl(m[2].replace(/^\[ \]\s*/, ''))}</li>`);
      continue;
    }
    closeList();
    if (/^>\s?/.test(l)) {
      const q = l.replace(/^>\s?/, '');
      const tp = q.match(/^\*\*Tip\*\*\s*\[POSE:([^\]]+)\]\s*(.*)$/);
      if (tp) { const n = tp[1].trim(); out.push(`<div class="tip ${sideOf(n)}">${poseImg(n, 'tip-pose')}<div><span class="tip-label">Tip</span> ${inl(tp[2])}</div></div>`); }
      else out.push(`<blockquote>${mdInlineWithPose(q)}</blockquote>`);
    } else if (l.trim() === '---' || !l.trim()) { /* skip */ }
    else if ((m = l.match(/^\*(.+)\*$/)) && out[out.length - 1] && /^<figure>/.test(out[out.length - 1]) === false && out.findLast((x) => x.startsWith('<figure>')) && out[out.length - 2]?.startsWith('<figure><img')) {
      out.push(`<figcaption>${inl(m[1])}</figcaption></figure>`);
    } else {
      const lone = l.match(/^\[POSE:([^\]]+)\]\s*(.*)$/);
      if (lone) out.push(`<p>${inl(lone[2])}</p>`);
      else out.push(`<p>${inl(l)}</p>`);
    }
  }
  closeList();
  let html = out.join(String.fromCharCode(10)).replace(/@@POSE@@/g, '');
  const wsm = html.match(/<section class="worksheet">[\s\S]*?<\/section>/);
  if (wsm) html = html.replace(wsm[0], '') + String.fromCharCode(10) + wsm[0];
  return { html, title };
}

const files = fs.readdirSync(msDir).filter((f) => /^ch\d+\.md$/.test(f)).sort();
const chapters = files.map((f) => { const n = +f.match(/\d+/)[0]; const r = chapterHtml(fs.readFileSync(path.join(msDir, f), 'utf8'), n); return { n, ...r }; });

// ---- front matter
const front = fs.readFileSync(path.join(msDir, '00-front.md'), 'utf8').split(/\n---\n/).map((s) => s.trim());
const frontLocal = { defs: new Map(), map: new Map(), ch: 0 };
const finl = makeInline(frontLocal);
const paras = (s) => s.split(/\n\n+/).map((p) => p.trim()).filter((p) => p && !/^#/.test(p)).map((p) => `<p>${finl(p)}</p>`).join('');
const titleBlk = front[0].split('\n').filter(Boolean);
const bookTitle = titleBlk[0].replace(/^#\s+/, '');
const subtitle = (titleBlk[1] || '').replace(/^##\s+/, '');
const byline = (titleBlk[2] || '').trim();
const copyright = front[1].replace(/^##.*\n/, '');
const howSection = front.find((s) => /^## How to use this book/.test(s)) || '';
const photoM = howSection.match(/!\[([^\]]*)\]\(([^)]+)\)\s*\n\*(.+)\*/);
let howHtml = '';
{
  const body = howSection.replace(/^##.*\n/, '').replace(/!\[[^\]]*\]\([^)]+\)\s*\n\*.+\*\n?/, '');
  const hl = { defs: new Map(), map: new Map(), ch: 0 };
  const hi = makeInline(hl);
  const blocks = body.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  for (const b of blocks) {
    const pm = b.match(/^\[POSE:([^\]]+)\]\s*(.*)$/s);
    if (pm) howHtml += `<div class="tip ${sideOf(pm[1].trim())}">${poseImg(pm[1].trim(), 'tip-pose')}<div>${hi(pm[2])}</div></div>`;
    else if (/^- /m.test(b)) howHtml += `<ul>${b.split('\n').map((x) => `<li>${hi(x.replace(/^- /, ''))}</li>`).join('')}</ul>`;
    else howHtml += `<p>${hi(b)}</p>`;
  }
}
let photoHtml = '';
if (photoM) {
  const src = path.resolve(msDir, photoM[2]);
  if (fs.existsSync(src)) { resolved.figures.push(path.relative(proj, src)); photoHtml = `<figure class="photo"><img src="${url(src)}" alt="${esc(photoM[1])}"><figcaption>${esc(photoM[3])}</figcaption></figure>`; }
  else missing.push(`FIG:${photoM[2]}`);
}

// ---- notes / endnotes
const chTitle = (c) => c.title.replace(/^Chapter\s+\d+:\s*/, '');
const endnoteHtml = () => {
  let n = 0, html = '';
  for (const c of chapters) {
    const mine = notes.filter((x) => x.ch === c.n);
    if (!mine.length) continue;
    html += `<h4>Chapter ${c.n}: ${esc(chTitle(c))}</h4><ol start="${n + 1}">` + mine.map((x) => { n++; return `<li>${esc(x.text.replace(/\s*\(research\/[^)]*\)\s*$/, ''))}</li>`; }).join('') + '</ol>';
  }
  return html;
};

const creditsMd = fs.existsSync(path.join(proj, 'assets', 'credits.md')) ? fs.readFileSync(path.join(proj, 'assets', 'credits.md'), 'utf8') : '';
const creditsHtml = (() => {
  // Reader-facing credits: image sources and licenses, from assets/credits.md table rows
  const rows = creditsMd.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|[-\s|]+\|?$/.test(l) && !/^\|\s*(file|origin)/i.test(l));
  const items = [];
  for (const r of rows) {
    const c = r.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    if (/mother-baby-borba/.test(c[0])) items.push('Photo on the How to use this book page: "Smiling woman carrying baby" by Jonathan Borba, via Unsplash (https://unsplash.com/photos/smiling-woman-carrying-baby-RWgE9_lKj_Y), used under the Unsplash License (https://unsplash.com/license).');
  }
  return items;
})();

const manuscriptNext = (() => {
  const t = fs.readFileSync(path.join(proj, 'outline.md'), 'utf8');
  return /Next steps \(1 page\)/.test(t);
})();

const cover = path.join(outDir, 'cover.png');
const css = `
@page { size: ${PW}in ${PH}in; margin: 0.55in 0.5in 0.65in; }
@page :first { margin: 0; }
@page chapter { @top-center { content: "${esc(bookTitle)}"; font: 600 7pt "${HFONT}", sans-serif; color: ${TEAL}; letter-spacing: .04em; } @bottom-center { content: counter(page); font: 8pt "${BFONT}", sans-serif; color: ${INK}; } }
@page plain { @bottom-center { content: counter(page); font: 8pt "${BFONT}", sans-serif; color: ${INK}; } }
@page cover { margin: 0; }
@page nofoot { margin: 0.55in 0.5in 0.65in; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "${BFONT}", "Segoe UI", sans-serif; font-size: ${FS}pt; line-height: 1.3; color: ${INK}; margin: 0; }
h1, h2, h3, h4, .kicker, .ws-label, .ex-label, .tip-label { font-family: "${HFONT}", "Segoe UI", sans-serif; }
h1 { font-size: 19pt; line-height: 1.15; margin: 0 0 6pt; color: ${INK}; font-weight: 800; }
h2 { font-size: 12pt; color: ${TEAL}; margin: 11pt 0 3pt; font-weight: 700; break-after: avoid; }
h3 { font-size: 10pt; margin: 8pt 0 2pt; font-weight: 700; break-after: avoid; }
h4 { font-size: 9pt; color: ${TEAL}; margin: 8pt 0 2pt; }
p { margin: 0 0 5pt; orphans: 2; widows: 2; }
ul, ol { margin: 0 0 5pt; padding-left: 15pt; } li { margin-bottom: 2pt; }
.cover { page: cover; break-after: page; width: ${PW}in; height: ${PH}in; overflow: hidden; } .cover img { width: 100%; height: 100%; display: block; }
.front { page: plain; break-before: page; } .front2 { page: plain; margin-top: 18pt; }
.chapter { page: chapter; break-before: page; }
.opener { display: flex; align-items: flex-end; gap: 12pt; margin-bottom: 8pt; border-bottom: 3px solid ${TEAL}; padding-bottom: 8pt; }
.opener.right { flex-direction: row-reverse; } .opener > div { flex: 1; }
.opener .pose { width: 1.0in; flex: none; }
.kicker { text-transform: uppercase; letter-spacing: .1em; font-size: 7.5pt; color: ${TEAL}; font-weight: 700; }
.goal { font-style: italic; margin: 0; font-size: 10pt; }
.pose { display: block; }
.tip { display: flex; gap: 8pt; align-items: center; background: ${CREAM}; border-left: 3px solid ${SAND}; border-radius: 4pt; padding: 5pt 8pt; margin: 6pt 0; break-inside: avoid; }
.tip.right { flex-direction: row-reverse; } .tip-pose { width: 0.5in; flex: none; } .tip-label { font-weight: 800; color: ${TEAL}; text-transform: uppercase; font-size: 7.5pt; letter-spacing: .06em; }
blockquote { border-left: 3px solid ${TEAL}; margin: 6pt 0; padding: 2pt 0 2pt 9pt; background: ${CREAM}; }
.example { break-inside: avoid; border: 1.5px dashed ${TEAL}; background: ${CREAM}; border-radius: 5pt; padding: 6pt 10pt 3pt; margin: 7pt 0; }
.ex-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: ${TEAL}; margin-bottom: 3pt; }
figure { margin: 7pt 0; text-align: center; break-inside: avoid; } figure img { max-width: 100%; max-height: 1.6in; object-fit: contain; }
figure.scene img { max-height: 1.2in; } figcaption { font-size: 8pt; font-style: italic; margin-top: 2pt; }
figure.photo img { max-height: 3in; border-radius: 4pt; }
figure.ch-art { margin: 4pt 0 8pt; } figure.ch-art img { width: 100%; max-width: 100%; height: 1.9in; max-height: 1.9in; object-fit: cover; border-radius: 6pt; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 6pt; font-size: 8.5pt; }
th, td { border: 1px solid ${INK}; padding: 2.5pt 4pt; text-align: left; vertical-align: top; } th { background: ${SAND}; font-family: "${HFONT}", sans-serif; font-size: 7.5pt; }
.worksheet { break-after: page; break-inside: avoid; page-break-inside: avoid; border: 2px solid ${INK}; border-radius: 8pt; padding: 9pt 12pt; background: ${CREAM}; }
.ws-label { text-transform: uppercase; letter-spacing: .12em; font-size: 7.5pt; color: ${TEAL}; font-weight: 800; }
.ws-head { display: flex; align-items: center; justify-content: space-between; gap: 8pt; border-bottom: 2px solid ${TEAL}; margin-bottom: 5pt; }
.ws-head h3 { margin: 0 0 3pt; font-size: 13pt; } .ws-pose { width: 0.65in; }
.worksheet td { height: 12.5pt; line-height: 1.15; background: #fff; } .worksheet p { margin-bottom: 4pt; }
li.chk { list-style: none; margin-left: -15pt; padding-left: 15pt; position: relative; } li.chk::before { content: ""; position: absolute; left: 0; top: 2.5pt; width: 7pt; height: 7pt; border: 1.3px solid ${INK}; border-radius: 1.5pt; background: #fff; }
sup.fn { font-size: 6.5pt; line-height: 0; color: ${TEAL}; font-weight: 700; }
.missing { color: #c00; font-weight: bold; }
.title { page: plain; break-before: page; text-align: center; padding-top: 1.6in; }
.title h1 { font-size: 24pt; border: 0; } .title .sub { font-size: 12pt; color: ${TEAL}; font-weight: 600; margin: 10pt 0 24pt; } .title .by { font-size: 11pt; }
.title .rule { width: 1.2in; height: 4px; background: ${SAND}; margin: 14pt auto; } .title img { width: 1.6in; margin: 18pt auto 0; }
.toc { list-style: none; padding: 0; } .toc li { display: flex; gap: 6pt; align-items: baseline; padding: 3pt 0; border-bottom: 1px dotted ${INK}; margin: 0; }
.toc .t { flex: 1; } .toc .n { color: ${TEAL}; font-weight: 800; width: 14pt; } .toc .pg { font-weight: 600; }
.endnotes { column-count: 2; column-gap: 14pt; font-size: 6.6pt; line-height: 1.25; } .endnotes h4 { font-size: 7.5pt; break-after: avoid; margin-top: 5pt; }
.endnotes ol { padding-left: 11pt; margin: 0 0 2pt; } .endnotes li { word-break: break-all; margin-bottom: 1.5pt; }
.small { font-size: 8.5pt; }
`;

// chapter-to-page lookup is filled in on pass 2
function buildHtml(pages) {
  const pg = (k) => (pages && pages[k] ? pages[k] : '');
  const toc = [
    `<li><span class="n"></span><span class="t">How to use this book</span><span class="pg">${pg('how')}</span></li>`,
    ...chapters.map((c) => `<li><span class="n">${c.n}</span><span class="t">${esc(chTitle(c))}</span><span class="pg">${pg('ch' + c.n)}</span></li>`),
    `<li><span class="n"></span><span class="t">Next steps</span><span class="pg">${pg('next')}</span></li>`,
    `<li><span class="n"></span><span class="t">Endnotes</span><span class="pg">${pg('end')}</span></li>`,
    `<li><span class="n"></span><span class="t">Credits</span><span class="pg">${pg('cred')}</span></li>`,
    `<li><span class="n"></span><span class="t">About</span><span class="pg">${pg('about')}</span></li>`,
  ].join('');
  const celebrate = poseImg('celebrating', 'tip-pose');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(bookTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@400;600;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<style>${css}</style></head><body>
${process.env.NO_COVER ? "" : fs.existsSync(cover) ? `<div class="cover"><img src="${url(cover)}" alt="Cover"></div>` : (missing.push('cover.png'), '')}
<section class="title"><h1>${esc(bookTitle)}</h1><div class="rule"></div><div class="sub">${esc(subtitle)}</div><div class="by">${esc(byline)}</div>${poseImg('pointing')}</section>
<section class="front"><h1>Copyright and disclaimer</h1>${paras(copyright)}</section>
<section class="front2"><h1>Contents</h1><ul class="toc">${toc}</ul></section>
<section class="front" id="how"><h1>How to use this book</h1>${photoHtml}${howHtml}</section>
${chapters.map((c) => `<article class="chapter" id="ch${c.n}">${c.html}</article>`).join('\n')}
<section class="front" id="next"><h1>Next steps</h1>
<div class="tip ${sideOf('celebrating')}">${celebrate}<div>You do not need to finish the book to start. Two actions, in this order.</div></div>
${book.nextStepsHtml}</section>
<section class="front" id="end"><h1>Endnotes</h1><p class="small">Notes are listed by chapter, in the order they appear. Each gives the source, its URL and the date it was fetched. Sources marked vendor-reported come from a company, not a government or research body.</p><div class="endnotes">${endnoteHtml()}</div></section>
<section class="front" id="cred"><h1>Credits</h1><p class="small">${esc(book.creditsNote)}</p><ul class="small">${creditsHtml.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
<section class="front2" id="about"><h1>About</h1><p>${esc(bookTitle)} ${esc(book.about)}</p><p>Every statistic in the book has an endnote with its source and the date it was fetched. Examples marked "Hypothetical" use made-up numbers to show the math.</p><p class="small">${esc(book.disclaimer)}</p></section>
</body></html>`;
}

const browser = await launch();
const page = await browser.newPage();
const htmlPath = path.join(outDir, 'book.html');
const pdfPath = path.join(outDir, process.env.PDF_OUT || 'ebook.pdf'); // PDF_OUT / NO_COVER / PAGE_W_IN let the same script build the paperback interior
async function render(pages) {
  fs.writeFileSync(htmlPath, buildHtml(pages));
  await page.goto(url(htmlPath), { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
}
await render(null);
const textPages = () => execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' }).split('\f');
const find = (re, from = 4) => { const t = textPages(); for (let i = from; i < t.length; i++) if (re.test(t[i])) return i + 1; return ''; };
const pages = { how: find(/^How to use this book$/m, 3) };
{ const tp = textPages(); const ws = []; tp.forEach((t, k) => { if (/WORKSHEETs*$/m.test(t)) ws.push(k + 1); }); chapters.forEach((c, k) => { pages['ch' + c.n] = k === 0 ? 5 : (ws[k - 1] ? ws[k - 1] + 1 : ''); }); }
pages.next = find(/^Next steps$/m, 8); pages.end = find(/^Endnotes$/m, 8); pages.cred = find(/^Credits$/m, 8); pages.about = find(/^About$/m, 8);
await render(pages);
// worksheet fit check: each .worksheet must fit one page content height
const wsFit = await page.evaluate((ph) => [...document.querySelectorAll('.worksheet')].map((w) => ({ t: w.querySelector('h3').textContent, h: Math.round(w.getBoundingClientRect().height) })), PH);
const fontsOk = await page.evaluate((f) => document.fonts.check(`12px "${f}"`), BFONT);
await browser.close();
const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
console.log(info.match(/Pages:.*/)[0], '| page size', info.match(/Page size:.*/)[0]);
console.log('pdf', pdfPath, '| size bytes', fs.statSync(pdfPath).size);
console.log('chapters', chapters.length, '| endnotes', notes.length, '| front-notes', frontLocal.map.size);
console.log('poses used', [...resolved.poses].join(','), '| scenes', resolved.scenes.length, '| figures', resolved.figures.length);
console.log('worksheet heights (css px, page content ~', Math.round((PH - 1.45) * 96), ')', JSON.stringify(wsFit));
console.log('web font loaded:', fontsOk, '| TOC pages', JSON.stringify(pages));
console.log('missing slots:', missing.length ? missing.join(', ') : 'none');
process.exit(missing.length ? 1 : 0);