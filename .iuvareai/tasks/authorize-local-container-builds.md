---
type: WorkItem
title: authorize-local-container-builds
description: Allow explicitly approved local Docker application image builds while keeping other Docker operations blocked.
lane: controlled
risk: high
status: done
reads:
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/tasks/enable-git-commands.md
  - scripts/lib-task-scope.mjs
  - scripts/lib-work-item.mjs
  - scripts/task-check.mjs
  - scripts/okf-conformance.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - README.md
writes:
  - .iuvareai/tasks/authorize-local-container-builds.md
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - scripts/lib-task-scope.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - README.md
write_trees: []
deletes: []
commands: [quality]
acceptance:
  - Local docker build, docker image build, docker buildx build, docker compose build, and docker-compose build commands can run only through an explicit container command capability.
  - Container builds require Controlled scope approval and a second confirmation for the exact command at execution time.
  - Non-build Docker commands and shell composition remain blocked.
  - The installed Pi extension and integration source enforce identical behavior.
verification:
  - Controlled WorkItem passes task-check
  - Framework tests pass
  - OKF conformance passes
  - Docker build forms classify as critical container operations while non-build Docker commands remain blocked
  - Integration source and active Pi extension remain identical
  - Final diff receives a focused security review
contract_touched: false
---

# Authorize local container builds

Treat local Docker application image builds as a dedicated critical command class.
The grant and the exact command each require human approval; this does not authorize
container execution, registry pushes, deployment, or arbitrary Docker operations.
