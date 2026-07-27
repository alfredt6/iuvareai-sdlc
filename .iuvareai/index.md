---
okf_version: "0.1"
title: Iuvare AI SDLC v4 Lean Knowledge Bundle
description: Task-scoped, risk-based knowledge and policy for AI software delivery.
---

# Iuvare AI SDLC — Knowledge Bundle

This is an OKF v0.1 bundle. The canonical specification is
[IUVARE_AI_SDLC_v4.md](IUVARE_AI_SDLC_v4.md).

## Type vocabulary

| `type` | Meaning | Location |
|---|---|---|
| `Specification` | canonical SDLC | root |
| `Persona` | optional expertise lens | `agents/` |
| `ProjectSeed`, `ProjectBrief`, `PRD`, `Architecture`, `DataContract`, `UIDesign` | systemic project knowledge | `specs/` |
| `WorkItem` | Standard/Controlled unit of delivery | `tasks/` |
| `Story`, `Delta` | v3 compatibility work | `stories/`, `deltas/` |
| `Policy` | enforced rule | `policies/` |
| `Methodology` | reusable procedure | `docs/` |

## Manifest

- [agents/](agents/) — optional expertise lenses
- [specs/](specs/) — project systemic decisions
- [tasks/](tasks/) — v4 WorkItems
- [evidence/](evidence/) — project test, approval, threat, and release evidence
- [policies/](policies/) — enforced controls
- [docs/](docs/) — reusable methodology only
- [stories/](stories/), [deltas/](deltas/) — v3 migration compatibility
- `sessions/`, `metrics/` — audit and flow data

Validate with `node scripts/okf-conformance.mjs`.
