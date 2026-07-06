---
type: Methodology
title: "Definition of Ready"
description: "The 8-point startability checklist a story must pass before Phase 3, enforced by CI."
tags: [methodology, dor]
timestamp: 2026-07-04
doc: definition-of-ready
version: 1.0.0
status: active
last_updated: 2026-07-03
audience: [product-owner, orchestrator, developer]
references: ["SDLC v3 §8", "Story Schema §7", "CI DoR check (ci.md §3)"]
---

# Definition of Ready (DoR)

## What it is: the "can we even *start*?" gate
The **Definition of Ready** is a machine-checkable checklist a story must pass
**before any agent begins implementation.** It is *not* "is this good?" — it's
"is this even *startable*?" A story that isn't Ready is a waste of an agent run
and a waste of your quota window.

> **Analogy: the pre-flight checklist.** A pilot doesn't take off with a missing
> part or the wrong fuel grade — every box must tick before wheels-up. DoR is the
> pre-flight check; **DoD** (Definition of Done) is the post-flight sign-off.
> Different gates, different ends of the flight.

## DoR vs DoD — don't confuse them

| | Definition of **Ready** | Definition of **Done** |
|---|---|---|
| Asks | Can we *start*? | Are we truly *finished*? |
| When | Before Phase 3 | Before merge/deploy |
| Checked by | CI `dor-check` job | Tests + Gate 3 + merge |
| Failure | Return to `draft` | Stay `in_progress`/`review` |

## The checklist (each item + why)

1. **`status` is set and the transition is legal** (per the state machine).
   *Why:* a story can't be worked if its state is ambiguous or illegal.
2. **`contract_version` major matches the current `DATAMODEL_CONTRACT.md` major.**
   *Why:* a shard built against an outdated schema generates wrong code silently.
   This is the crown-jewel check (see §5.4).
3. **Every `inputs` path exists in the repo.**
   *Why:* you can't modify a file that isn't there; missing inputs mean the shard
   is stale or the epic is out of order.
4. **`expected_outputs` is non-empty.**
   *Why:* target files must be known up front — for context containment, review,
   and clean reversion.
5. **`test_criteria` is non-empty and each entry is *testable*.**
   *Why:* "should be fast" isn't testable; "p95 < 200ms" is. Untestable criteria
   can never be verified — the story can never reach `done`.
6. **Every `depends_on` story is `done`.**
   *Why:* sequencing. Building on an unfinished dependency produces phantom bugs.
7. **`track` is set** (and matches the work's risk level).
   *Why:* track determines which gates and pipeline apply.
8. **(Delta only) `delta_type` and `contract_touched` are set.**
   *Why:* `delta_type` decides regression strategy; `contract_touched: true`
   forces a semver bump.

## How it's enforced
DoR is **not** a human opinion — it's a **CI job** (`dor-check`, see `ci.md` §3)
that runs on PR open/push and parses the shard frontmatter. A reference script
(`scripts/dor-check.mjs`) performs all eight checks and reports the *specific*
failing rule, never a generic "failed."

DoR must be **green at PR-open time** and re-runs on every push.

## Worked examples

**✅ Ready — `001.003.user-login-rate-limiting.md`:**
```
contract_version: "1.4.0"     # contract is currently 1.4.2 → major 1 ✓
status: ready
inputs: [src/auth/login.ts]    # exists ✓
expected_outputs: [src/auth/rate_limiter.ts]
test_criteria:
  - "5 failed attempts within 60s locks for 15 min"   # testable ✓
  - "lockout persists across restarts"                # testable ✓
depends_on: [001.002]          # 001.002 is 'done' ✓
track: blueprint
```
All eight pass → eligible for Phase 3.

**❌ Not ready — same shard, broken:**
- `contract_version: "1.4.0"` but contract is now `2.0.0` → **fails #2**
  (major mismatch) → flagged `stale`.
- `test_criteria: ["should be secure"]` → **fails #5** (not testable).
- `depends_on: [001.002]` but `001.002` is still `in_progress` → **fails #6**.

## What happens on failure
A DoR failure does **not** block the pipeline angrily — it simply means the story
**returns to (or stays in) `draft`** and cannot be assigned. The Orchestrator
routes it back to the Product Owner to fix the shard (or, if the contract moved,
to re-ready it). **DoR failure is a signal about the *spec*, not the code.**

## Why this gate exists (the framework's own thesis)
v2's thesis was "discipline upstream so debt isn't amplified at machine speed" —
but v2 only disciplined *code*, leaving specs to a human sign-off. DoR is the
cheap, automatable gate that makes that thesis actually hold: **bad specs stop
here, before they become bad code at machine speed.**
