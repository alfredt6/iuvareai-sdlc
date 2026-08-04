---
type: WorkItem
title: enable-cloud-server-operations
description: Add a provider-neutral, credential-safe capability for approved cloud server setup and configuration.
lane: controlled
risk: high
status: done
reads:
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/policies/secrets.md
  - .iuvareai/policies/ci.md
  - .iuvareai/docs/index.md
  - .iuvareai/docs/install.md
  - .iuvareai/agents/release-manager.md
  - .pi/skills/iuvareai-sdlc.md
  - .pi/skills/release-manager.md
  - .pi/skills/code-reviewer.md
  - AGENTS.md
  - README.md
  - scripts/lib-permissions.mjs
  - scripts/lib-task-scope.mjs
  - scripts/activate-pi-skills.mjs
  - integrations/pi/iuvareai-sandbox.ts
  - .pi/extensions/iuvareai-sandbox.ts
  - framework-tests/permissions.test.mjs
  - framework-tests/installer.test.mjs
writes:
  - .iuvareai/tasks/enable-cloud-server-operations.md
  - .iuvareai/IUVARE_AI_SDLC_v4.md
  - .iuvareai/policies/sandbox.md
  - .iuvareai/policies/secrets.md
  - .iuvareai/policies/ci.md
  - .iuvareai/docs/cloud-operations.md
  - .iuvareai/docs/index.md
  - .iuvareai/docs/install.md
  - .iuvareai/agents/release-manager.md
  - .pi/skills/iuvareai-sdlc.md
  - .pi/skills/release-manager.md
  - AGENTS.md
  - README.md
  - scripts/lib-permissions.mjs
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
  - Every expertise lens can request cloud capability without receiving credential values.
  - DigitalOcean, Zeabur, AWS, Azure, GCP, Terraform, Pulumi, Fly.io, Railway, and Vercel CLIs are supported through one shell-free tool.
  - Recognizable API tokens, passwords, credential flags, authentication commands, secret retrieval, privilege-management commands, and cloud credential storage paths are rejected.
  - Cloud credentials are configured outside agent context through a least-privilege profile, secret manager, workload identity, or inherited protected environment.
  - Every cloud operation requires a Controlled/critical grant and confirmation of the exact provider command immediately before execution.
  - Tool output is bounded and redacted before entering model context or session details.
  - Raw cloud CLI commands through bash remain blocked in favor of the dedicated tool.
verification:
  - The Controlled WorkItem passes task-check
  - Framework tests pass
  - OKF conformance passes
  - Cloud classification and argument-rejection tests pass
  - No live cloud resources are created during framework verification
  - The integration source and installed Pi extension remain identical
  - Final diff receives a focused security and scope review
contract_touched: false
---

# Enable cloud server operations

Provide a narrow execution bridge to preinstalled provider CLIs. The bridge
inherits credentials supplied by a protected execution environment, never
accepts credential values as tool parameters, runs without a shell, requires
exact-action approval, and redacts bounded output before it reaches the model.
