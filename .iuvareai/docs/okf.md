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
| `Story` | `stories/001.003.user-login-rate-limiting.md` |
| `Delta` | `deltas/004.auth-rate-limit-delta.md` |
| `Policy` | `policies/vcs.md` |
| `Methodology` | this file |

## Authoring a new concept
1. Create the `.md` file under the right directory.
2. Start with frontmatter containing **at least `type`** (see vocabulary).
3. Add `title`, `description`, `tags`, `timestamp`; add `resource` if it binds to a code/git asset.
4. Cross-link with **bundle-relative** paths (`/specs/DATAMODEL_CONTRACT.md`).
5. Run `node scripts/okf-conformance.mjs` — it must pass before merge.

Example story concept:
```yaml
---
type: Story
title: User Login Rate Limiting
description: 5-attempt/60s lockout on login.
resource: src/auth/rate_limiter.ts
tags: [auth, security]
timestamp: 2026-07-04T10:00:00Z
# Iuvare extensions:
track: blueprint
status: ready
contract_version: "1.4.0"
depends_on: [stories/001.002]
---
```

## Scope boundary
OKF covers the **knowledge layer** (specs, stories, deltas, policies, docs,
agents, the specification). The **data layer** — `sessions/*.jsonl` and
`metrics/*.jsonl` — are logs, not concepts, and are intentionally excluded.

## Conformance
Per OKF §9: every non-reserved `.md` has parseable frontmatter with a non-empty
`type`. `index.md` / `log.md` are reserved. Validate with:
```bash
node scripts/okf-conformance.mjs
```
Wire this as a required CI check alongside `dor-check` and `secret-scan`
(see [ci.md](../policies/ci.md)).
