// Shared Node helpers for character rendering.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
export const RUNTIME = fs.readFileSync(path.join(here, 'rig-runtime.js'), 'utf8');

/** Launch Chromium. Falls back to any Playwright Chromium already on disk (no download). */
export async function launch() {
  try {
    return await chromium.launch();
  } catch (err) {
    const base = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
    const dirs = fs.existsSync(base)
      ? fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1])
      : [];
    for (const d of dirs) {
      for (const sub of ['chrome-win64', 'chrome-win']) {
        const exe = path.join(base, d, sub, 'chrome.exe');
        if (fs.existsSync(exe)) return chromium.launch({ executablePath: exe });
      }
    }
    throw err;
  }
}

export function charDir(projectDir) {
  return path.join(projectDir, 'assets', 'character');
}

/** Load rig.svg and every pose JSON (pose-data/*.json and pose-data/sheet/*.json) keyed by file stem. */
export function loadRig(projectDir) {
  const dir = charDir(projectDir);
  const rig = fs.readFileSync(path.join(dir, 'rig.svg'), 'utf8');
  const poses = {};
  for (const sub of ['pose-data', path.join('pose-data', 'sheet')]) {
    const p = path.join(dir, sub);
    if (!fs.existsSync(p)) continue;
    for (const f of fs.readdirSync(p)) {
      if (f.endsWith('.json')) poses[path.basename(f, '.json')] = JSON.parse(fs.readFileSync(path.join(p, f), 'utf8'));
    }
  }
  return { dir, rig, poses };
}

export function libraryPoseNames(projectDir) {
  const p = path.join(charDir(projectDir), 'pose-data');
  return fs.existsSync(p) ? fs.readdirSync(p).filter((f) => f.endsWith('.json')).map((f) => path.basename(f, '.json')) : [];
}

/** Palette and stroke width declared on the rig root. */
export function rigMeta(rigText) {
  const pal = rigText.match(/data-palette="([^"]+)"/);
  const stroke = rigText.match(/data-stroke="([^"]+)"/);
  return {
    palette: pal ? pal[1].split(',').map((s) => s.trim().toLowerCase()) : [],
    stroke: stroke ? Number(stroke[1]) : null,
  };
}

export function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
  return d;
}
