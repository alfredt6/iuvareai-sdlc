---
type: WorkItem
title: authorize-external-source-reads
description: Allow agents to inspect explicitly scoped source directories and repositories outside the active repository without extending write authority.
lane: controlled
risk: high
status: done
reads:
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/docs/install.md
  - .pi/skills/iuvareai-sdlc.md
  - AGENTS.md
  - README.md
  - scripts/lib-permissions.mjs
  - scripts/lib-task-scope.mjs
  - scripts/activate-pi-skills.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - framework-tests/work-item.test.mjs
  - framework-tests/installer.test.mjs
writes:
  - .iuvareai/tasks/authorize-external-source-reads.md
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/docs/install.md
  - .pi/skills/iuvareai-sdlc.md
  - AGENTS.md
  - README.md
  - scripts/lib-permissions.mjs
  - scripts/lib-task-scope.mjs
  - scripts/activate-pi-skills.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - framework-tests/work-item.test.mjs
  - framework-tests/installer.test.mjs
write_trees: []
deletes: []
commands: [quality]
acceptance:
  - An agent can request exact absolute files or directory prefixes in reads and inspect authorized content outside the active repository.
  - Every external read scope receives human approval and is retained in the task grant preview and session record.
  - External access remains read-only; built-in writes and moves stay confined to repository-relative outputs.
  - Secret-like files and external repository metadata remain excluded even beneath an authorized external directory.
  - External image inspection and copying an authorized external source into an authorized local output are supported.
verification:
  - The Controlled WorkItem passes task-check
  - Framework tests pass
  - OKF conformance passes
  - Permission tests cover external scope validation, approval risk, canonical containment, and forbidden external targets
  - The integration source and installed Pi extension remain identical
  - Final diff receives a focused security and scope review
contract_touched: false
---

# Authorize external source reads

Extend task-scoped reads across repository boundaries without turning the active
repository grant into a multi-repository write capability. Absolute external
inputs are explicit, approval-gated, canonicalized, and filtered for forbidden
data.
