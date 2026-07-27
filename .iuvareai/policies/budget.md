---
type: Policy
title: "Agent Budget and Loop Limits"
description: "Lane budgets, retry ceilings, and delivery-friction metrics."
tags: [policy, budget]
timestamp: 2026-07-25
policy: budget
version: 2.0.0
status: active
applies_to: [direct, standard, controlled]
---
# Agent Budget and Loop Limits

Use project-specific quota/cost limits; these are starter envelopes:

| Lane | Relative envelope | Repair limit |
|---|---:|---:|
| Direct | 1× | 1 focused retry |
| Standard | 5× | 3 attempts |
| Controlled | 10× | 3 attempts + human escalation |

Stop on budget exhaustion, repeated identical failure, scope ambiguity, or an
expired grant. Schedule expensive work for lower-cost quota windows where
applicable. Record tokens/quota, elapsed time, scope expansions, blocked calls,
review rework, and approval wait time. Optimize total lead time and quality—not
token minimization at the expense of correctness.
