# Project Instructions

This project follows the **Iuvare AI SDLC**, defined in full at
`.iuvareai/IUVARE_AI_SDLC_v3.md`. Read that file before doing any planning,
scaffolding, or persona work.

- **Personas** (roles & behaviors): `.iuvareai/agents/` — load the relevant
  persona before its phase.
- **Policies** (enforced rules): `.iuvareai/policies/`
- **Methodology** (procedures): `.iuvareai/docs/`
- **Validate the bundle:** `node scripts/okf-conformance.mjs`
- **Start a story:** see `.iuvareai/docs/install.md` and the Adoption Roadmap
  (SDLC §16).

## Framework integrity — do not alter without explicit instruction
- Do **not** create, rename, or modify **skills** or any `.iuvareai/` framework
  file (personas, policies, docs, the spec, scripts) unless explicitly asked.
- Output goes in `src/`, `tests/`, and the project's per-project dirs (`specs/`,
  `stories/`, `deltas/`) — never in skill directories or framework config.
- The framework's source of truth is the `iuvareai-sdlc` template; re-sync with
  `node scripts/iuvareai-init.mjs . --force` if a project's copy drifts.
