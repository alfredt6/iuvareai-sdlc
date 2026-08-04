---
type: WorkItem
title: enable-common-container-runtime-commands
description: Allow common local Docker and Compose development commands with risk-proportionate controls.
lane: controlled
risk: high
status: done
reads:
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/docs/install.md
  - .iuvareai/tasks/authorize-local-container-builds.md
  - .pi/skills/iuvareai-sdlc.md
  - AGENTS.md
  - README.md
  - scripts/lib-task-scope.mjs
  - scripts/activate-pi-skills.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - framework-tests/installer.test.mjs
writes:
  - .iuvareai/tasks/enable-common-container-runtime-commands.md
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/docs/install.md
  - .pi/skills/iuvareai-sdlc.md
  - AGENTS.md
  - README.md
  - scripts/lib-task-scope.mjs
  - scripts/activate-pi-skills.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - framework-tests/installer.test.mjs
write_trees: []
deletes: []
commands: [quality]
acceptance:
  - Docker and Compose status/list commands run as low-risk inspection.
  - Compose up, create, start, stop, restart, pause, unpause, kill, logs, pull, wait, events, attach, and ordinary down commands use one medium-risk container-runtime grant without per-command confirmation.
  - Equivalent common Docker container lifecycle, logs, pull, wait, top, stats, update, rename, and tag commands use container-runtime scope.
  - Build, buildx, run, exec, create, commit, and Compose run/exec or up --build remain critical container actions with exact-command confirmation.
  - Registry push/publish remains a critical release action.
  - Volume deletion, rm/rmi, prune, and destructive Compose flags remain destructive actions with exact-command confirmation.
  - Docker authentication, secret-revealing config/inspect, file-transfer, and unknown commands remain blocked.
  - The installed Pi extension and integration source enforce identical behavior.
verification:
  - The Controlled WorkItem passes task-check
  - Framework tests pass
  - OKF conformance passes
  - The reported Compose up, logs, ps, and restart command forms have regression coverage
  - Runtime scope is medium risk and does not trigger exact-action confirmation
  - Critical, release, destructive, and forbidden Docker cases have regression coverage
  - The integration source and installed Pi extension remain identical
  - Final diff receives a focused security review
contract_touched: false
---

# Enable common container runtime commands

Separate routine local development lifecycle operations from arbitrary container
execution, image builds, registry release, and destructive cleanup. Routine
runtime work receives one task-scope approval instead of repeated command
confirmations, while higher-impact Docker actions keep exact-action controls.
