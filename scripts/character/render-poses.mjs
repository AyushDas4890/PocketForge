#!/usr/bin/env node
// Render pose-data/*.json -> poses/<name>.png and scenes/*.svg -> scenes/<name>.png at 2x, transparent, cropped.
// usage: node scripts/character/render-poses.mjs projects/<slug> [poseName ...]
import fs from 'node:fs';
import path from 'node:path';
import { launch, loadRig, libraryPoseNames, ensureDir, RUNTIME } from './common.mjs';

const [projectDir, ...only] = process.argv.slice(2);
if (!projectDir) { console.error('usage: render-poses.mjs projects/<slug> [poseName ...]'); process.exit(2); }

const { dir, rig, poses } = loadRig(projectDir);
const names = (only.length ? only : libraryPoseNames(projectDir));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
const PAD = 12;

await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
  <div id="stage" style="position:absolute;left:150px;top:100px;width:600px;height:700px"></div></body></html>`);
await page.addScriptTag({ content: RUNTIME });

ensureDir(path.join(dir, 'poses'));
for (const name of names) {
  const pose = poses[name];
  if (!pose) { console.error(`no pose-data for ${name}`); continue; }
  // Wide viewBox so raised arms and props are never clipped; crop to the visible view afterwards.
  const box = await page.evaluate(({ rig, pose }) => {
    const svg = PF.mount(document.getElementById('stage'), rig, '-100 -90 600 700');
    const root = PF.applyPose(svg, pose);
    const r = root.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }, { rig, pose });
  const out = path.join(dir, 'poses', `${name}.png`);
  await page.screenshot({
    path: out,
    omitBackground: true,
    clip: { x: box.x - PAD, y: box.y - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 },
  });
  console.log(`pose  ${out}`);
}

const scenesDir = path.join(dir, 'scenes');
if (!only.length && fs.existsSync(scenesDir)) {
  for (const f of fs.readdirSync(scenesDir).filter((f) => f.endsWith('.svg'))) {
    const svgText = fs.readFileSync(path.join(scenesDir, f), 'utf8');
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svgText}</body></html>`);
    const el = await page.$('svg');
    const out = path.join(scenesDir, f.replace(/\.svg$/, '.png'));
    await el.screenshot({ path: out, omitBackground: true });
    console.log(`scene ${out}`);
  }
}
await browser.close();
