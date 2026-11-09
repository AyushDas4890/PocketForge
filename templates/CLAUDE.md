# PocketForge

Pipeline: skill seed → 20 ranked Profitable Pockets → transformation map → competitor benchmark → outline → manuscript → mascot → poses, scenes, animations → cover → layout → PDF + animation pack.

Everything runs inside Claude Code: subagents, skills, slash commands, MCP servers, hooks. No Anthropic API key. No custom LLM code. Higgsfield (optional) may be used for cover art, chapter-opening illustrations and promo images only, via `node scripts/extras/hf-art.mjs`. Never for fake people endorsing the book (no AI-influencer testimonials). No text or stats baked into generated images.

## Entry points

| Command | Does |
|---|---|
| `/forge "<skill or AUTO>"` | Full pipeline, 4 approval stops |
| `/pockets "<seed>"` | Research + 20 ranked pockets only |
| `/book <slug>` | Resume from an approved outline |
| `/animate <slug>` | Rebuild character animations only |

## Hard stops (wait for the user, never auto-continue)

1. After `pockets.md`: user picks one pocket.
2. After `outline.md`: user approves title and TOC.
3. After `assets/character/sheet.png`: user approves the mascot.
4. After 3 cover options: user picks one.

Record each approval in `projects/<slug>/approvals.md` (date, stop, choice, user's words). `/book` and `/animate` read it to know where to resume.

## Phase banner

After each phase print exactly one line: `✅ Phase N: <one-line result>`.

Phases: 0 skill check · 1 research · 2 gap mining · 3 pockets (STOP) · 4 transformation map · 5 benchmark · 6 outline (STOP) · 7 manuscript · 8 character sheet (STOP) · 9 poses + scenes · 10 animations · 11 brand + cover (STOP) · 12 layout · 13 export + extras.

## Truth rules

- NEVER fabricate stats, testimonials, case studies, names, quotes or credentials. Unsourced claim: cut it.
- All web research goes through the Firecrawl MCP (`firecrawl_search`, `firecrawl_scrape`, `firecrawl_map`, `firecrawl_extract`). No other web tool for research.
- Every file in `research/` starts with line 1: `Source: <URL> | Fetched: <YYYY-MM-DD>`.
- Prefer primary sources (government, associations, peer-reviewed). Mark vendor-blog figures "vendor-reported".
- Health, legal and finance niches get a disclaimer page automatically.
- Benchmarks record patterns only. Never copy competitor text, titles, covers or art.

## Writing rules

- Load the `anti-slop-writing` and `ebook-structure` skills before writing or critiquing any chapter.
- Writers use ONLY their chapter's research files. Every stat gets a `[^n]` footnote that resolves to a URL in `research/`.
- Mark illustration slots as `[POSE:<name>]` and `[SCENE:<description>]`. Worksheets go in `:::worksheet` ... `:::` blocks.
- Writers run in parallel, max 3 at a time. The critic is always a fresh subagent, never the writer. Max 2 revision loops per chapter, then flag to the user.
- Banned phrases (enforced by `scripts/gates/banned.mjs`): delve, unlock, game-changer, landscape, seamless, "in today's fast-paced world", "it's important to note", "in conclusion", "harness the power".

## Gates

`scripts/gates/` holds `citations.mjs`, `banned.mjs`, `structure.mjs`. The PostToolUse hook in `hooks/hooks.json` (Claude Code plugin; other agents run the gates by hand) runs all three after every Write/Edit under `projects/*/manuscript/` and feeds failures back. A chapter is done only when all three pass AND the critic signs off. Run by hand: `node scripts/gates/run-all.mjs <chapter.md>`. Tests: `npm test`.

## Images

Allowed only: the code-built mascot, Canva-generated art, Higgsfield art (optional, see above), script-rendered charts/diagrams, royalty-free photos with license logged in `assets/credits.md`. No decorative images that carry no information. No text baked into generated images.

## Mascot

One original mascot per book, a guide character. Load the `mascot-rig` skill before touching it. Layered SVG rig, flat vector, 3–4 palette colors from `brand.md`, one line weight. No resemblance to any known character, mascot or brand figure. Every placement points at, reacts to or explains the content beside it. No floating mascots. Consistency check (proportions, colors, line weight) across every pose and animation frame sample before layout.

Render stack (local devDependencies, nothing global):
- Stills: `@resvg/resvg-js` (SVG → PNG at 2x, transparent).
- Animations: deterministic `seek(t)` HTML pages rendered frame by frame with Playwright + `ffmpeg-static` (`scripts/character/render-anim.mjs`). Multi-scene clips (framework explainers, promo) use HyperFrames (`npx hyperframes`) under the `motion-doctrine` seam law.
- Output: MP4 1080p H.264 + GIF ≤ 8 MB.

## Canva

Canva is optional and runs through a Canva MCP connector (for example the claude.ai Canva connector). Its tool prefix differs per install; the `designer` and `layout` agents inherit all tools, so no prefix needs to be configured. If no Canva tools are available, skip Canva and use the HTML fallback. Any Canva generation outside a `/forge` or `/book` run needs the user's OK first. Layout fallback after 2 Canva failures: HTML + print CSS → Playwright PDF (`scripts/layout/html-to-pdf.mjs`).

## Folder conventions

```
projects/<slug>/
  approvals.md  research/  pockets.md  transformation.md  benchmarks.md
  outline.md  brand.md  manuscript/ch01.md …  assets/  output/  cost-log.md
```
- `book.json`: title, subtitle, author, mascot, blurb, listing and art prompts. Every layout script reads it. Start from `templates/project/book.example.json`.
- `<slug>`: kebab-case from the chosen pocket, max 40 chars.
- `assets/character/{rig.svg, pose-data/*.json, sheet.png, poses/*.png, scenes/*.png, anim/*.mp4, anim/*.gif, qa/}`
- `cost-log.md`: one line per phase: phase, Firecrawl calls made, Canva calls made, subagents used.
- Final deliverables in `output/`: `ebook.pdf`, `cover.png`, `mockup.png`, `listing-*.png`, `anim/` (MP4 + GIF), `README.md` with a 3-line sales blurb and a price suggested from `benchmarks.md`.

## Boundaries

- Global skills in `~/.claude/skills` and `~/.agents/skills` are read-only. Reference them by name. Never copy or edit them.
- Ask before: global installs, editing global Claude settings, adding MCP servers, deleting files.
- Same step fails 3 times: stop, report the shortest decisive error line.
- No web UI, auth, payments or course generator. The web edition of the book is built only if the user asks.
