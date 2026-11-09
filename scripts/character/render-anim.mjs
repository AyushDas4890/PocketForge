#!/usr/bin/env node
// Render a deterministic seek(t) page to MP4 (H.264) + GIF (<= 8 MB) + QA frames (start/mid/end).
// usage:
//   node scripts/character/render-anim.mjs <page.html> <out-base> [--fps 30] [--w 1920] [--h 1080] [--gif-width 720] [--gif-fps 15]
//   node scripts/character/render-anim.mjs --gif-from <clip.mp4> <out-base>
// <out-base> e.g. projects/<slug>/assets/character/anim/idle  ->  idle.mp4, idle.gif, ../qa/idle-{start,mid,end}.png
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { launch, loadRig, ensureDir, RUNTIME } from './common.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args.splice(i, 2)[1] : d; };
const gifFrom = opt('gif-from', null);
const fps = Number(opt('fps', 30));
const W = Number(opt('w', 1920));
const H = Number(opt('h', 1080));
let gifW = Number(opt('gif-width', 720));
let gifFps = Number(opt('gif-fps', 15));
const GIF_MAX = 8 * 1024 * 1024;

function ff(argv) {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${(r.stderr || '').trim().split('\n').pop()}`);
}
function findProject(fromFile) {
  let d = path.dirname(path.resolve(fromFile));
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'assets', 'character', 'rig.svg'))) return d;
    d = path.dirname(d);
  }
  return null;
}
function probeDuration(mp4) {
  const r = spawnSync(ffmpegPath, ['-i', mp4], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

const [input, outBase] = gifFrom ? [gifFrom, args[0]] : args;
if (!input || !outBase) { console.error('usage: render-anim.mjs <page.html> <out-base> | --gif-from <mp4> <out-base>'); process.exit(2); }
const name = path.basename(outBase);
const outDir = ensureDir(path.dirname(path.resolve(outBase)));
const mp4 = gifFrom ? path.resolve(gifFrom) : path.join(outDir, `${name}.mp4`);
const gif = path.join(outDir, `${name}.gif`);
const qaDir = ensureDir(path.join(outDir, '..', 'qa'));

if (!gifFrom) {
  const project = findProject(input);
  const inject = project
    ? (() => { const { rig, poses } = loadRig(project); return `window.PF_RIG=${JSON.stringify(rig)};window.PF_POSES=${JSON.stringify(poses)};`; })()
    : '';
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), `pf-frames-${name}-`));
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.addInitScript({ content: `${RUNTIME}\n${inject}` });
  await page.goto(pathToFileURL(path.resolve(input)).href);
  await page.waitForFunction(() => typeof window.seek === 'function' && typeof window.DURATION === 'number');
  const D = await page.evaluate(() => window.DURATION);
  const N = Math.round(D * fps);
  for (let i = 0; i < N; i++) {
    await page.evaluate((t) => window.seek(t), i / fps);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(5, '0')}.png`) });
  }
  await browser.close();
  ff(['-framerate', String(fps), '-i', path.join(frames, 'f%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', mp4]);
  const pick = { start: 0, mid: Math.floor(N / 2), end: N - 1 };
  for (const [k, i] of Object.entries(pick)) fs.copyFileSync(path.join(frames, `f${String(i).padStart(5, '0')}.png`), path.join(qaDir, `${name}-${k}.png`));
  fs.rmSync(frames, { recursive: true, force: true });
} else {
  const D = probeDuration(mp4);
  for (const [k, t] of Object.entries({ start: 0, mid: D / 2, end: Math.max(0, D - 1 / fps) })) {
    ff(['-ss', String(t), '-i', mp4, '-frames:v', '1', path.join(qaDir, `${name}-${k}.png`)]);
  }
}

// GIF: palette pass, shrink until <= 8 MB.
for (let attempt = 0; attempt < 6; attempt++) {
  ff(['-i', mp4, '-vf', `fps=${gifFps},scale=${gifW}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, '-loop', '0', gif]);
  if (fs.statSync(gif).size <= GIF_MAX) break;
  gifW = Math.round(gifW * 0.8);
  gifFps = Math.max(10, gifFps - 2);
}
const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(2);
console.log(JSON.stringify({ clip: name, mp4, mp4MB: +mb(mp4), gif, gifMB: +mb(gif), gifWidth: gifW, gifFps, qa: ['start', 'mid', 'end'].map((k) => path.join(qaDir, `${name}-${k}.png`)) }, null, 2));
if (fs.statSync(gif).size > GIF_MAX) { console.error('GIF still over 8 MB'); process.exit(1); }
