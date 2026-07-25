---
type: Methodology
title: "Workflow 4 — Release"
description: "Track-specific promotion steps after a story reaches done."
tags: [methodology, workflow, release, promotion]
timestamp: 2026-07-25
doc: workflow-release
version: 1.0.0
status: active
last_updated: 2026-07-25
audience: [release-manager, conductor]
---

# Release

Start here only after the story is `done`.

<a href="assets/release.svg"><img src="assets/release.svg" alt="Track-specific release paths" width="760"></a>

[Open zoomable view](assets/release.svg) · [Mermaid source](assets/release.mmd)

| Track | Required path |
|---|---|
| **Flash** | Focused tests + Gate 3; stop locally |
| **Delta** | Existing regression suite green → human production approval |
| **Blueprint** | Staging/integration green → Gate 4 rollback confirmed → human production approval |
| **Genesis** | Full regression/migrations → staging/E2E/NFRs → Gate 4 → Final Gate |

## Release Manager checklist

- Deploy the reviewed immutable artifact, not a workspace rebuild.
- Production credentials remain unavailable to agents.
- Confirm prior artifact or feature-flag rollback before required Gate 4.
- Record deployment result and watch window.
- On production regression, rollback first; do not live-debug production.

**If release fails:** [Recovery](recovery.md)  
**If release succeeds:** archive the deployment record and close the work.
