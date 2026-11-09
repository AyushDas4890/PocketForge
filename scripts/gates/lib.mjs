// Shared helpers for the manuscript gates.
import fs from 'node:fs';
import path from 'node:path';

/** Remove :::worksheet blocks, fenced code, footnote definitions, headings, slot and image lines. */
export function proseLines(text) {
  const out = [];
  let inWorksheet = false;
  let inFence = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    // :::example blocks hold labelled hypothetical arithmetic; they cite nothing, so the gates skip them.
    if (/^:::(worksheet|example)\b/.test(line)) { inWorksheet = true; continue; }
    if (inWorksheet) { if (line === ':::') inWorksheet = false; continue; }
    if (/^\[\^[^\]]+\]:/.test(line)) continue;          // footnote definition
    if (/^#{1,6}\s/.test(line)) continue;               // heading
    if (/^!\[/.test(line)) continue;                    // image line
    if (/^\[(POSE|SCENE):[^\]]*\]$/.test(line)) continue; // slot-only line
    if (/^<!--.*-->$/.test(line)) continue;
    out.push(line);
  }
  return out;
}

/** Split prose into sentences. Keeps footnote refs attached to the sentence they follow. */
export function sentences(text) {
  const joined = proseLines(text)
    .map((l) => l.replace(/^(\d+[.)]|[-*+])\s+/, '')) // list markers are not numbers in claims
    .join(' ')
    .replace(/\s+/g, ' ');
  // Split after . ! ? (optionally followed by footnote refs / closing quotes) when a capital or quote follows.
  return joined
    .split(/(?<=[.!?]["”’)]?(?:\[\^[^\]]+\])*)\s+(?=["“(]?[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Map footnote id -> definition text. */
export function footnoteDefs(text) {
  const defs = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^\[\^([^\]]+)\]:\s*(.+)$/);
    if (m) defs.set(m[1], m[2]);
  }
  return defs;
}

/** Find projects/<slug>/research for a manuscript file. */
export function researchDirFor(file) {
  let dir = path.dirname(path.resolve(file));
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'research');
    if (fs.existsSync(candidate)) return candidate;
    if (path.basename(dir) === 'manuscript') {
      const sib = path.join(path.dirname(dir), 'research');
      if (fs.existsSync(sib)) return sib;
    }
    dir = path.dirname(dir);
  }
  return null;
}

/** Normalise a URL for comparison. */
export function normUrl(u) {
  return u.trim().replace(/[).,;]+$/, '').replace(/\/+$/, '').replace(/^http:\/\//, 'https://').toLowerCase();
}

/** Set of source URLs from line 1 of every research/*.md file. */
export function researchUrls(researchDir) {
  const urls = new Set();
  if (!researchDir || !fs.existsSync(researchDir)) return urls;
  for (const f of fs.readdirSync(researchDir)) {
    if (!f.endsWith('.md')) continue;
    const first = fs.readFileSync(path.join(researchDir, f), 'utf8').split(/\r?\n/, 1)[0];
    const m = first.match(/^Source:\s*(\S+)/);
    if (m && /^https?:\/\//.test(m[1])) urls.add(normUrl(m[1]));
  }
  return urls;
}

/** Expand file and directory arguments into .md files. */
export function expandTargets(args) {
  const files = [];
  for (const a of args) {
    if (!fs.existsSync(a)) continue;
    if (fs.statSync(a).isDirectory()) {
      // A folder means "the chapters in it": front matter, endnotes and the research map are not gated.
      for (const f of fs.readdirSync(a).sort()) if (/^ch\d+\.md$/.test(f)) files.push(path.join(a, f));
    } else files.push(a);
  }
  return files;
}

export function report(name, results) {
  let failed = 0;
  for (const r of results) {
    if (r.errors.length) {
      failed++;
      console.log(`FAIL ${name} ${r.file}`);
      for (const e of r.errors) console.log(`  - ${e}`);
    } else console.log(`PASS ${name} ${r.file}`);
  }
  return failed;
}
