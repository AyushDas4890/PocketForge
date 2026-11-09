#!/usr/bin/env node
// Render assets/character/sheet.png: front, three-quarter, side + 6 expressions + palette.
// usage: node scripts/character/render-sheet.mjs projects/<slug>
import fs from 'node:fs';
import path from 'node:path';
import { launch, loadRig, rigMeta, RUNTIME } from './common.mjs';

const projectDir = process.argv[2];
if (!projectDir) { console.error('usage: render-sheet.mjs projects/<slug>'); process.exit(2); }

const { dir, rig, poses } = loadRig(projectDir);
const { palette } = rigMeta(rig);
const views = ['front', 'three-quarter', 'side'];
const exprs = Object.keys(poses).filter((k) => k.startsWith('expr-')).sort();
for (const v of views) if (!poses[v]) { console.error(`missing pose-data/sheet/${v}.json`); process.exit(1); }
if (exprs.length < 6) { console.error(`need 6 expr-*.json, found ${exprs.length}`); process.exit(1); }

let name = 'Mascot';
const brief = path.join(dir, 'brief.md');
if (fs.existsSync(brief)) {
  const m = fs.readFileSync(brief, 'utf8').match(/^Name:\s*(.+)$/m);
  if (m) name = m[1].trim();
}

const html = `<!doctype html><html><head><style>
  body{margin:0;background:#FBF7EF;font-family:"Segoe UI",system-ui,sans-serif;color:#233046}
  .sheet{width:1500px;padding:40px 50px;box-sizing:border-box}
  h1{font-size:34px;margin:0 0 4px} .sub{font-size:16px;opacity:.7;margin-bottom:24px}
  .row{display:flex;gap:24px;margin-bottom:28px}
  .cell{background:#fff;border-radius:16px;flex:1;display:flex;flex-direction:column;align-items:center;padding:16px}
  .cell .art{width:100%;height:440px} .cell.expr .art{height:180px}
  .label{font-size:15px;font-weight:600;margin-top:8px;text-transform:capitalize}
  .pal{display:flex;gap:16px;align-items:center;font-size:14px}
  .sw{width:44px;height:44px;border-radius:10px;border:2px solid #23304622}
</style></head><body><div class="sheet">
  <h1>${name}: character sheet</h1><div class="sub">Turnaround, expressions and palette. Every pose and frame must match this sheet.</div>
  <div class="row">${views.map((v) => `<div class="cell"><div class="art" data-pose="${v}"></div><div class="label">${v.replace('-', ' ')}</div></div>`).join('')}</div>
  <div class="row">${exprs.map((e) => `<div class="cell expr"><div class="art" data-pose="${e}" data-head="1"></div><div class="label">${e.replace(/^expr-(\d+-)?/, '')}</div></div>`).join('')}</div>
  <div class="pal">${palette.map((c) => `<div class="sw" style="background:${c}"></div><span>${c}</span>`).join('')}</div>
</div></body></html>`;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html);
await page.addScriptTag({ content: RUNTIME });
await page.evaluate(({ rig, poses }) => {
  document.querySelectorAll('[data-pose]').forEach((el) => {
    const svg = PF.mount(el, rig, '-40 20 480 470');
    const root = PF.applyPose(svg, poses[el.dataset.pose]);
    if (el.dataset.head) {
      const head = root.querySelector('[data-part="head"]');
      const b = head.getBBox();
      const pad = 10;
      svg.style.overflow = 'hidden';
      svg.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    }
  });
}, { rig, poses });
const out = path.join(dir, 'sheet.png');
await page.locator('.sheet').screenshot({ path: out });
await browser.close();
console.log(`sheet ${out}`);
