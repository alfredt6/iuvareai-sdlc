---
okf_version: "0.1"
title: Iuvare AI SDLC Knowledge Bundle
description: An OKF-conformant knowledge bundle powering the Iuvare AI-driven SDLC.
---

# Iuvare AI SDLC — Knowledge Bundle

This directory is an **[Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)** v0.1 bundle: a git-tracked tree of markdown *concepts* with YAML frontmatter, machine-traversable cross-links, and `index.md` manifests for progressive disclosure. Author- and agent-readable from the same files — no SDK, no translation layer.

## Iuvare type vocabulary
OKF requires exactly one field — `type`. Iuvare defines these values:

| `type` | Meaning | Lives in |
|---|---|---|
| `Specification` | the SDLC blueprint itself | root |
| `Persona` | an AI role profile (loaded as a skill) | `agents/` |
| `ProjectBrief` · `PRD` · `Architecture` · `DataContract` · `UIDesign` | systemic specs | `specs/` |
| `Story` | a feature implementation shard | `stories/` |
| `Delta` | a change request against shipped code | `deltas/` |
| `Policy` | an enforced governance rule | `policies/` |
| `Methodology` | a procedural reference | `docs/` |

Iuvare-specific fields (`status`, `owner`, `contract_version`, `depends_on`, `delta_type`, …) ride as **producer extensions**; OKF consumers preserve unknown keys (spec §9).

## Manifest

# Roles
* [agents/](agents/) — the WHO: 11 persona profiles (Analyst → Orchestrator, + UX/UI Designer)

# Systemic specs
* [specs/](specs/) — the WHAT: brief, PRD, architecture, data contract (created Phase 1–2)

# Work units
* [stories/](stories/) — feature cards (YAML frontmatter + status)
* [deltas/](deltas/) — change requests against shipped code

# Governance & methodology
* [policies/](policies/) — the MUST: enforced rules (vcs, ci, budget, sandbox, secrets)
* [docs/](docs/) — the HOW: methodology references (sharding, DoR, state machine, OKF)

# Data layer (NOT OKF concepts)
* [sessions/](sessions/) — archived agent session logs (`*.jsonl`)
* [metrics/](metrics/) — per-story cost/quality logs (`*.jsonl`)

## Conformance
Every `.md` concept under this bundle carries YAML frontmatter with a non-empty
`type`. `index.md` / `log.md` are reserved (no `type`); `sessions/` and `metrics/`
are the data layer. Validate:

```bash
node scripts/okf-conformance.mjs
```
