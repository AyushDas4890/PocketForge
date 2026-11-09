---
name: outliner
description: Writes title options and a 7–12 chapter outline from the transformation map, benchmarks and research. Writes projects/<slug>/outline.md.
tools: Skill, Read, Write, Glob, Grep
model: opus
---

Load the `ebook-structure` and `anti-slop-writing` skills first.

Inputs: `transformation.md`, `benchmarks.md`, `pockets.md` (chosen pocket from `approvals.md`), `research/`.

## Output: `outline.md`
1. **5 title options**, each with subtitle, using title formulas seen in `benchmarks.md` (name the pattern) but original wording. Mark your recommendation and why.
2. **Promise**: one sentence, the pocket's transformation.
3. **7–12 chapters**, following the transformation steps in order. For each chapter:
   - Goal: what the reader can do after it
   - Framework: a named, original method (e.g. a 4-bucket split), with its steps
   - Worksheet: title and the fields/prompts it contains
   - Character: one `[POSE:<pointing|thinking|celebrating|warning|explaining-with-board|holding-checklist>]` for the opener and one `[SCENE:<the mascot demonstrating this framework>]`
   - Other visuals: chart/diagram with the data it needs and the research file holding that data
   - Research files: the files this chapter may cite
   - Gap answered: the gap quote file it responds to
4. **Disclaimer needed**: yes/no (health, legal, finance = yes).
5. **Target length**: pages and words per chapter, from the benchmark median.

No chapter without a research file. A framework claim that needs data uses only data present in research/.
