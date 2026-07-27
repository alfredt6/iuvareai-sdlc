---
type: Methodology
title: "Workflow Guide — v4 Lean"
description: "Route work through Direct, Standard, or Controlled delivery without manual persona switching."
tags: [methodology, workflow, lean]
timestamp: 2026-07-25
---

# Workflow Guide — Start Here

```text
User outcome
  → choose the lightest safe lane
  → agent requests exact task scope
  → execute in a small batch
  → verify independently when required
  → release with risk-based controls
```

| Work | Lane | Next |
|---|---|---|
| Docs, tests, safe README, small local code | [Direct](workflows/direct.md) | No committed work item |
| Feature, fix, refactor, normal production change | [Standard](workflows/standard.md) | Compact WorkItem |
| Auth, schema, migration, CI/infra, regulated/high impact | [Controlled](workflows/controlled.md) | WorkItem + relevant evidence |

Do not ask the operator to select a persona. Load a specialist skill only when
its expertise improves the result. Task scope—not persona—controls tools.

When work fails, open [Recovery](workflows/recovery.md). Normative rules live in
the [v4 specification](../IUVARE_AI_SDLC_v4.md).
