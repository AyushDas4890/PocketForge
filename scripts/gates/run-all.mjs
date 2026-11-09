#!/usr/bin/env node
// Run all three gates on files or directories. Exit 1 if any gate fails.
import { run as citations } from './citations.mjs';
import { run as banned } from './banned.mjs';
import { run as structure } from './structure.mjs';

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error('usage: node scripts/gates/run-all.mjs <file-or-dir> [...]');
  process.exit(2);
}
const failed = citations(targets) + banned(targets) + structure(targets);
console.log(failed ? `GATES FAIL (${failed})` : 'GATES PASS');
process.exit(failed ? 1 : 0);
