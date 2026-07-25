---
type: Policy
title: "Agent Sandbox & Permission Boundaries"
description: "Per-persona write sets, Conductor bootstrap rules, and runtime enforcement requirements."
tags: [policy, governance, sandbox]
timestamp: 2026-07-04
policy: sandbox
version: 1.1.0
status: active
last_updated: 2026-07-25
applies_to: [genesis, blueprint, delta, flash]
enforces: ["SDLC v3 §5.1", "Permission boundaries per persona (§6)"]
---

# Agent Sandbox & Permission Boundaries

## Purpose
Confine each persona to **only** the files and commands it may touch — enforced
by code, not by hope. This closes the gap v3 §5.1 flagged as the framework's
biggest: a written permission rule that *nothing enforces*. Pi has no native
Iuvare permission model, so this template ships the integration described below.

## The principle
Each persona file's `writes_to` / `reads_from` frontmatter is the **contract**.
The shard's immutable `implementer` names the authority whose write set must
contain **all** `expected_outputs`; mutable workflow `owner` is not permission.
This policy defines **how that contract is enforced at DoR and runtime.**

## Per-persona permission matrix
Mirrors every persona's frontmatter — the single source of truth for what's
allowed:

| Persona | Writes | Reads | Bash |
|---|---|---|---|
| Analyst | `.iuvareai/specs/PROJECT_BRIEF.md` | — | read-only |
| PM | `.iuvareai/specs/PRD.md` | brief | none |
| Architect | `.iuvareai/specs/ARCHITECTURE.md`, `.iuvareai/specs/DATAMODEL_CONTRACT.md` | brief, PRD | read-only |
| Product Owner | `.iuvareai/stories/*.md` | PRD, ARCH, contract | none |
| Developer | `src/`, `tests/` | shard, contract, target file | build/test (allow-listed) |
| Code Reviewer | — (verdicts only) | diff, contract, policy | read-only |
| Test Architect | `tests/`, `.iuvareai/docs/` | PRD, shard, contract, `src/` | read-only |
| QA | `tests/` | shard, `src/`, matrix | run tests |
| Release Manager | `.iuvareai/sessions/`, `.iuvareai/metrics/` | status, metrics, rollback artifact | deploy (gated) |
| Orchestrator | story/delta frontmatter, `.iuvareai/sessions/`, `.iuvareai/metrics/` | all shards, state, metrics | status/archive writes |

Repository-root `docs/` is **not** `.iuvareai/docs/` and has no default persona
owner. Give project documentation a custom persona with an explicit write set,
or place it in a separate `implementer: conductor` shard.

## Enforcement layers (all required for production-adjacent work)

1. **DoR permission-fit:** `scripts/dor-check.mjs` loads the named persona's
   frontmatter and rejects a shard unless every output fits that one write set.
2. **Harness control layer:** Pi users run `node scripts/activate-pi-skills.mjs`,
   which installs `.pi/extensions/iuvareai-sandbox.ts`. It fails closed until the
   human selects `/iuvare-persona <name>`. Developer must then bind a green shard
   with `/iuvare-story <path>`; direct edits are limited to its
   declared outputs. Permissions are loaded from persona frontmatter, never a
   duplicated hard-coded matrix.
3. **OS isolation:** containerize the harness (or use a micro-VM). Mount persona
   write paths read-write, required inputs read-only, and keep credentials outside
   the process. This is mandatory because shell commands can mutate files and
   exfiltrate data in ways pattern interception cannot safely parse.

> The Pi extension is a fail-closed control layer, **not an OS sandbox**. Run
> layers 1+2+3 together for production-adjacent work. Other harnesses must provide
> an equivalent tool interceptor plus OS isolation.

## Genesis bootstrap authority

Some root files (`package.json`, compiler/build configuration) cannot live under
`src/` or `tests/`. They are a one-time human bootstrap, not a reason to grant an
agent repository-wide writes. A root output is Ready only when all are true:

- `implementer: conductor`
- non-empty `conductor_reason`
- explicit boolean `bootstrap`
- if `bootstrap: true`, `track: genesis`
- every root path is explicitly listed in `expected_outputs`

Use `bootstrap: false` for later root maintenance such as a reviewed dependency
or CI-config change; it remains human Conductor work. The Conductor performs or
directly supervises these changes outside an agent persona. The story then
follows normal review, QA, and audit gates. `conductor` is deliberately
unavailable through `/iuvare-persona`.

## Bash allow-listing per track

| Track | Bash scope |
|---|---|
| Flash | local build/test only |
| Delta | build / test / migrate (no prod) |
| Blueprint | + staging deploy (gated by Final Gate) |
| Genesis | full (containerized; never prod credentials) |

Genesis is the *only* track that may authorize broad bash — and only inside a
container. The shipped Pi gate is intentionally narrower; projects add commands
only after threat-modeling them and constraining the OS sandbox.

## Global exclusions (every persona, every track)
Never in any context packet: `.env`, credentials, keys, tokens, PII in test
fixtures. (Enforced for direct reads by the installed extension, at DoR for
context paths, and by OS deny-read mounts for shell/process access.)

## Crossing a boundary
If a persona genuinely needs to touch something outside its set, it **does not
bypass** — it escalates to the Orchestrator/human. Re-shard to one implementer,
add a narrowly-scoped custom persona, or use an explicit human Conductor shard.
Never broaden Developer to repository-root writes merely to keep a story moving.
