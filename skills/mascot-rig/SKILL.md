---
name: mascot-rig
description: SVG rig conventions for PocketForge mascots (part names, pivots, views, face states), pose-data JSON format, render commands for sheet/poses/scenes/animations, and the consistency checklist. Use before building, posing, rendering or animating a mascot.
invoke: mascot-rig
---

# Mascot rig

One rig file drives every still and every animation frame. Poses never redraw the character: they only rotate/translate parts and switch face states. That is what keeps the character identical everywhere.

## Files
```
assets/character/
  brief.md               design brief + originality check
  build-rig.mjs          optional: code that writes rig.svg (recommended, keeps geometry shared across views)
  rig.svg                the rig
  pose-data/sheet/       front.json, three-quarter.json, side.json, expr-*.json (6 expressions)
  pose-data/*.json       the pose library (pointing, thinking, celebrating, warning, explaining-with-board, holding-checklist)
  scenes/*.svg           chapter scenes (may embed the rig via <use> or a pasted posed copy)
  sheet.png  poses/*.png  scenes/*.png  anim/*.mp4  anim/*.gif  qa/*.png
```

## rig.svg conventions
- `viewBox="0 0 400 520"`, character centered on x=200, feet at y≈470. Root `<svg id="rig" data-palette="#hex,#hex,#hex,#hex" data-stroke="6">`.
- One top-level `<g data-view="front|three-quarter|side">` per view. Only one view is visible at a time (runtime sets `display`).
- Parts are `<g data-part="<name>" data-pivot="x y">`. Same part names in every view. Required parts:
  `leg-l`, `leg-r`, `torso`, `head`, `arm-l-upper` > `arm-l-lower` > `hand-l`, `arm-r-upper` > `arm-r-lower` > `hand-r`, `props`.
  `-l`/`-r` = viewer's left/right. Lower arm is nested in upper arm, hand in lower arm, so rotations chain.
- Pivots: shoulder for upper arm, elbow for lower arm, wrist for hand, hip for legs, neck for head, hip-center for torso.
- The main head shape carries `data-shape="head-base"` and the main body shape `data-shape="torso-base"`. `consistency.mjs` measures these two in every pose.
- Limb tube paths carry `data-tube="outer"` / `data-tube="inner"` (see Style).
- Face lives inside `head`: `<g data-face="eyes">`, `<g data-face="brows">`, `<g data-face="mouth">`. Each holds state children `<g data-state="...">`, one visible at a time.
  - eyes: `open`, `half`, `closed`
  - brows: `neutral`, `up`, `worried`, `determined`
  - mouth: `neutral`, `smile`, `talk-a`, `talk-e`, `talk-o`, `worried`
- Props are `<g data-prop="<name>">` inside `props` (e.g. `board`, `checklist`, `coin`), hidden unless a pose lists them. A prop that a hand holds goes inside that hand's group so it follows the arm.
- Style: flat fills from the palette only, `stroke` = palette ink, one `stroke-width` (the `data-stroke` value), `stroke-linecap="round" stroke-linejoin="round"`. No gradients, filters, opacity tricks or text in the rig.
- Limbs as outlined tubes: two stacked strokes on the same path (ink at width W+2·stroke, fill color at width W). Line weight stays identical at any rotation.

## pose-data JSON
```json
{
  "view": "front",
  "gaze": "right",
  "parts": {
    "arm-r-upper": { "rotate": -95 },
    "arm-r-lower": { "rotate": -10 },
    "head": { "rotate": 6, "translate": [0, -2] },
    "torso": { "scaleY": 1.0 }
  },
  "face": { "eyes": "open", "brows": "up", "mouth": "smile" },
  "props": ["board"]
}
```
- Angles in degrees, SVG convention: positive = clockwise on screen. Arms hang down at 0. Right arm pointing right ≈ -90; left arm pointing left ≈ +90.
- `gaze` = the side the character faces/points to. Layout puts the pose on the opposite side of the content so it faces it.
- Omitted parts stay at rest. Never scale a part except `torso.scaleY` within 0.98–1.03 (breathing).

## Runtime and render commands
`scripts/character/rig-runtime.js` (browser) exposes `PF.applyPose(svg, pose)`, `PF.lerpPose(a, b, t)`, `PF.ease.*`, `PF.spring(t, opts)`, `PF.blinkAt(t, schedule)`.

| Output | Command |
|---|---|
| sheet.png (3 views + 6 expressions) | `node scripts/character/render-sheet.mjs projects/<slug>` |
| poses/*.png + scenes/*.png (2x, transparent) | `node scripts/character/render-poses.mjs projects/<slug>` |
| consistency report | `node scripts/character/consistency.mjs projects/<slug>` |
| animation MP4 + GIF + QA frames | `node scripts/character/render-anim.mjs <page.html> <out-base> [--fps 30 --w 1920 --h 1080]` |

Animation pages: plain HTML that defines `window.DURATION` (seconds) and `window.seek(t)`. The renderer injects `window.PF_RIG` (rig.svg text) and `window.PF_POSES` (all pose JSON by name) and loads `rig-runtime.js` before page scripts run. Every visible property must be a pure function of `t`: no timers, no `Date.now()`, no unseeded random.

## Consistency checklist (run before any layout or delivery)
1. `consistency.mjs` passes: only palette colors, one stroke width, head and torso size within 1% of rest in every pose.
2. Read `sheet.png`: the 3 views share head size, body height, color placement and features.
3. Read every pose PNG next to the sheet: same proportions, no missing part, hands attached, face state valid.
4. Animations: read `qa/<clip>-{start,mid,end}.png`; the character matches the sheet in all three; loops end on frame 0's pose.
5. Originality: no resemblance to a known character, mascot or brand figure (see `brief.md`).
Any drift: fix the rig or the pose data, never patch a single PNG.
