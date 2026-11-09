#!/usr/bin/env node
// Gate: zero hits on the banned-phrase list.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { expandTargets, report } from './lib.mjs';

export const BANNED = [
  /\bdelv(e|es|ed|ing)\b/i,
  /\bunlock(s|ed|ing)?\b/i,
  /\bgame[- ]?changers?\b/i,
  /\blandscapes?\b/i,
  /\bseamless(ly)?\b/i,
  /in today['’]s fast[- ]paced world/i,
  /it['’]s important to note/i,
  /\bin conclusion\b/i,
  /\bharness(es|ing)? the power\b/i,
];

export function checkBanned(text) {
  const errors = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const re of BANNED) {
      const m = line.match(re);
      if (m) errors.push(`line ${i + 1}: banned "${m[0]}"`);
    }
  });
  return errors;
}

export function run(targets) {
  const results = expandTargets(targets).map((file) => ({ file, errors: checkBanned(fs.readFileSync(file, 'utf8')) }));
  return report('banned', results);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)) ? 1 : 0);
}
