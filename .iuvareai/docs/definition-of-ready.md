---
type: Methodology
title: "Task Readiness"
description: "Structural startability for Standard and Controlled WorkItems."
tags: [methodology, readiness]
timestamp: 2026-07-25
---
# Task Readiness

Direct work does not require a committed readiness artifact. Standard and
Controlled WorkItems must pass:

- legal lane, risk, and lifecycle state;
- non-empty goal, acceptance, and verification;
- safe repository-relative reads and exact write files;
- optional `write_trees` ending in `/` for destination trees and `deletes` for
  move sources;
- existing read inputs when files are named;
- declared command classes, including `filesystem` for file operations;
- risk declaration at least as high as path/action policy requires;
- Controlled lane for high/critical work;
- contract version only when `contract_touched: true`.

Run:

```bash
node scripts/task-check.mjs .iuvareai/tasks/<task>.md
```

The compatibility `dor-check.mjs` routes v4 tasks to the same validator and still
accepts v3 stories/deltas during migration. Readiness proves startability, not
business correctness; acceptance and independent verification prove the latter.
