---
type: Methodology
title: "Loop Engineering — How Iuvare Adopts Agent Loops"
description: "How the Iuvare SDLC adopts loop engineering in a bounded, governed way: fresh-context loops yes, infinite loops no."
tags: [methodology, loop-engineering, agents]
timestamp: 2026-07-08
---

# Loop Engineering — How Iuvare Adopts Agent Loops

## The idea
**Loop engineering** is the shift from *prompting* an agent to *designing the
system that prompts the agent.* You define a goal; the system finds work, hands
it out, checks it, records progress, and repeats — poking agents on a cadence or
until a verifiable condition holds. (Anthropic's Boris Cherny: *"I don't prompt
Claude anymore. I have loops that prompt Claude."*)

A loop has **five pieces + one memory**:

1. **Automations** — scheduled discovery/triage; `/loop` on a cadence; `/goal` =
   run until a *verifiable* condition holds, judged by a *separate* model.
2. **Worktrees** — isolate parallel agents so they don't collide.
3. **Skills** — codify project knowledge so it isn't re-derived every run.
4. **Connectors (MCP)** — let the loop *act* (open PRs, update tickets, ping).
5. **Sub-agents** — split **maker from checker** (the model that wrote the code
   grades itself too leniently).
6. **Memory** — state *outside* the conversation. *"The agent forgets; the repo
   doesn't."*

The **Ralph loop** is the minimal extreme: one fixed prompt in an infinite loop,
fresh context per iteration, converging toward a spec — simple, but at
**significant token cost**.

## Iuvare's stance: bounded loops, never infinite
Iuvare is already a **governed, bounded** form of loop engineering. We adopt the
*primitives* — **but never unbounded loops.** Two reasons:

- **Token cost.** Fresh-context-per-iteration (the Ralph loop) is expensive. On
  a subscription with 5-hour/weekly windows and peak multipliers, an infinite
  loop can drain a whole window on one stuck task (see [budget.md](../policies/budget.md)).
- **Correctness.** A loop running unattended is also making mistakes unattended.
  Human gates exist precisely because *"verification is still on you."*

So: **fresh-context-per-story = yes; bounded `/goal`-until-verifiable = yes;
infinite/unattended loops = no.**

## The six primitives, mapped to Iuvare

| Primitive | Iuvare today | Status |
|---|---|---|
| **Memory (external state)** | the `.iuvareai/` OKF bundle + the [state machine](state-machine.md) | ✅ the loop's spine |
| **Skills** | the personas, loaded on demand | ✅ |
| **Fresh context per iteration** | the context shield (per story/phase) | ✅ |
| **Maker/checker split** | Developer → Code Reviewer → QA | ⚠️ roles exist; upgrade to isolated sub-agents |
| **Bounded loop** | self-healing (max 3 attempts) | ✅ deliberately bounded |
| **Worktrees / automations / `/goal` / MCP** | — | ❌ adopt below |

## Patterns we adopt

### 1. Bounded Phase-3 development loop (`/goal`-style)
The Developer iterates on a story until its `test_criteria` pass **and** lint is
clean — with an **independent** model (or the QA persona) judging "done," *not*
the one that wrote the code. **Bounds:** capped by the 3-attempt self-heal, the
per-story budget ceiling, and off-peak scheduling. This generalizes the Phase-4
self-healing loop into Phase-3 development.

### 2. Worktrees for parallel stories
When two stories run in Phase 3 at once, each `in_progress` story gets its own
**git worktree** on its story branch, so parallel agents never edit the same
checkout. (Add to [vcs.md](../policies/vcs.md); `pi-subagents` supports
`worktree: true`.)

### 3. Maker/checker sub-agents
Promote Code Reviewer and QA from personas into **isolated sub-agents**
(separate context, optionally a stronger model). Verification the writer can't
bias is the only kind you can trust inside an unattended loop.

### 4. MCP connectors (let the loop act)
Wire MCP so a finished story opens its own PR, links the shard/ticket, and
notifies on green CI — closing the gap between *"here's the fix"* and *"the loop
shipped it."*

### 5. The Orchestrator as an automated loop
The [Orchestrator](../agents/orchestrator.md) persona *is* the loop controller.
The autonomous end-state: a scheduled loop that surveys state → picks the next
`ready` story → assigns → verifies → records → repeats, bounded by the gates a
human still owns.

## Patterns we reject
- **Infinite / unbounded Ralph loops** — token-hungry and prone to thrash; the
  bounds above exist to prevent exactly this.
- **Loops without a maker/checker split** — a loop that grades its own work ships
  its own bugs.
- **"Cognitive surrender"** — letting the loop run so you stop reading what it
  made. Comprehension debt grows faster the smoother the loop gets.

## How it ties together
Loops need **permission boundaries** (the [sandbox](../policies/sandbox.md)
extension), **budgets** ([budget.md](../policies/budget.md)), a **memory**
([state-machine.md](state-machine.md) + the OKF bundle), and a **bounded
self-heal** (SDLC §3, Phase 4). Loop engineering isn't a new layer on top of
Iuvare — it's the *autonomous mode* that Iuvare's guardrails make safe to switch
on, piece by piece.
