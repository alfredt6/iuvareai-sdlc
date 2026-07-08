---
type: ProjectSeed
title: "Project Seed — Raw Intake"
description: "Raw notes and source material for the Analyst to expand into PROJECT_BRIEF.md. Not the brief itself."
tags: [seed, intake, phase-1]
timestamp: 2026-07-08
---

# Project Seed — Raw Intake

> **This is NOT the project brief.** It is raw notes, links, and source material.
> The **Analyst** reads this, asks clarifying questions to fill the gaps, and
> *only then* writes `.iuvareai/specs/PROJECT_BRIEF.md` (Phase 1).

## How to use this file
1. Drop your raw notes, links, and pasted text into the sections below — **don't
   worry about structure or polish**; the Analyst shapes it.
2. If you have separate files (ideas, competitor notes, screenshots, spreadsheets),
   drop them anywhere in the repo and **list their paths** under *Attached source
   files* — the Analyst will read them.
3. When ready, invoke the Analyst with the command at the bottom and **answer its
   questions** before it writes the brief.

## Vision
*(What is this product? A one-sentence elevator pitch.)*


## Problem
*(What problem does it solve? Who suffers without it today?)*


## Target users
*(Primary users? Secondary users? Any distinct segments?)*


## Goals / success
*(What does success look like? Any measurable goals or KPIs?)*


## Scope — in
*(What's definitely in scope for the first version?)*


## Scope — out
*(What's explicitly OUT of scope?)*


## Constraints
*(Timeline, budget, tech stack, regulatory, anything fixed.)*


## Inspiration / competitors / references
*(Links to products you like, competitors, articles, prior art.)*


## Attached source files
*(List repo paths to any docs you've dropped, e.g. `@docs/idea.md`,
`@docs/competitors.md`, `@docs/wireframes.png`. The Analyst will read them.)*


---

## For the Analyst — invocation (run when the user is ready)

```
/skill:analyst
Read .iuvareai/specs/PROJECT_SEED.md and every @-referenced file attached to it.

Do NOT write PROJECT_BRIEF.md yet. First, ask me a numbered list of clarifying
questions to gather anything missing for: market alignment, the primary risks,
in-scope vs. out-of-scope, and target users. Wait for my answers.

Only after I've answered, write .iuvareai/specs/PROJECT_BRIEF.md following your
Phase-1 process (vision, scope, explicit out-of-scope, risks, open questions).
```
