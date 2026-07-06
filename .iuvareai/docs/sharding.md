---
type: Methodology
title: "Sharding Methodology"
description: "Atomicity rules, granularity heuristics, the sharding process, and anti-patterns."
tags: [methodology, sharding]
timestamp: 2026-07-04
doc: sharding
version: 1.0.0
status: active
last_updated: 2026-07-03
audience: [product-owner, architect, orchestrator]
references: ["SDLC v3 §10", "Definition of Ready §8", "Contract Versioning §5.4"]
---

# Sharding Methodology

## What sharding is — and why it's the art of the method
**Sharding** is decomposing a PRD into the smallest set of **story shards** that
are each independently *buildable, testable, and revertible*. It is the single
highest-leverage skill in the framework: good shards make Phase 3 run clean; bad
shards guarantee context bloat, scope drift, and merge pain.

> **Analogy:** Sharding is serving a meal as **separate courses**, not one giant
> casserole. Each course is enjoyed (built), judged (tested), and — if it's
> off — sent back (reverted) **on its own**, without ruining the rest of the
> meal. A casserole forces you to commit to the whole thing at once.

## The atomicity principle
**One shard = one verifiable behavior change.** A shard should represent exactly
one thing you can point to and say "this works" or "this is broken." If you
can't, it's two shards hiding as one.

## The seven rules

1. **One shard = one verifiable behavior change.** Two independently-testable
   outcomes ⇒ split. *Smell:* the title has "and" in it.
2. **Independently testable.** A shard's `test_criteria` must pass without
   another shard being done. True sequencing goes in `depends_on`.
3. **File-budget heuristic: ≤ 5 touched files** (excluding tests). Exceeding it
   ⇒ the behavior is probably composite; split or justify. *Smell:* the diff
   touches half the codebase.
4. **Cite the contract.** Every shard carries `contract_version`. A contractless
   shard fails DoR by definition — it can't be validated against the schema.
5. **Single-phase ownership.** Exactly one persona authors a shard (the Product
   Owner). No "designed by Architect, written by PO" ambiguity.
6. **Acceptance traces to the PRD.** Each `test_criteria` maps to a PRD
   requirement. Orphans are scope creep — reject them.
7. **Context-fit.** A shard's `inputs` must fit the target agent's context
   window *alongside the contract*. If not, split the shard, not the window.

## Granularity: how to know it's right

| Too big | Too small | Just right |
|---|---|---|
| > 5 files touched | Can't stand alone | One behavior |
| Multiple testable outcomes | Sub-test-sized | Testable in isolation |
| Doesn't fit context | Orchestration > work | Fits the context window |
| Ambiguous acceptance | | Independently revertible |

**Rule of thumb:** if you can't write a one-sentence acceptance statement, it's
too big. If the shard produces no artifact a reviewer can inspect, it's too
small.

## The sharding process (Product Owner)

1. **Read the PRD + current contract version** — the contract version is your
   anchor; every shard will cite it.
2. **List distinct testable behaviors** implied by the requirements.
3. **Apply the seven rules** — split anything composite, drop anything
   untraceable to the PRD.
4. **Draft each shard** — full frontmatter (`epic_id`, `story_id`,
   `contract_version`, `inputs`, `expected_outputs`, `test_criteria`,
   `depends_on`, `status: draft`) + Context/Implementation prose.
5. **Self-check DoR** — inputs exist? criteria testable? deps known?
6. **Emit** to `.iuvareai/stories/{epic}.{story}.{title}.md`.

## Worked example: epic "User Authentication"

**❌ Bad — one god shard:**
```
001.001 implement-authentication.md
  test_criteria: ["users can register, log in, reset passwords, and are rate-limited"]
```
Four behaviors, dozens of files, untestable as one unit, un-revertable.

**✅ Good — sharded:**
```
001.001 user-registration.md   → POST /register, hash pw, create record   (≤3 files)
001.002 user-login.md          → POST /login, issue JWT                     (≤3 files)
001.003 user-login-rate-limiting.md → 5-attempts/60s lockout                (≤2 files)
001.004 password-reset.md      → reset token flow                           (≤4 files)
```
Each is one behavior, independently testable, independently revertible, each
citing the same `contract_version`. `001.003 depends_on: [001.002]`.

## Anti-patterns to reject
- **God / mega-shard:** "implement auth" — split it.
- **Contractless shard:** no `contract_version` — fails DoR.
- **Orphan criteria:** a `test_criteria` with no PRD ancestor — scope creep.
- **Bundle shard:** two behaviors glued together ("and also…").
- **Implementation-detail shard:** too small to be a behavior (a single function
  rename) — fold it into its parent behavior.

## How sharding ties to the rest
- **DoR (§8):** a shard must be DoR-passable to reach `ready`. Sharding that
  can't pass DoR = the PRD is incomplete; escalate, don't guess.
- **Contract versioning (§5.4):** cite the current contract; a later MAJOR bump
  flags your shard `stale`.
- **State machine (§9):** shards are born `draft` and flow toward `done`.
- **VCS (vcs.md):** one shard = one branch = one squash commit = one revert unit.
