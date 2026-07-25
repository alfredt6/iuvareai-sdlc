---
type: Methodology
title: "Workflow 1 — Choose a Track"
description: "Select the smallest Iuvare track that safely contains the work."
tags: [methodology, workflow, tracks]
timestamp: 2026-07-25
doc: workflow-choose-track
version: 1.0.0
status: active
last_updated: 2026-07-25
audience: [conductor, orchestrator]
---

# Choose a Track

Answer the questions in order and stop at the first match.

<a href="assets/choose-track.svg"><img src="assets/choose-track.svg" alt="Track selection decision" height="460"></a>

[Open zoomable view](assets/choose-track.svg) · [Mermaid source](assets/choose-track.mmd)

| Track | Use it when | Required preparation | Next guide |
|---|---|---|---|
| **Genesis** | Greenfield, major upgrade, systemic redesign | Full brief, PRD, architecture, contract, UX, stories | [Genesis](genesis.md) |
| **Delta** | Existing shipped code or behavior changes | Delta shard + existing regression context | [Delta](delta.md) |
| **Blueprint** | Isolated feature with bounded integration | PRD shard, API contract, affected design | [Blueprint](blueprint.md) |
| **Flash** | Small local-only change, no production promotion | `TECH_SPEC.md` | [Flash](flash.md) |

## If uncertain

Choose the **heavier** adjacent track. In particular, if a small change modifies
shipped production code, use **Delta**, not Flash.

[Back to Start Here](../complete-workflow.md)
