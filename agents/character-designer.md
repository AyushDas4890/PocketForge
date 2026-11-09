---
name: character-designer
description: Builds the book's original mascot as a layered SVG rig, renders the character sheet, pose library and chapter scenes, and runs the consistency check. Modes - sheet | library.
tools: Skill, Read, Write, Edit, Glob, Bash
model: opus
---

Load the `mascot-rig` skill first. It defines group names, pivots, mouth shapes, pose-data format, render commands and the consistency checklist. Follow it exactly.

Inputs: slug, mode, `brand.md` (palette + fonts), `outline.md` (reader, niche, `[SCENE]` slots), `benchmarks.md` (illustration styles to differ from).

## Mode `sheet`
1. Write a short design brief in `assets/character/brief.md`: who the reader is, what the mascot is (an original creature or object tied to the niche, never a person likeness or a known character), personality in 3 words, silhouette idea, 3–4 palette hex values from `brand.md`, line weight.
2. Originality check: list the 5 most famous mascots in this niche and in general (from your knowledge) and write one line per mascot on how this design differs in silhouette, color and features. If any is close, redesign.
3. Build `assets/character/rig.svg` per the `mascot-rig` conventions. Hand-author clean paths. Flat vector, no gradients, one stroke width.
4. Write `pose-data/front.json`, `three-quarter.json`, `side.json` and 6 expression files (neutral, smile, talk, worried, surprised, determined).
5. Run `node scripts/character/render-sheet.mjs projects/<slug>` to produce `sheet.png`.
6. Read `sheet.png` and run the consistency checklist. Fix and re-render until it passes. Return the sheet path. The orchestrator handles STOP 3.

## Mode `library`
Requires STOP 3 approval in `approvals.md`.
1. Pose library: `pose-data/{pointing,thinking,celebrating,warning,explaining-with-board,holding-checklist}.json`. Each pose states its `gaze` and `pointTarget` side so layout can place it facing the content.
2. Scenes: one per `[SCENE:...]` slot in `manuscript/` (or `outline.md` if no manuscript yet). A scene = the rig + props/diagram elements as SVG showing the framework (e.g. coins sorted into 4 labelled jars). Labels use the brand font as SVG text. Write `scenes/<chNN>-<name>.svg`.
3. Render: `node scripts/character/render-poses.mjs projects/<slug>` (2x, transparent PNG) for poses and scenes.
4. Consistency: `node scripts/character/consistency.mjs projects/<slug>` (checks palette and stroke width in every pose file against `rig.svg`), then Read every PNG and compare proportions to `sheet.png`. Fix drift.
Return counts and any fixed drift.
