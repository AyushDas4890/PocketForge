---
name: ebook-structure
description: Chapter template, worksheet patterns, endnote format, front/back matter order and the [POSE]/[SCENE] slot rules for PocketForge eBooks. Use when outlining, writing, critiquing or laying out a book.
invoke: ebook-structure
---

# eBook structure

Defaults below come from common patterns in practical self-help/how-to eBooks. After Phase 5 of each project, `benchmarks.md` overrides the numbers (page count, worksheets per chapter, visual density) with that niche's medians. Write the overrides at the top of `outline.md`.

## Book order
1. Cover · 2. Title page · 3. Copyright + disclaimer (required for health, legal, finance) · 4. Contents · 5. How to use this book (1 page: who it's for, how worksheets work, meet the mascot) · 6. Chapters · 7. Next steps (1 page) · 8. Endnotes · 9. Credits (from `assets/credits.md`) · 10. About.

## Chapter template (`manuscript/chNN.md`)
```markdown
# Chapter N: <Title, outcome-first>
[POSE:<pose>]            <!-- opener pose, facing the title -->
> <Goal line: after this chapter you can …>

<Hook: 2–4 sentences on the specific problem, using a gap quote or sourced figure>

## <Framework name>
<What it is in one sentence>
[SCENE:<mascot demonstrating the framework>]
### Step 1: …  (one H3 per step, each with an action)

![<What the chart shows>](../assets/figures/chNN-<name>.png)
*<Caption: the one thing the reader should learn from the figure.>*

> **Tip** [POSE:<pose>] <one specific tip>

:::worksheet <Worksheet title>
[POSE:holding-checklist]
<fields>
:::

## Your next move
<One action with a deadline, e.g. "before your next payday">

[^1]: <Source title>, <URL>, fetched <YYYY-MM-DD>. (research/<file>.md)
```
Length: 2,000–3,500 words per chapter unless `benchmarks.md` says otherwise.

## Worksheet patterns
Pick the one that fits the framework:
- **Fill-in table**: rows = items, columns = amount / date / owner. Use `| Item | Amount | Due |` with blank cells.
- **Checklist**: 5–10 `- [ ]` items, each a concrete action.
- **Decision tree**: "If … then go to …" lines, max 3 levels.
- **Tracker**: 4-week or 12-month grid.
- **Prompt page**: 3–5 questions with writing space (`________`).
Every worksheet: title, one-line instruction, fields. No worksheet without a framework it serves.

## Pose and scene slots
Poses: `pointing`, `thinking`, `celebrating`, `warning`, `explaining-with-board`, `holding-checklist`.
- Chapter opener: one pose, gaze toward the title.
- Every worksheet: `holding-checklist` or `pointing` at the worksheet.
- Every key tip: `pointing` (advice), `warning` (pitfall), `celebrating` (milestone), `thinking` (decision).
- `[SCENE:...]`: describe the mascot doing the framework ("sorts coins into 4 labelled jars: Bills, Buffer, Goals, Free"). One per chapter minimum.
- Rule: the mascot points at, reacts to, or explains the content beside it. A slot that relates to nothing gets cut.
- Layout places the pose on the side its `gaze` faces the content (pose-data `gaze: left|right`).

## Footnotes and endnotes
- In text: `[^n]` right after the sentence's period. Numbering restarts per chapter in drafts; `layout` renumbers book-wide.
- Definition format: `[^n]: <Source title>, <URL>, fetched <YYYY-MM-DD>. (research/<file>.md)`. Vendor sources add "vendor-reported".
- `99-endnotes.md`: grouped by chapter, book-wide numbers, same format.

## Figures
Charts and diagrams: data only from research files, rendered by `scripts/figures/chart.mjs` to `assets/figures/`. Each figure has a caption with the takeaway and a footnote to its data source. No decorative images.
