---
type: Methodology
title: "Recovery"
description: "Bounded recovery for scope, review, test, and production failures."
tags: [methodology, workflow, recovery]
timestamp: 2026-07-25
---
# Recovery

| Failure | Action |
|---|---|
| Task scope too small | Request a replacement exact scope; do not bypass |
| Task readiness fails | Fix the WorkItem, not implementation |
| Review rejects | Rework; after two cycles escalate to a human |
| Tests fail | Focused repair; after three attempts set `blocked` |
| Budget/grant expires | Stop, retain history, explicitly resume |
| Staging fails | Do not promote; fix through a new or reopened WorkItem |
| Production regresses | Roll back first; open a Standard/Controlled fix |
| Forbidden data/action | Stop immediately and escalate |

Do not add permanent ceremony after an incident. Improve the test, observability,
risk classifier, or policy that would have detected it earlier.
