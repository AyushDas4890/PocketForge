#!/usr/bin/env node
// Gate: every chapter (chNN*.md) has >=1 worksheet block, >=1 assets/character/ reference and >=1 other image.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { expandTargets, report } from './lib.mjs';

export function isChapter(file) {
  return /^ch\d+/i.test(path.basename(file));
}

export function checkStructure(text) {
  const errors = [];
  const worksheets = (text.match(/^:::worksheet\b[\s\S]*?^:::\s*$/gm) || []).length;
  // [POSE:x] / [SCENE:y] slots resolve to assets/character/{poses,scenes}/, so they count as character references.
  const charRefs =
    (text.match(/assets\/character\//g) || []).length +
    (text.match(/\[(POSE|SCENE):[^\]]+\]/g) || []).length;
  const images = [...text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  const otherImages = images.filter((src) => !src.includes('assets/character/'));

  if (worksheets < 1) errors.push('no :::worksheet block');
  if (charRefs < 1) errors.push('no assets/character/ reference or [POSE:]/[SCENE:] slot');
  if (otherImages.length < 1) errors.push('no non-character image reference');
  return errors;
}

export function run(targets) {
  const results = expandTargets(targets)
    .filter(isChapter)
    .map((file) => ({ file, errors: checkStructure(fs.readFileSync(file, 'utf8')) }));
  return report('structure', results);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)) ? 1 : 0);
}
