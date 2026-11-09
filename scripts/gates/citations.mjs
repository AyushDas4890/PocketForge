#!/usr/bin/env node
// Gate: any sentence with a number, %, $ or "study/survey" needs a [^n] that resolves to a URL in research/.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { sentences, footnoteDefs, researchDirFor, researchUrls, normUrl, expandTargets, report } from './lib.mjs';

const CLAIM = /\d|%|\$|\b(stud(y|ies)|surveys?)\b/i;
const REF = /\[\^([^\]]+)\]/g;

export function checkCitations(text, researchDir) {
  const errors = [];
  const defs = footnoteDefs(text);
  const urls = researchUrls(researchDir);
  if (!researchDir) errors.push('no research/ folder found next to the manuscript');

  for (const s of sentences(text)) {
    const bare = s.replace(REF, '');
    if (!CLAIM.test(bare)) continue;
    const refs = [...s.matchAll(REF)].map((m) => m[1]);
    if (!refs.length) {
      errors.push(`uncited claim: "${s.slice(0, 120)}"`);
      continue;
    }
    for (const id of refs) {
      const def = defs.get(id);
      if (!def) { errors.push(`[^${id}] has no definition`); continue; }
      const url = def.match(/https?:\/\/[^\s)>\]]+/);
      if (!url) { errors.push(`[^${id}] definition has no URL`); continue; }
      if (!urls.has(normUrl(url[0]))) errors.push(`[^${id}] URL not found on line 1 of any research file: ${url[0]}`);
    }
  }
  return [...new Set(errors)];
}

export function run(targets) {
  const results = expandTargets(targets).map((file) => ({
    file,
    errors: checkCitations(fs.readFileSync(file, 'utf8'), researchDirFor(file)),
  }));
  return report('citations', results);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(run(process.argv.slice(2)) ? 1 : 0);
}
