---
type: Methodology
title: "Workflow 2D — Flash"
description: "Minimal local workflow for a small, low-risk change."
tags: [methodology, workflow, flash]
timestamp: 2026-07-25
doc: workflow-flash
version: 1.0.0
status: active
last_updated: 2026-07-25
audience: [conductor]
---

# Flash Workflow

**Use when:** the change is small, local, and will not be promoted to production.
If it modifies shipped production code, use [Delta](delta.md).

![Flash workflow](assets/flash.svg)

[Open scalable SVG](assets/flash.svg) · [Mermaid source](assets/flash.mmd)

## Five actions only

1. Write a short `TECH_SPEC.md` stating the exact change and test.
2. Human Conductor implements inside that boundary.
3. Run focused local/unit tests.
4. Human reviews the diff at **Gate 3**.
5. Stop at local completion.

Flash has no DoR ceremony, staging, or production promotion. Do not add those
steps—reclassify the work instead.

**Next:** return to [Start Here](../complete-workflow.md) for another request.
