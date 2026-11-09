---
description: Full pipeline, skill seed to finished illustrated eBook + animation pack, with 4 approval stops
argument-hint: "<skill seed or AUTO>"
---

Seed: $ARGUMENTS

Follow CLAUDE.md for every phase. Print a `✅ Phase N:` line after each phase. Append one line per phase to `cost-log.md`.

## Phases 0–3: pockets
Run every step of `.claude/commands/pockets.md` with the seed above. **STOP 1**: the user picks a pocket. Record it in `approvals.md`. Rename the project folder to the final slug (kebab-case from the pocket, max 40 chars) and keep a note of the old name in `approvals.md`.

## Phase 4: transformation map
Write `transformation.md` yourself from `pockets.md` + `research/gaps-*.md`:
- Before state (what the reader feels, does, loses) with verbatim quotes from gap files, each linked.
- After state (concrete, measurable where the research supports it).
- 5–9 steps from before to after. Each step names the obstacle it removes and the gap quote it answers.
Print `✅ Phase 4: <n>-step transformation map`.

## Phase 5: benchmark
Spawn `benchmarker`. It writes `benchmarks.md` on 5 real competing eBooks/courses: title formula, TOC pattern, page count, worksheet and visual density, illustration style, cover style, price. Patterns only.
Print `✅ Phase 5: 5 competitors benchmarked, price band $<lo>–$<hi>`.

## Phase 6: outline
Spawn `outliner`. It writes `outline.md`: 5 title options and a 7–12 chapter outline. **STOP 2**: show the titles and TOC, wait for approval or edits. Record in `approvals.md`.

## Phase 7: manuscript
Continue exactly as `.claude/commands/book.md` describes from its "Manuscript" section onward, which covers phases 7–13 including **STOP 3** (character sheet) and **STOP 4** (cover pick).

## Finish
Print the deliverables list from `output/` with file sizes and the README blurb.
