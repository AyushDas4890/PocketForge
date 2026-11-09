import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkCitations } from './citations.mjs';
import { checkBanned } from './banned.mjs';
import { checkStructure } from './structure.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function fixtureProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-gates-'));
  const proj = path.join(root, 'projects', 'demo');
  fs.mkdirSync(path.join(proj, 'research'), { recursive: true });
  fs.mkdirSync(path.join(proj, 'manuscript'), { recursive: true });
  fs.writeFileSync(
    path.join(proj, 'research', '01-bls.md'),
    'Source: https://www.bls.gov/cex/ | Fetched: 2026-11-09\nType: primary\n- "Housing was 33% of spending."\n',
  );
  return { root, proj, research: path.join(proj, 'research') };
}

// ---------- citations ----------
test('citations: PASS when every claim has a footnote that resolves to a research URL', () => {
  const { research } = fixtureProject();
  const md = [
    'Housing takes 33% of a typical budget.[^1] You can plan around that.',
    '',
    '[^1]: Consumer Expenditure Survey, https://www.bls.gov/cex/, fetched 2026-11-09. (research/01-bls.md)',
  ].join('\n');
  assert.deepEqual(checkCitations(md, research), []);
});

test('citations: FAIL on an uncited number and on a footnote URL not in research/', () => {
  const { research } = fixtureProject();
  const md = [
    'Most households spend $1,200 on groceries.',
    'A survey found people worry.[^2]',
    '',
    '[^2]: Random blog, https://example.com/post, fetched 2026-11-09.',
  ].join('\n');
  const errors = checkCitations(md, research);
  assert.ok(errors.some((e) => e.startsWith('uncited claim')), errors.join('\n'));
  assert.ok(errors.some((e) => e.includes('not found on line 1')), errors.join('\n'));
});

// ---------- banned ----------
test('banned: PASS on clean prose', () => {
  assert.deepEqual(checkBanned('Split your paycheck into four buckets before rent is due.'), []);
});

test('banned: FAIL on banned phrases', () => {
  const errors = checkBanned("In today's fast-paced world, let's delve into budgeting.\nIn conclusion, it's a game-changer.");
  assert.equal(errors.length, 4, errors.join('\n'));
});

// ---------- structure ----------
const goodChapter = [
  '# Chapter 1: The Four Buckets',
  '[POSE:pointing]',
  'Text.',
  '![Where the money goes](../assets/figures/ch01-spend.png)',
  ':::worksheet Your four buckets',
  '- Bills: ____',
  ':::',
].join('\n');

test('structure: PASS with worksheet, character ref and another image', () => {
  assert.deepEqual(checkStructure(goodChapter), []);
});

test('structure: FAIL when worksheet, character ref and other image are missing', () => {
  const errors = checkStructure('# Chapter 2\nJust text.\n![](../assets/character/poses/thinking.png)\n');
  assert.ok(errors.includes('no :::worksheet block'));
  assert.ok(errors.includes('no non-character image reference'));
});

// ---------- hook ----------
function runHook(file) {
  return spawnSync(process.execPath, [path.join(here, 'hook.mjs')], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: file } }),
    encoding: 'utf8',
  });
}

test('hook: exit 0 for a passing chapter, exit 2 with feedback for a failing one, ignore other paths', () => {
  const { proj } = fixtureProject();
  const good = path.join(proj, 'manuscript', 'ch01.md');
  fs.writeFileSync(good, goodChapter);
  assert.equal(runHook(good).status, 0);

  const bad = path.join(proj, 'manuscript', 'ch02.md');
  fs.writeFileSync(bad, '# Chapter 2\nLet us delve into 40% savings.\n');
  const r = runHook(bad);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /banned "delve"/);
  assert.match(r.stderr, /uncited claim/);

  assert.equal(runHook(path.join(proj, 'notes.md')).status, 0);
});

test('citations: numbers inside a :::example block need no footnote', () => {
  const { research } = fixtureProject();
  const md = [
    'Plan around your own numbers.',
    '',
    ':::example Hypothetical',
    'Say your take-home is $3,000 a month and rent is $1,200.',
    ':::',
  ].join('\n');
  assert.deepEqual(checkCitations(md, research), []);
});
