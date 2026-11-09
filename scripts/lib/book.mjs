// Book metadata for a project: projects/<slug>/book.json, with fallbacks from manuscript/00-front.md.
// Every layout/extras script reads this instead of hard-coding a title, author or mascot.
import fs from 'node:fs';
import path from 'node:path';

export function loadBook(proj) {
  const f = path.join(proj, 'book.json');
  const b = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const front = path.join(proj, 'manuscript', '00-front.md');
  if (fs.existsSync(front)) {
    const L = fs.readFileSync(front, 'utf8').split(/\r?\n/).filter(Boolean);
    b.title ??= (L[0] || '').replace(/^#\s+/, '');
    b.subtitle ??= (L[1] || '').replace(/^##\s+/, '');
    b.author ??= (L[2] || '').replace(/^By\s+/i, '');
  }
  b.title ??= 'Untitled';
  b.subtitle ??= '';
  b.shortSubtitle ??= b.subtitle;
  b.author ??= 'Author';
  b.year ??= new Date().getFullYear();
  b.lang ??= 'en-US';
  b.mascot ??= 'the guide';
  b.disclaimer ??= '';
  b.asOf ??= '';
  b.about ??= `was written by ${b.author}.`;
  b.blurb ??= [];
  b.nextStepsHtml ??= '';
  b.creditsNote ??= 'Illustrations, charts and the guide character were created for this book.';
  b.listing ??= {};
  b.art ??= {};
  return b;
}
