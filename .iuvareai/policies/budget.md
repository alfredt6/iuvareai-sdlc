---
type: Policy
title: "Budget & Quota Governance"
description: "Subscription-quota budgeting with time-of-day scheduling and a runaway guard."
tags: [policy, governance, budget]
timestamp: 2026-07-04
policy: budget
version: 1.1.0
status: active
last_updated: 2026-07-03
applies_to: [genesis, blueprint, delta, flash]
model: subscription-quota
providers:
  zai: "GLM Coding Lite — 5h rolling + weekly window, time-of-day multiplier"
  codex: "OpenAI Codex — 5h rolling + weekly window, per-model caps"
enforces: ["SDLC v3 §5.2", "Self-healing bound (§3 Phase 4)", "Metrics §5.5"]
---

# Budget & Quota Governance

## Purpose
**Keep one stuck story from eating the whole subscription window — and make
every quota point count on a tight (Lite) plan.** On flat-rate plans you don't
pay per token; you pay for *quota windows*. So "budget" here means **portion
control over a shared, refilling quota** *and* **running work when it's cheap**.

## The shift: subscriptions vs pay-per-token

| Model | Scarce resource | Budget unit | Risk |
|---|---|---|---|
| Pay-per-token (API) | Money | $ per story | Overspend |
| **Subscription (you)** | **Quota windows + multipliers** | **weighted quota points** | **One runaway story — or peak-hour work — drains the window** |

> v3 §5.2's dollar caps ($0.50–$25/story) are the **pay-per-token fallback**.
> For your Z.ai Lite + Codex subscriptions, **this quota model governs.**

## What you actually budget (not dollars)
Quota **points**, where effective consumption scales with a multiplier:

```
quota consumed = base points × model factor × time-of-day factor
```

- **Base points** — the work itself (tokens/messages).
- **Model factor** — GLM-5-Turbo < GLM-5.2 per call (Turbo = bulk/iteration;
  5.2 = deep reasoning).
- **Time-of-day factor** — *only on Z.ai Lite* (see below). Codex has no known
  time multiplier.

## Your plans

| Provider | Plan | Window | Multiplier / cap | Best for |
|---|---|---|---|---|
| **Z.ai** | **GLM Coding Lite** | **5h rolling + weekly** | **3× peak · 2× off-peak · 1× off-peak promo (to Sep 30)** | reasoning, long context, visual/MCP |
| **OpenAI Codex** | *(your tier)* | 5h rolling + weekly | per-model caps (GPT-5.5/5.4/mini) | code implementation |
| (overflow) | pay-per-token API | — | $ cap | burst beyond both windows |

> Both providers share the **same window shape** (5h + weekly) — which is why
> holding both ≈ **double the runway**, and why failover is so valuable.

## 🆕 Quota multipliers & time-of-day scheduling (Z.ai Lite)

This is the single biggest lever on a Lite plan. **Z.ai peak hours are
14:00–18:00 daily (UTC+8)** — your local afternoon. GLM-5.2 and GLM-5-Turbo
consume quota at:

| Window | Multiplier | vs peak |
|---|---|---|
| Peak (14:00–18:00 UTC+8) | **3×** | 1× |
| Off-peak (normal, after Sep 30) | 2× | 1.5× cheaper than peak |
| **Off-peak PROMO (now → Sep 30)** | **1×** | **3× cheaper than peak** |

> **Headline:** right now, the *same* heavy work run off-peak costs **⅓ the
> quota** of running it at peak. After the promo ends it's still **⅔** (2× vs 3×).
> Visual Understanding MCP draws from the **same** pool — budget it the same way.

## 🆕 Budget-aware daily rhythm (UTC+8)

Match the work to the clock:

| Time (UTC+8) | Zone | What to run |
|---|---|---|
| 00:00–14:00 | off-peak (1× promo) | **Heavy Z.ai work** — Genesis, Blueprint, spec authoring, long-context analysis, overnight batch/regression |
| 14:00–18:00 | **PEAK (3×)** | **Avoid heavy Z.ai work.** Switch to **Codex**, or do human work: Gate 3 reviews, gates, Flash, Conductor steering |
| 18:00–24:00 | off-peak (1× promo) | **Heavy Z.ai work** again — evening/overnight runs are maximally efficient |

> Practical rule: **bank heavy agent work in mornings and evenings; spend
> afternoons on review, gates, and Codex.** An overnight Genesis regression run
> during the promo is essentially free quota.

## Per-track quota envelopes (tune to your plans)

| Track | Envelope (base pts) | Self-heal attempts | Hard ceiling (% of one 5h window) |
|---|---|---|---|
| **Flash** | ~10–30 | 0 | 5% |
| **Delta** | ~50–150 | 3 | 15% |
| **Blueprint** | ~150–500 | 3 | 25% |
| **Genesis** | ~500–2000 | 3 | 40% |

> ⚠️ Because of the multiplier, a story run **at peak consumes its ceiling ~3×
> faster** in raw output. A Genesis story that fits off-peak may blow its ceiling
> at 15:00. **Shift it to off-peak or to Codex.**

## The runaway guard (even more critical on Lite)

A Lite plan has tight windows — a stuck self-healing loop or an over-contexted
agent drains one fast. Rules:

- **Per-story ceiling:** no story exceeds its track's % of the active window.
- **Force-escalation on ceiling hit:** STOP. No 4th guess. Escalate to a human
  with full history. *(Pairs the budget fail-stop with the 3-attempt self-heal
  bound.)*
- **Reserve:** never spend 100% of a window on one track; keep headroom for the
  Orchestrator and other in-flight stories.

## Multi-provider routing (Z.ai Lite + Codex)

Both windows are 5h+weekly. Route by **capability + cost-of-the-moment**:

| Persona / work | Off-peak (esp. promo) | Peak (14:00–18:00 UTC+8) |
|---|---|---|
| Analyst, PM, Architect (specs) | **Z.ai** (1× now) | **Codex** (avoid Z.ai 3×) |
| Developer, Reviewer, QA, TEA (code) | Codex (or Z.ai 1×) | Codex |
| Orchestrator (lightweight) | either | either |
| Flash | either | either |

**Failover rule:** if the preferred provider's window is drained mid-story,
route to the other. During Z.ai peak, prefer Codex first. This is the concrete
payoff of dual subscriptions — you rarely wait out a cooldown.

## Metrics (log per story → `.iuvareai/metrics/{story}.jsonl`)
- provider + model
- **quota points consumed** (base, model factor, time factor recorded separately
  so you can see *why* a story was expensive)
- self-heal attempts used; whether the ceiling was hit (rework signal, §5.8)
- wall-clock + whether run in peak/off-peak

Cost ($) logged **only** for pay-per-token overflow; subscriptions = $0/call,
**quota points consumed** is the number that matters.

## When dollars DO matter
- **Overflow:** both windows drained and no failover → burst to a pay-per-token
  API; apply v3 §5.2 dollar caps to that provider only.
- **Reporting:** amortize the monthly subscription fee across stories shipped
  that month using each story's quota share.

## Reconciliation with v3 §5.2
§5.2 currently states dollar caps as the primary budget. For a subscription
setup, **this file supersedes** §5.2's unit: budget is **weighted quota points**
(messages × model × time-of-day), with dollars as the overflow fallback.
*(Suggested §5.2 edit: "unit of budget is weighted quota for subscriptions,
dollars for API overflow — see `policies/budget.md`.")*
