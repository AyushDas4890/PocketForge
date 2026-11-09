---
description: Resume a project from its approved outline through manuscript, mascot, cover, layout and export
argument-hint: "<project-slug>"
---

Project: `projects/$ARGUMENTS/`

Follow CLAUDE.md. First read `approvals.md`. If STOP 2 (outline) is not recorded, stop and tell the user to approve the outline first. Skip any phase whose outputs already exist and pass their checks. Say which phases you are skipping and why.

## Manuscript (Phase 7)
1. For each chapter in `outline.md`, choose the research files that support it. Write the mapping to `manuscript/research-map.md`.
2. Spawn `writer` subagents, **max 3 in parallel**, one chapter each. Give each writer only: its chapter entry from `outline.md`, its research files from the map, `transformation.md`, and the path `manuscript/chNN.md`.
3. The PostToolUse hook runs the 3 gates on every manuscript write. A writer must fix gate failures before it returns.
4. For each finished chapter, spawn a fresh `critic`. It returns PASS or a fix list. On a fix list, spawn a new `writer` with the fix list and the same inputs. Max 2 revision loops. A chapter still failing after 2 loops: list it for the user and continue with the rest.
5. Write front matter (`manuscript/00-front.md`: title page, copyright, disclaimer page if health/legal/finance, how to use this book) and `manuscript/99-endnotes.md` (all footnotes, numbered, with URLs and fetch dates).
Print `✅ Phase 7: <n> chapters, <m> citations, gates PASS, critic PASS on <k>/<n>`.

## Character sheet (Phase 8)
Spawn `character-designer` with the slug, mode `sheet`. It writes `brand.md` palette (if missing, from Canva brand kit or benchmark covers via `designer`), `assets/character/rig.svg` and `sheet.png`. Show `sheet.png` (Read the image). **STOP 3**: wait for approval or change requests. Record in `approvals.md`.

## Poses and scenes (Phase 9)
Spawn `character-designer`, mode `library`. It renders the pose library (pointing, thinking, celebrating, warning, explaining-with-board, holding-checklist), one scene per chapter framework from every `[SCENE:...]` slot, and runs the consistency check.
Print `✅ Phase 9: <n> poses, <m> scenes, consistency PASS`.

## Animations (Phase 10)
Run `.claude/commands/animate.md` for this slug.

## Brand and cover (Phase 11)
Spawn `designer`, mode `cover`. It produces 3 cover options at 1600×2560 in Canva. Show all 3. **STOP 4**: user picks one. Record in `approvals.md`.

## Layout (Phase 12)
Spawn `designer`, mode `interior` (chapter openers, worksheet pages, charts, diagrams, uploads poses/scenes), then `layout` to assemble and export. Every `[POSE:]` and `[SCENE:]` slot must resolve to a rendered file. Fallback to HTML + print CSS after 2 Canva failures.
Print `✅ Phase 12: ebook.pdf <pages> pages`.

## Export and extras (Phase 13)
Spawn `designer`, mode `extras`: mockup, Gumroad/Etsy listing images. Then write `output/README.md`: 3-line sales blurb (no banned phrases, no unsourced claims) and a suggested price with the benchmark rows it is based on. Copy `assets/character/anim/` to `output/anim/`.
Print `✅ Phase 13: deliverables ready in output/`.
