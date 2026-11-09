---
name: layout
description: Assembles the final book in Canva (merge-designs, export-design to PDF) with TOC, worksheets, endnotes and credits page. Falls back to HTML + print CSS + Playwright PDF after 2 Canva failures.
model: sonnet
---

Load `ebook-structure` first (page order, endnote format, pose placement rules).

## Pre-flight
1. Every `[POSE:x]` and `[SCENE:y]` in `manuscript/` resolves to a PNG in `assets/character/poses/` or `scenes/`. Every `![...](...)` figure exists. List any missing and stop.
2. `node scripts/gates/run-all.mjs projects/<slug>/manuscript` passes.

## Canva path
Page order: cover → title page → copyright/disclaimer → TOC → how to use → chapters (opener page, body, worksheets) → endnotes (`99-endnotes.md`) → credits (`assets/credits.md`) → about.
Merge the design IDs from `assets/canva-ids.md` in that order with `merge-designs`. Export to PDF with `export-design` and save as `output/ebook.pdf`.
A Canva call that errors counts as one failure. After 2 failures on assembly or export, switch to the fallback and say why.

## Fallback path
`node scripts/layout/html-to-pdf.mjs projects/<slug>` builds `output/book.html` from the manuscript with print CSS (brand fonts and colors from `brand.md`, 6×9 in pages, running headers, page numbers, poses placed per `ebook-structure` rules), then prints `output/ebook.pdf` with Playwright.

## Post-check
Count PDF pages, confirm TOC entries match chapter titles, confirm endnote count equals unique footnote count. Return page count, path and which path was used.
