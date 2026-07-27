---
type: Methodology
title: "WorkItem State"
description: "A small validated lifecycle without persona-owned transitions."
tags: [methodology, state]
timestamp: 2026-07-25
---
# WorkItem State

```text
proposed → ready → in_progress → review → done
     ↘         ↘          ↘        ↘
                    blocked
```

Legal recovery: `review → in_progress`, `blocked → proposed|in_progress`.
`done` is historical; subsequent change is a new WorkItem.

Run `node scripts/task-state.mjs <task> <next-state>` to record a validated
transition. Git/PR/CI integrations may call it automatically. No persona owns
state fields, and Direct work uses its session grant rather than this lifecycle.
