---
type: WorkItem
title: enable-shared-git-command-capability
description: Enable every optional agent and skill lens to execute risk-classified repository-local Git commands through task scope.
lane: controlled
risk: high
status: done
reads:
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/agents/index.md
  - .pi/skills/iuvareai-sdlc.md
  - scripts/activate-pi-skills.mjs
  - scripts/lib-task-scope.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - scripts/lib-work-item.mjs
  - .iuvareai/tasks/index.md
writes:
  - .iuvareai/tasks/enable-git-commands.md
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/agents/index.md
  - .pi/skills/iuvareai-sdlc.md
  - scripts/activate-pi-skills.mjs
  - scripts/lib-task-scope.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
write_trees: []
deletes: []
commands: [quality]
acceptance:
  - Every optional persona or skill can request the shared git command class; no persona switch is required.
  - Read-only Git commands remain inspection operations, local repository mutations use git scope, network operations use network scope, and destructive operations require destructive scope.
  - The installed Pi extension and generated orientation skill reflect the source policy.
verification:
  - The Controlled WorkItem passes task-check
  - Framework tests pass
  - OKF conformance passes
  - Git command classification tests cover inspect, local mutation, network, and destructive cases
  - The integration source and installed Pi extension remain identical
  - Final diff receives a focused security and scope review
contract_touched: false
---

# Enable shared Git command capability

Git execution is governed by the active task capability rather than the optional
expertise lens. Preserve risk-based handling while making local Git mutation an
explicit command class available to every lens.
