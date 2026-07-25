---
type: Methodology
title: "Workflow 5 — Recovery"
description: "Small playbooks for DoR, review, QA, contract, and production failures."
tags: [methodology, workflow, recovery, rollback]
timestamp: 2026-07-25
doc: workflow-recovery
version: 1.0.0
status: active
last_updated: 2026-07-25
audience: [orchestrator, developer, qa, release-manager, conductor]
---

# Recovery

Identify where the failure occurred, follow only that row, then return to the
normal lifecycle.

![Recovery routing](assets/recovery.svg)

[Open scalable SVG](assets/recovery.svg) · [Mermaid source](assets/recovery.mmd)

| Failure | Immediate action | Resume when |
|---|---|---|
| DoR | Fix missing/invalid shard metadata, dependencies, inputs, outputs, or permissions | DoR is green; return `draft → ready` |
| Review | Developer applies specific findings | Gate 3 approves; max two cycles before human escalation |
| QA | Send one bounded failure packet to Developer | Tests pass within three attempts |
| Self-heal/budget exhausted | Set `blocked`; stop autonomous retries | Human/Release Manager authorizes remediation |
| Contract MAJOR mismatch | Set affected open shards `stale` | Shard is updated and re-readied against current contract |
| Staging failure | Do not promote; create Delta `fix` | Fix completes normal lifecycle |
| Production regression | Auto-rollback to last-known-good; open incident and Delta `fix` | Regression proof and release gates pass |

Never disable a failing control to make the pipeline move. A blocked pipeline is
a diagnostic signal.

**Resume:** [Deliver One Story](story-lifecycle.md) or [Release](release.md)
