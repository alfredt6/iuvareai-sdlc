---
type: Methodology
title: "Bounded Agent Loops"
description: "Fresh-context maker/checker loops governed by task capabilities and stopping conditions."
tags: [methodology, loops]
timestamp: 2026-07-25
---
# Bounded Agent Loops

Use loops only where completion is externally verifiable. Each loop has:

- an exact task capability and expiry;
- repository/session memory outside model context;
- small work batches, preferably isolated by worktree;
- independent maker and checker contexts for Standard/Controlled work;
- tests, lint, acceptance, or another objective stopping condition;
- retry and budget ceilings.

Default maximums are three repair attempts and two review-rework cycles. Stop on
repeated failures, scope growth, forbidden data, critical ambiguity, budget
exhaustion, or grant expiry. Infinite unattended loops are prohibited.

Personas may improve a worker's expertise but do not change its tools. The loop
controller requests or replaces task scope, runs checks, records evidence, and
pauses only where policy requires human judgment.
