---
description: Set up the current folder as a PocketForge workspace (copies scripts, CLAUDE.md and package.json, installs local dependencies)
---

Set up this folder as a PocketForge workspace. The plugin lives at `${CLAUDE_PLUGIN_ROOT}`.

1. Copy into the current working directory, without overwriting files that already exist (ask the user before overwriting any):
   - `${CLAUDE_PLUGIN_ROOT}/scripts/` → `./scripts/`
   - `${CLAUDE_PLUGIN_ROOT}/package.json` → `./package.json`
   - `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.md` → `./CLAUDE.md`
   - `${CLAUDE_PLUGIN_ROOT}/templates/project/book.example.json` → `./templates/book.example.json`
   Create an empty `./projects/` folder.
2. Run `npm install` (local devDependencies only, nothing global). Then `npx playwright install chromium` if Google Chrome is not installed.
3. Check Python 3 with Pillow and pypdf (`python -c "import PIL, pypdf"`). If missing, tell the user to run `pip install pillow pypdf` (ask before installing).
4. Run `npm test` and report the result.
5. Report which optional tools are connected: Firecrawl MCP (required for research), Canva MCP (optional), `higgsfield` CLI (optional).
6. Tell the user the next step: `/pocketforge:forge "<skill or AUTO>"`.
