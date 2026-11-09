---
description: Research a skill seed and produce 20 ranked, sourced Profitable Pockets
argument-hint: "<skill seed or AUTO>"
---

Seed: $ARGUMENTS

Follow CLAUDE.md. This command runs Phases 0–3 of the pipeline and ends at STOP 1.

## Phase 0: setup and skill check
1. Make a slug from the seed: kebab-case, max 40 chars, prefixed `pockets-` until a pocket is picked. If the seed is `AUTO`, the researcher picks 3 candidate skill areas from current demand signals and you ask the user which one to use before continuing.
2. Create `projects/<slug>/{research,manuscript,assets,output}` and empty `cost-log.md`, `approvals.md`.
3. Skill check (the `find-skills` role): list the folder names in `~/.claude/skills` and `~/.agents/skills`, drop every `higgsfield-*` entry, and report any skill whose name or description fits the seed niche or the eBook format. Report only. Do not install anything and do not run `npx skills add`.
4. Print `✅ Phase 0: <slug> created, <n> relevant extra skills found`.

## Phase 1: research
Spawn the `researcher` subagent with the seed and slug. It writes 15–40 files to `projects/<slug>/research/`, each with line 1 `Source: <URL> | Fetched: <date>`. Target coverage: market size and spend, audience demographics and income, existing products and prices, communities where the audience talks.
Print `✅ Phase 1: <n> research files from <m> domains`.

## Phase 2: gap mining
Spawn the `gap-miner` subagent with the slug. It writes `research/gaps-*.md` files with verbatim pain quotes, each linked.
Print `✅ Phase 2: <n> verbatim pain quotes across <m> sources`.

## Phase 3: pockets
Spawn the `pocket-scorer` subagent with the slug. It writes `projects/<slug>/pockets.md`: 20 pockets, ranked high to low by weighted score, each score citing at least one research file.
Then verify yourself before showing anything:
- exactly 20 pockets, sorted by score descending;
- every cited research file exists;
- weighted score = 0.25·pain + 0.25·power + 0.20·gap + 0.15·urgency + 0.15·reach (recompute; fix mismatches).

Print `✅ Phase 3: 20 pockets ranked, top = <pocket statement> (<score>)`.
Show the top 5 as a compact table (rank, statement, score, strongest evidence file). Then **STOP** and ask the user to pick a pocket by rank number. Do not continue on your own.
