# PocketForge — instructions for any AI coding agent

This file is read by Codex, Google Antigravity, Cursor, GitHub Copilot, Windsurf, Gemini CLI (via `GEMINI.md`), Amp, Jules and other agents that support `AGENTS.md`. Claude Code users can install the plugin instead (see README).

PocketForge turns a skill or niche into a sourced, illustrated ebook. The pipeline is plain files plus Node/Python scripts, so any agent that can read files and run shell commands can run it.

## Read first

1. `templates/CLAUDE.md`: the full rule book (phases, hard stops, truth rules, writing rules, gates, images, mascot, folder layout). Treat it as binding, whatever its filename says.
2. `skills/*/SKILL.md`: load the relevant skill before its task:
   - `anti-slop-writing`: before writing or critiquing any chapter, blurb or listing.
   - `ebook-structure`: before outlining, writing or laying out.
   - `mascot-rig`: before building, posing or animating the mascot.
3. `agents/*.md`: role playbooks (researcher, gap-miner, pocket-scorer, benchmarker, outliner, writer, critic, character-designer, animator, designer, layout). If your tool has no subagents, play each role yourself in order, and start a **fresh context or chat** for the critic role so the writer never grades its own chapter.
4. `commands/*.md`: the entry points. `forge.md` is the full pipeline; `pockets.md`, `book.md` and `animate.md` are partial runs. Follow them as checklists.

## Setup (once per workspace)

```bash
npm install                       # playwright, resvg, ffmpeg-static, hyperframes (local only)
pip install pillow pypdf pymupdf  # EPUB build and PDF checks
npm test                          # gate tests must pass
```

Web research needs a Firecrawl MCP server (or another search/scrape tool you configure; every research file must still start with `Source: <URL> | Fetched: <YYYY-MM-DD>`). Canva and Higgsfield are optional.

## Phases (stop where marked and wait for the user)

0 skill check · 1 research · 2 gap mining · 3 pockets (**STOP**: user picks one) · 4 transformation map · 5 benchmark · 6 outline (**STOP**: approve title + TOC) · 7 manuscript · 8 character sheet (**STOP**: approve mascot) · 9 poses + scenes · 10 animations · 11 brand + cover (**STOP**: pick a cover) · 12 layout · 13 export + extras.

Record each approval in `projects/<slug>/approvals.md`. Print `✅ Phase N: <result>` after each phase.

## Non-negotiables

- Never invent stats, quotes, testimonials, names or credentials. Every stat gets a `[^n]` footnote that resolves to a URL on line 1 of a file in `projects/<slug>/research/`.
- After writing or editing `projects/<slug>/manuscript/chNN.md`, run `node scripts/gates/run-all.mjs <file>`. A chapter is done only when all gates pass and a fresh critic passes it. (Claude Code runs this automatically through a hook; other agents must run it by hand.)
- Hypothetical math goes in `:::example` blocks; worksheets in `:::worksheet` blocks.
- Health, legal and finance books get a disclaimer page.
- Ask before global installs, deleting files, or adding MCP servers.

## Build commands (per project)

```bash
node scripts/layout/compose-cover.mjs projects/<slug>        # needs assets/higgsfield/cover.png
node scripts/layout/html-to-pdf.mjs projects/<slug>          # output/ebook.pdf + book.html
NO_COVER=1 PAGE_W_IN=6 PDF_OUT=paperback-interior.pdf node scripts/layout/html-to-pdf.mjs projects/<slug>
node scripts/layout/paperback-cover.mjs projects/<slug> <pages> [color|white]
python scripts/layout/build-epub.py projects/<slug>
node scripts/extras/worksheet-pack.mjs projects/<slug>
node scripts/extras/build-extras.mjs projects/<slug>         # mockup + listing images
node scripts/extras/hf-art.mjs projects/<slug>               # optional Higgsfield art
```

Book metadata (title, author, mascot, blurb, listing copy, art prompts) lives in `projects/<slug>/book.json`; copy `templates/project/book.example.json` to start.
