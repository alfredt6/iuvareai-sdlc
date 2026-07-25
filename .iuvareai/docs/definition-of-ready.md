---
type: Methodology
title: "Definition of Ready"
description: "The 9-point startability checklist a story must pass before Phase 3, enforced by CI."
tags: [methodology, dor]
timestamp: 2026-07-04
doc: definition-of-ready
version: 1.1.0
status: active
last_updated: 2026-07-25
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

1. **`status` is one of the legal state-machine values.** Transition history is
   enforced by the Orchestrator; the static DoR check cannot infer prior state.
   *Why:* a story can't be worked if its state is ambiguous or illegal.
2. **`contract_version` major matches the current `DATAMODEL_CONTRACT.md` major.**
   *Why:* a shard built against an outdated schema generates wrong code silently.
   This is the crown-jewel check (see §5.4).
3. **Every `inputs` path is safe, repository-relative, and exists.** For Delta,
   every existing `src/`/`tests/` file being modified is listed in `inputs` as
   well as `expected_outputs`.
   *Why:* you can't modify a file that isn't in the context packet; missing inputs
   mean the shard is stale, sourceless, or out of order.
4. **`expected_outputs` is a non-empty list of normalized repository-relative paths.**
   *Why:* target files must be known up front — for context containment, review,
   and clean reversion.
5. **`test_criteria` is a non-empty list of statements; Gate 2 confirms each is
   actually *testable*.** The script validates structure, not semantic sufficiency.
   *Why:* "should be fast" isn't testable; "p95 < 200ms" is. Untestable criteria
   can never be verified — the story can never reach `done`.
6. **Every `depends_on` story is `done`.**
   *Why:* sequencing. Building on an unfinished dependency produces phantom bugs.
7. **`track` is a legal value; Gate 2 confirms it matches the work's risk level.**
   *Why:* track determines which gates and pipeline apply.
8. **(Delta only) `delta_type` is valid and `contract_touched` is boolean.**
   *Why:* `delta_type` decides regression strategy; `contract_touched: true`
   forces a semver bump.
9. **The shard names one `implementer`, and every output fits that authority's
   `writes_to`.** A human Conductor action requires a reason; repository-root
   work also classifies `bootstrap` explicitly. `bootstrap: true` is Genesis-only,
   while later root maintenance uses `bootstrap: false`.
   *Why:* a perfectly shaped story is still un-startable when its assignee cannot
   create the declared files. All outputs must fit one implementer; matching
   unrelated outputs to unrelated personas does not make a routable shard.

## How it's enforced
DoR is **not** a human opinion — it's a **CI job** (`dor-check`, see `ci.md` §3)
that runs on PR open/push and parses the shard frontmatter. The canonical script
(`scripts/dor-check.mjs`) performs the structural portions of all nine checks,
loads permission sets directly from persona frontmatter, and reports **all**
failing rules in one run. Gate 2 remains accountable for semantic testability,
risk-track correctness, and output sufficiency.

DoR must be **green at PR-open time** and re-runs on every push.

## Worked examples

**✅ Ready — `001.003.user-login-rate-limiting.md`:**
```
contract_version: "1.4.0"     # contract is currently 1.4.2 → major 1 ✓
status: ready
implementer: developer         # immutable implementation authority ✓
inputs: [src/auth/login.ts]    # exists ✓
expected_outputs: [src/auth/rate_limiter.ts]
test_criteria:
  - "5 failed attempts within 60s locks for 15 min"   # testable ✓
  - "lockout persists across restarts"                # testable ✓
depends_on: [001.002]          # 001.002 is 'done' ✓
track: blueprint
```
All nine pass → eligible for Phase 3.

**❌ Not ready — same shard, broken:**
- `contract_version: "1.4.0"` but contract is now `2.0.0` → **fails #2**
  (major mismatch) → flagged `stale`.
- `test_criteria: ["should be secure"]` → **fails human Gate 2 under #5**
  (the structural script cannot infer semantic testability).
- `depends_on: [001.002]` but `001.002` is still `in_progress` → **fails #6**.

## What happens on failure
A DoR failure blocks assignment without consuming a Developer run: the story
**returns to (or stays in) `draft`** and cannot be assigned. The Orchestrator
routes it back to the Product Owner to fix the shard (or, if the contract moved,
to re-ready it). **DoR failure is a signal about the *spec*, not the code.**

## Why this gate exists (the framework's own thesis)
v2's thesis was "discipline upstream so debt isn't amplified at machine speed" —
but v2 only disciplined *code*, leaving specs to a human sign-off. DoR is the
cheap, automatable gate that makes that thesis actually hold: **bad specs stop
here, before they become bad code at machine speed.**
