---
type: Methodology
title: "Install and Reuse v4"
description: "Scaffold Iuvare v4 Lean and activate task-scoped Pi controls."
tags: [methodology, install]
timestamp: 2026-07-25
---
# Install and Reuse

## New project

```bash
npx degit alfredt6/iuvareai-sdlc my-project
cd my-project
node scripts/okf-conformance.mjs
node scripts/activate-pi-skills.mjs
```

## Existing project

```bash
git clone https://github.com/alfredt6/iuvareai-sdlc /tmp/iuvare
node /tmp/iuvare/scripts/iuvareai-init.mjs /path/to/project
```

The installer preflights collisions, copies the reusable bundle/tooling, and
creates project artifact directories including `tasks/` and `evidence/`. Existing
`AGENTS.md` is preserved.

## Pi operation

Activation installs optional expertise skills and the task-capability extension.
The operator does **not** select a persona. On a mutating request, the agent calls
`iuvare_request_scope`; low-risk work proceeds automatically and sensitive work
shows one approval preview. Use `/iuvare-status` for scope inspection,
`/iuvare-vision` to verify the model can inspect images, and `/iuvare-clear` for
revocation. Design screenshots belong in task `reads` and are opened with Pi's
built-in `read` tool.

## Project setup

1. Add container/micro-VM isolation for production-adjacent work.
2. Wire quality, `task-check`, secret scanning, independent review, artifact,
   environment, provenance, and rollback controls appropriate to risk.
3. Start with Direct work or create one compact Standard/Controlled WorkItem.
4. Load Analyst/Architect/UX/etc. skills only when their expertise is useful.

## Upgrade from v3

Existing stories/deltas continue through `dor-check.mjs`. New work uses v4 task
scopes and WorkItems. Re-run activation after upgrading. Move project evidence
out of `.iuvareai/docs/`; remove manual `/iuvare-persona` automation once all
operators use the v4 extension.
