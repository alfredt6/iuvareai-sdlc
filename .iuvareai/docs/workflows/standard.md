---
type: Methodology
title: "Standard Delivery"
description: "Normal feature, fix, refactor, and production-change workflow."
tags: [methodology, workflow, standard]
timestamp: 2026-07-25
---
# Standard Delivery

1. Create one compact `.iuvareai/tasks/*.md` WorkItem with acceptance,
   verification, reads, exact writes, and command classes.
2. Run `node scripts/task-check.mjs <path>` and move `proposed → ready`.
3. Request the matching task scope and implement a small batch.
4. Run quality checks; move to `review`.
5. An independent checker reviews acceptance, security, containment, and tests.
6. Merge after CI; retain evidence and release through normal peer-review,
   monitoring, and rollback controls.

Use `node scripts/task-state.mjs <path> <state>` for validated transitions. No
Orchestrator persona is required for metadata.
