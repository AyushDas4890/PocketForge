---
name: anti-slop-writing
description: Voice rules, banned list, before/after rewrites and the "specific > generic" checklist for PocketForge manuscripts. Use before writing, revising or critiquing any chapter, blurb or listing copy.
invoke: anti-slop-writing
---

# Anti-slop writing

The reader paid for this book because a free blog post was not specific enough. Every sentence must earn its place with a fact, a step, or a decision the reader can make.

## Voice
- Second person, present tense, active voice. "Move the rent money first," not "Rent money should be moved."
- One idea per sentence. Average 14–18 words. Vary length; never three long sentences in a row.
- Plain words: use, help, start, cost, need. Not utilize, facilitate, commence, leverage.
- Concrete nouns: "the electricity bill due on the 15th," not "your financial obligations."
- Confidence comes from sources, not adjectives. Cut "incredibly", "truly", "powerful", "robust".
- Examples are labelled hypothetical ("Say you earn $3,000 a month…") unless they come from research with a footnote.

## Banned (gate-enforced, zero hits)
delve, unlock, game-changer, landscape, seamless, "in today's fast-paced world", "it's important to note", "in conclusion", "harness the power".

## Also avoid (critic flags these)
- Openers: "Have you ever wondered…", "Imagine a world…", "Let's dive in", "Picture this".
- Fake balance: "Whether you're X or Y…". Empty triads: "simple, effective, and powerful".
- Hedge stacks: "may potentially help to some extent".
- Summary paragraphs that restate the chapter. End on the next action instead.
- "Journey", "navigate", "empower", "elevate", "robust", "crucial", "tapestry", "realm", "embark", "cutting-edge", "revolutionize".
- Rhetorical questions as section transitions.
- Em-dash chains. One em dash per paragraph at most.

## Specific > generic checklist
For every paragraph ask:
1. Does it contain a number, a named thing, a date, a step, or a quote? If none, rewrite or cut.
2. Could this sentence appear unchanged in a book on a different topic? If yes, it is generic. Replace it.
3. Is the claim sourced in this chapter's research files? If not, cut it.
4. Does the reader know what to do after reading it? If not, add the action.
5. Is the example tied to the pocket's WHO (e.g. single-income household), not "people"?

## Before / after
| Before (slop) | After (specific) |
|---|---|
| In today's fast-paced world, managing money can feel overwhelming. | One paycheck, four bills due before the 10th: that's the month this chapter fixes. |
| It's important to note that emergencies happen. | Car repairs are the expense readers in our gap research mention most.[^3] Plan for one per year. |
| Budgeting is a powerful tool that can unlock financial freedom. | A budget tells each dollar where to go before the paycheck lands. |
| Many experts agree that saving is crucial. | The Federal Reserve found 37% of adults could not cover a $400 expense with cash.[^4] |
| In conclusion, these strategies can help you on your journey. | Fill in the worksheet on page 42 before your next payday. |

(The footnoted figures above are format examples only. Writers use figures from their own research files.)

## Self-check before saving
Run `node scripts/gates/run-all.mjs <file>`, then reread the first and last paragraph against the checklist. Openers and closers are where slop hides.
