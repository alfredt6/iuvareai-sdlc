---
type: Methodology
title: "Story State Machine"
description: "The 8 story states, legal transitions, and single-writer rule."
tags: [methodology, state-machine]
timestamp: 2026-07-04
doc: state-machine
version: 1.0.0
status: active
last_updated: 2026-07-03
audience: [orchestrator, all personas]
references: ["SDLC v3 §9", "VCS branch lifecycle (vcs.md §7)", "CI state transitions (ci.md §10)"]
---

# Story State Machine

## Purpose
Make a story's lifecycle **deterministic**: at any moment you can point at a
story and know exactly where it is, who owns it, and what may happen next.
Without this, two agents grab the same story, interrupted work is unrecoverable,
and "is this done?" becomes a guess.

> **Analogy: a Kanban board with enforced rules.** Cards (stories) move across
> columns (states), but you can't drag them freely — each move has a *condition*
> and only the **Orchestrator** may make it. Think of it as an approval workflow
> (like an RFC or a purchase order), not a sticky-note free-for-all.

## The eight states

```
draft → ready → in_progress → review → qa → done
                    ↑            ↑        ↓
                    └────────────┘    blocked
                                              ↘ stale (auto, on MAJOR contract bump)
```

| State | Meaning |
|---|---|
| `draft` | Shard exists but isn't startable yet (DoR not passed). |
| `ready` | DoR green; eligible to be assigned. |
| `in_progress` | An owner is implementing it. Exactly one owner. |
| `review` | PR open; Gate 3 (human diff review) pending. |
| `qa` | Gate 3 approved; QA/CI verifying. |
| `done` | DoD met (tests green, Gate 3 recorded, merged). Deployable. |
| `blocked` | Self-healing exhausted (3/3) or otherwise stuck; needs remediation. |
| `stale` | A MAJOR contract bump invalidated the cited `contract_version`. |

## Legal transitions

| From | To | Trigger | Owner |
|---|---|---|---|
| `draft` | `ready` | DoR passes (CI) | Orchestrator |
| `ready` | `in_progress` | Owner assigned | Orchestrator |
| `in_progress` | `review` | Implementation complete, PR opened | Developer |
| `review` | `qa` | Gate 3 approved | Code Reviewer / human |
| `review` | `in_progress` | Rejected (≤ 2 cycles) | Code Reviewer |
| `qa` | `done` | Tests green + DoD met | QA / Orchestrator |
| `qa` | `blocked` | Self-heal exhausted (3/3) | QA |
| `blocked` | `in_progress` | Remediated | Release Manager |
| *any pre-`done`* | `stale` | MAJOR contract bump (auto) | CI (automatic) |
| `stale` | `draft` | Re-readied against new contract | Orchestrator |

**No transition skips a gate.** `ready → done` is impossible; you cannot merge
unreviewed work.

## Who owns transitions
**Only the Orchestrator writes status transitions** — with two exceptions:
- `stale` is **automatic** (CI flags it on a MAJOR contract bump).
- `review` ↔ `in_progress` and `qa` ↔ `done`/`blocked` are **driven by verdicts**
  (Code Reviewer's approve/reject, QA's pass/fail), but the Orchestrator records
  the resulting state.

This single-writer rule is what prevents two agents from holding the same
`in_progress` story.

## Edge cases

**`stale` (the safety net for moving schemas).** When `DATAMODEL_CONTRACT.md`
takes a MAJOR bump, CI's **contract-guard** finds every open shard whose
`contract_version` major no longer matches and flips it to `stale`. A stale
story **cannot be merged**; it must be re-readied (→ `draft`) against the new
contract or abandoned. This is the mechanism that stops a story from silently
generating code against an outdated schema.

**`blocked` (the fail-stop).** When the self-healing loop exhausts its 3
attempts, the story moves to `blocked` and escalates to the Release Manager with
the **full** attempt history. It returns to `in_progress` only after
remediation — never by silently retrying.

## How the state machine ties to git and CI

**Git (`vcs.md` §7):** the branch is the physical shadow of the state.
- `ready → in_progress` ⇒ branch `story/{epic}.{story}-...` created.
- `review` ⇒ PR open against `main`.
- `done` ⇒ squash-merged; branch deleted.

**CI (`ci.md` §10):** CI outcomes *drive* state, not the reverse.
- `dor-check` fails ⇒ stays/returns to `draft`.
- `quality` fails ⇒ stays `in_progress`.
- `contract-guard` flags ⇒ → `stale`.
- Regression/integration fails post-merge ⇒ **do not deploy**; open a Delta `fix`.
- Prod regression ⇒ auto-rollback; story re-opens as a `fix` delta.

## Rules summary
- One writer (Orchestrator) for status; single owner per `in_progress` story.
- No gate may be skipped.
- `stale` is automatic; `blocked` escalates; both require human/Orchestrator
  action to clear.
- `done` is irreversible for that shard — the next change is a new Delta.
