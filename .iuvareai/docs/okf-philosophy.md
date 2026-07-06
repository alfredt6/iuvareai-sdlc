---
type: Methodology
title: "OKF Philosophy — Why a Format, Not Docs"
description: "The mental model behind adopting OKF: knowledge as an operable substrate, not passive documentation."
tags: [methodology, okf, philosophy]
timestamp: 2026-07-04
---

# OKF Philosophy — Why a Format, Not Docs

A common misconception: *"OKF is just documentation for LLMs that grows over time."*
That's traditional documentation, digitized for AI. OKF is something else.

## Documentation vs. Knowledge
Every project has three artifact types — don't confuse them:

| Layer | What it is | Who uses it | Status |
|---|---|---|---|
| **Code** | Executable instructions | Machine (runs it) | First-class |
| **Documentation** (traditional) | Prose humans read to understand the code | Human | Passive, often stale, separate from the workflow |
| **Knowledge** (OKF) | Context + metadata + curated insight, structured so humans **and** agents read **and operate on** it | Human **and** agent | First-class, in git, drives behavior |

> **Docs describe the software. In an agent SDLC, the knowledge bundle *is* part of the software's control system.**

Analogy: traditional docs are a *map* a tourist reads. OKF is the *GPS a self-driving car operates on* — same geography, but structured (lanes, turns, live traffic) so a machine can drive from it, not just admire it.

## The four ideas that make OKF "more than docs"

1. **Format, not platform.** The value is *interoperability*, not a tool. As HTML lets any browser read any page, OKF lets any producer's knowledge be read by any consumer. (This is why the bundle works on Pi, Codex, or Claude Code unchanged.)
2. **Producer/consumer independence.** Who writes and who reads are decoupled. Knowledge outlives every tool that touches it.
3. **Living wiki.** LLMs don't get bored and can touch 15 files in one pass — the bookkeeping that makes humans abandon wikis is exactly what agents are good at. So the bundle *stays current* because agents maintain it. (Karpathy's LLM-wiki insight, formalized.)
4. **Progressive disclosure.** `index.md` manifests let an agent see what exists (titles + descriptions) before loading full docs — a built-in mechanism for respecting context/token budgets.

## In one line
**Plain docs are for reading; OKF is for operating on.** That shift — from *describe* to *drive* — is the entire reason it's worth adopting.

## DO
- Treat the bundle as **read-AND-write** — personas write into it, the Orchestrator reads it, CI validates it, gates depend on it.
- Use `type` for routing/filtering; `resource` to bind concepts to real assets (link, don't duplicate).
- Use cross-links to make the folder a **traversable graph**.
- Let **agents maintain** it; **version it in git** as the source of truth.

## DON'T
- Don't treat it as static docs authored once.
- Don't dump everything in one giant file (kills progressive disclosure).
- Don't put **data/logs** in it (`sessions/*.jsonl`, `metrics/*.jsonl` are the *data layer*, excluded by design).
- Don't **over-specify** — OKF is deliberately minimal (one required field); extend freely, require rarely.
- Don't **duplicate** knowledge that lives in the code or a real catalog — point to it.

## Where OKF sits in Iuvare
The `.iuvareai/` bundle is the SDLC's **nervous system**, not a side document:
personas *write* knowledge → the Orchestrator *reads* it to sequence work → CI
*validates* it → gates *depend* on it → agents *traverse* it as a graph. It evolves
as a first-class participant driving development — which is why an agent-driven
SDLC needs OKF where a human-driven one could survive on a wiki.
