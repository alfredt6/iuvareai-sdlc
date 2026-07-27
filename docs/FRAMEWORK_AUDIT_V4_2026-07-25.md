# Framework Audit — v4 Lean Remediation

## Decision

v3's persona-bound write sets correctly enforced their own policy but caused
ordinary delivery to halt when artifacts crossed role ownership. v4 separates
expertise from authority and makes exact, short-lived task capabilities the sole
runtime permission source.

## Remediated findings

| Finding | v4 control |
|---|---|
| Project `docs/` had no agent owner | Normal exact-path task output |
| Manual `/iuvare-persona` and `/iuvare-story` | Agent-called `iuvare_request_scope` |
| Only Developer was output-bound | Every write is bound to exact task outputs |
| `reads_from` was declared but unenforced | Active grants enforce read scope |
| Path location stood in for impact | Risk classifier covers path and command impact |
| Flash disabled agent implementation | Direct lane is agent-executable |
| Four tracks and eleven handoff stations | Three lanes; personas are optional lenses |
| Orchestrator-owned metadata queue | Validated `task-state.mjs` transitions |
| Every shard required a data contract | Contract version is conditional on contract changes |
| Project test plans polluted methodology | `.iuvareai/evidence/` project data area |
| Release commands were documented but blocked inconsistently | Command classes + critical exact-action approval |

## Remaining adopter responsibilities

The template cannot configure organizational infrastructure. Production use must
still provide OS isolation, branch protection, secret scanning, independent
review identities, immutable artifacts, provenance/SBOM, protected environments,
credential injection, monitoring, and tested rollback.

## Compatibility

Existing v3 stories/deltas remain accepted by `dor-check.mjs`. New work uses
Direct grants or Standard/Controlled WorkItems. This is a deliberate v4 schema
break with incremental migration rather than a flag-day conversion.
