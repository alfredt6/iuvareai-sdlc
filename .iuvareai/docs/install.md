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
built-in `read` tool. Image editing uses `iuvare_image_operation` and requires
Python 3 with Pillow (`python -m pip install Pillow`). File and directory
transfers request `filesystem` plus `write_trees`/`deletes` as needed and use
`iuvare_file_operation`; no raw copy or move command is required.

### Local Docker development

Status/list commands such as `docker ps` and `docker compose ps` are inspection.
For normal development, request `container-runtime` once to use Compose
`up`/`down`, start/stop/restart, pause/unpause, logs, pull, wait, and related
local lifecycle commands without repeated confirmation prompts. Agents should
include this class in the initial implementation scope when local Compose is part
of verification.

Build, `run`, `exec`, `create`, `commit`, and Compose `up --build` remain critical
`container` operations with exact-command confirmation. Push/publish remains
`release`; volume deletion, `rm`/`rmi`, and prune remain `destructive`.
Authentication, secret-revealing config/inspect, file transfer, explicit remote
contexts, and unknown Docker commands remain blocked. Use only synthetic local
logs without credentials or real PII.

### External source repositories

An agent may inspect a source directory or another repository by placing an
exact absolute file or directory prefix in task `reads`. Use `/` separators and
end directory prefixes with `/`, for example `C:/Brainbots/shared-src/` or
`/opt/company/reference-repo/`. External reads are at least medium risk, so Pi
shows them as read-only in the scope preview. A read-only inspection grant may
leave `writes` and `write_trees` empty.

The grant does not create a multi-repository write capability. Writes, directory
trees, moves, and deletions remain relative to the active repository. An
external source can be opened with `read`, inspected as an image, or copied into
an authorized local destination with `iuvare_file_operation`. Filesystem roots,
secret-like files, and VCS metadata directories remain blocked even when a
parent directory is scoped. Start Pi in the other repository when that
repository itself must be modified.

Re-run `node scripts/activate-pi-skills.mjs` and restart/reload Pi after upgrading
an existing installation so the updated extension schema is active.

### Cloud provider operation

Install and authenticate the required provider CLI outside Pi, then run Pi in an
isolated environment where that CLI can resolve a least-privilege, short-lived
credential without exposing its value to the agent. Cloud tasks request
Controlled/critical `cloud` scope and call `iuvare_cloud_operation`; each exact
action receives a second confirmation. Raw cloud CLI commands, login/auth
commands, credential arguments, and secret retrieval remain blocked. See
[Credential-Safe Cloud Operations](cloud-operations.md) for supported providers,
setup, verification, and rollback requirements.

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
