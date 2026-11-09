---
description: (Re)build the mascot animation pack for a project
argument-hint: "<project-slug>"
---

Project: `projects/$ARGUMENTS/`

Follow CLAUDE.md. Requires an approved character (STOP 3 in `approvals.md`) and `assets/character/rig.svg`. If either is missing, stop and say which.

Spawn the `animator` subagent with the slug. It builds, in this order:
1. `idle` loop: blink + breathe, seamless loop, 4–6 s.
2. `wave` intro: 3–4 s.
3. One 10–20 s explainer clip per key framework, from the chapter text in `manuscript/` and the matching scene in `assets/character/scenes/`.
4. A 30 s promo built from the chosen cover (`output/cover.png`, skip with a note if no cover yet) and the character.

Each clip ships as `assets/character/anim/<name>.mp4` (1920×1080, H.264, yuv420p) and `<name>.gif` (≤ 8 MB; reduce width or fps until it fits). Frame samples at start, middle and end go to `assets/character/qa/<name>-{start,mid,end}.png`.

When the animator returns: Read the frame samples for every clip and check the character against `sheet.png` (proportions, colors, line weight). Send drift back to the animator with the frame names. Max 2 fix loops.
Print `✅ Phase 10: <n> clips, total <MB> MB, consistency PASS`.
