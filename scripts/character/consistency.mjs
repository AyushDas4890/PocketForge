#!/usr/bin/env node
// Consistency check: palette-only colors, one stroke width (tubes: outer - inner = 2 x stroke),
// and head/torso size identical to the rest pose in every pose of the same view.
// usage: node scripts/character/consistency.mjs projects/<slug>
import fs from 'node:fs';
import path from 'node:path';
import { launch, loadRig, rigMeta, RUNTIME } from './common.mjs';

const projectDir = process.argv[2];
if (!projectDir) { console.error('usage: consistency.mjs projects/<slug>'); process.exit(2); }
const { dir, rig, poses } = loadRig(projectDir);
const { palette, stroke } = rigMeta(rig);
const errors = [];
const lines = [];

function staticCheck(label, text) {
  const colors = [...text.matchAll(/(?:fill|stroke)\s*[=:]\s*"?\s*(#[0-9a-fA-F]{3,8})/g)].map((m) => m[1].toLowerCase());
  const bad = [...new Set(colors.filter((c) => !palette.includes(c)))];
  if (bad.length) errors.push(`${label}: colors outside palette ${bad.join(', ')}`);
  if (/<(linearGradient|radialGradient|filter)\b/.test(text)) errors.push(`${label}: gradients/filters are not allowed`);
  // stroke widths on non-tube elements
  const els = [...text.matchAll(/<(path|circle|ellipse|rect|line|polyline|polygon)\b([^>]*)>/g)];
  const widths = new Set();
  for (const [, , attrs] of els) {
    if (/data-tube=/.test(attrs)) continue;
    const w = attrs.match(/stroke-width="([\d.]+)"/);
    if (w) widths.add(Number(w[1]));
  }
  for (const w of widths) if (w !== stroke) errors.push(`${label}: stroke-width ${w} differs from data-stroke ${stroke}`);
  // tubes: outer = inner + 2*stroke, in document order pairs
  const tubes = [...text.matchAll(/data-tube="(outer|inner)"[^>]*stroke-width="([\d.]+)"|stroke-width="([\d.]+)"[^>]*data-tube="(outer|inner)"/g)]
    .map((m) => ({ kind: m[1] || m[4], w: Number(m[2] || m[3]) }));
  for (let i = 0; i + 1 < tubes.length; i += 2) {
    const [o, n] = tubes[i].kind === 'outer' ? [tubes[i], tubes[i + 1]] : [tubes[i + 1], tubes[i]];
    if (o.w - n.w !== 2 * stroke) errors.push(`${label}: tube outline ${(o.w - n.w) / 2} differs from stroke ${stroke}`);
  }
  lines.push(`- ${label}: ${colors.length} color uses, widths {${[...widths].join(', ')}}, ${tubes.length / 2} tubes`);
}

staticCheck('rig.svg', rig);
const scenesDir = path.join(dir, 'scenes');
if (fs.existsSync(scenesDir)) for (const f of fs.readdirSync(scenesDir).filter((f) => f.endsWith('.svg'))) staticCheck(`scenes/${f}`, fs.readFileSync(path.join(scenesDir, f), 'utf8'));

// Dynamic: rendered size of head-base and torso-base per pose vs rest pose of the same view.
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 800, height: 900 } });
await page.setContent('<div id="s" style="width:600px;height:700px"></div>');
await page.addScriptTag({ content: RUNTIME });
const sizes = await page.evaluate(({ rig, poses }) => {
  const svg = PF.mount(document.getElementById('s'), rig, '-100 -90 600 700');
  const measure = (pose) => {
    const root = PF.applyPose(svg, pose);
    // Local bbox x the element's effective scale: rotation-invariant, catches any real scaling.
    const w = (sel) => {
      const el = root.querySelector(sel);
      if (!el) return null;
      const m = el.getCTM();
      return el.getBBox().width * Math.hypot(m.a, m.b);
    };
    return { head: w('[data-shape="head-base"]'), torso: w('[data-shape="torso-base"]') };
  };
  const out = {};
  for (const v of ['front', 'three-quarter', 'side']) out[`rest:${v}`] = measure({ view: v });
  for (const [n, p] of Object.entries(poses)) out[n] = { view: p.view || 'front', ...measure(p) };
  return out;
}, { rig, poses });
await browser.close();

for (const [n, s] of Object.entries(sizes)) {
  if (n.startsWith('rest:')) continue;
  const rest = sizes[`rest:${s.view}`];
  for (const k of ['head', 'torso']) {
    if (s[k] == null || rest[k] == null) { errors.push(`${n}: missing data-shape="${k}-base"`); continue; }
    const diff = Math.abs(s[k] - rest[k]) / rest[k];
    if (diff > 0.01) errors.push(`${n}: ${k} size drifts ${(diff * 100).toFixed(1)}% from rest ${s.view}`);
  }
  lines.push(`- pose ${n} (${s.view}): head ${s.head?.toFixed(1)}px, torso ${s.torso?.toFixed(1)}px`);
}

const verdict = errors.length ? 'FAIL' : 'PASS';
const report = `# Consistency ${verdict}\n\nPalette: ${palette.join(', ')} | stroke ${stroke}\n\n${lines.join('\n')}\n\n${errors.length ? '## Errors\n' + errors.map((e) => `- ${e}`).join('\n') : 'No drift.'}\n`;
fs.mkdirSync(path.join(dir, 'qa'), { recursive: true });
fs.writeFileSync(path.join(dir, 'qa', 'consistency.md'), report);
console.log(report);
process.exit(errors.length ? 1 : 0);
