# Project Instructions

This project follows **Iuvare AI SDLC v4 Lean**. Read
`.iuvareai/IUVARE_AI_SDLC_v4.md` before planning or mutating the repository.

## Normal operation

- Work from the user's outcome; do not ask the user to select a persona.
- Personas in `.iuvareai/agents/` are optional expertise lenses, not permissions.
- Before the first mutation, request an exact task capability through
  `iuvare_request_scope`. Low-risk work is automatic; sensitive work receives one
  human preview.
- Direct work is session-recorded. Standard/Controlled work uses a compact
  `.iuvareai/tasks/*.md` work item and `node scripts/task-check.mjs <path>`.
- Keep changes small, verify them, and show the diff. Use an independent checker
  for Standard/Controlled work.

## Repository boundaries

- Project outputs may be created wherever the authorized task requires,
  including `docs/`, `src/`, `tests/`, safe root documentation, and project
  artifact directories.
- `.iuvareai/docs/`, `.iuvareai/agents/`, `.iuvareai/policies/`, the canonical
  specification, `scripts/`, `integrations/`, CI/infra, migrations, and release
  configuration are protected high-risk areas. Modify them only through an
  explicitly approved Controlled task.
- Never read or write secrets, credentials, private keys, `.env` values, or real
  PII.
- Project test/release/threat evidence belongs in `.iuvareai/evidence/`, `tests/`,
  or project `docs/`—never in reusable `.iuvareai/docs/` methodology.

## Validation

```bash
node --test framework-tests/*.test.mjs  # framework repository
node scripts/okf-conformance.mjs
node scripts/task-check.mjs <work-item> # Standard/Controlled project work
```

OS isolation remains mandatory for production-adjacent shell execution.
