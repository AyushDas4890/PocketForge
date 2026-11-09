#!/usr/bin/env node
// PostToolUse hook: after Write/Edit under projects/*/manuscript/, run the gates.
// Exit 2 with failures on stderr so Claude Code feeds them back to the model.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let input = '';
for await (const chunk of process.stdin) input += chunk;

let file;
try {
  const data = JSON.parse(input || '{}');
  file = data.tool_input?.file_path || data.tool_input?.path;
} catch {
  process.exit(0);
}
if (!file) process.exit(0);

const norm = file.replace(/\\/g, '/');
// Only chapter files (chNN.md). research-map.md, 00-front.md and 99-endnotes.md are not chapters.
if (!/\/projects\/[^/]+\/manuscript\/ch\d+\.md$/.test(norm)) process.exit(0);

const runAll = path.join(path.dirname(fileURLToPath(import.meta.url)), 'run-all.mjs');
const r = spawnSync(process.execPath, [runAll, file], { encoding: 'utf8' });
if (r.status === 0) process.exit(0);

const failures = (r.stdout || '').split('\n').filter((l) => l.startsWith('FAIL') || l.startsWith('  - ')).join('\n');
process.stderr.write(`Manuscript gates failed for ${path.basename(file)}. Fix these, then save again:\n${failures}\n`);
process.exit(2);
