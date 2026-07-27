---
type: Methodology
title: "OKF Adoption"
description: "How the .iuvareai/ bundle conforms to the Open Knowledge Format (OKF v0.1)."
tags: [methodology, okf, format]
timestamp: 2026-07-04
---

# OKF Adoption

## Why OKF
The `.iuvareai/` tree had already converged on the LLM-wiki pattern — markdown +
YAML frontmatter + cross-references in git. OKF (v0.1) formalizes that pattern
into a **vendor-neutral, agent- and human-readable standard**, making the bundle:
**portable** across harnesses (Pi, Codex, Claude Code), **machine-traversable**
as a graph, and **quota-efficient** via `index.md` progressive disclosure.

See the [root index](../index.md) for the type vocabulary and manifest.

## What changed (the overlay)
Adoption is an **overlay, not a rewrite**. For every knowledge concept:
- Added OKF frontmatter: `type` (required), `title`, `description`, `tags`, `timestamp`.
- Kept all Iuvare-specific fields as producer extensions (OKF preserves unknown keys).
- Added bundle-relative links and `resource` pointers where concepts bind to code.

Plus structural additions:
- [Root `index.md`](../index.md) declares `okf_version: "0.1"` + the manifest.
- Per-directory `index.md` files enable progressive disclosure (read one manifest, not the tree).
- `scripts/okf-conformance.mjs` validates the bundle in CI.

## Type vocabulary

| `type` | Example concept |
|---|---|
| `Specification` | the SDLC blueprint |
| `Persona` | `agents/developer.md` |
| `ProjectBrief` · `PRD` · `Architecture` · `DataContract` | systemic specs |
| `WorkItem` | `tasks/TASK-001.user-login-rate-limiting.md` |
| `Story` · `Delta` | v3 compatibility concepts |
| `Policy` | `policies/vcs.md` |
| `Methodology` | this file |

## Authoring a new concept
1. Create the `.md` file under the right directory.
2. Start with frontmatter containing **at least `type`** (see vocabulary).
3. Add `title`, `description`, `tags`, `timestamp`; add `resource` if it binds to a code/git asset.
4. Cross-link with **bundle-relative** paths (`/specs/DATAMODEL_CONTRACT.md`).
5. Run `node scripts/okf-conformance.mjs` — it must pass before merge.

Example v4 concept:
```yaml
---
type: WorkItem
title: User Login Rate Limiting
description: Add a five-attempt lockout.
lane: controlled
risk: high
status: proposed
reads: [src/auth/login.ts]
writes: [src/auth/rate-limiter.ts, tests/auth/rate-limiter.test.ts]
commands: [quality]
acceptance: [The sixth attempt is rejected]
verification: [Security and regression tests pass]
---
```

## Scope boundary
OKF covers the **knowledge layer** (specs, tasks, compatibility stories/deltas,
policies, reusable methodology, agents, and the specification). The **data layer** — `sessions/*.jsonl` and
`metrics/*.jsonl` — are logs, not concepts, and are intentionally excluded.

## Conformance
Per OKF §9: every non-reserved `.md` has parseable frontmatter with a non-empty
`type`. `index.md` / `log.md` are reserved. Validate with:
```bash
node scripts/okf-conformance.mjs
```
Wire this as a required CI check alongside `task-check` and `secret-scan`
(see [ci.md](../policies/ci.md)).
