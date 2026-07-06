---
type: Policy
title: "Agent Sandbox & Permission Boundaries"
description: "Per-persona permission matrix enforced via a Pi tool_call extension."
tags: [policy, governance, sandbox]
timestamp: 2026-07-04
policy: sandbox
version: 1.0.0
status: active
last_updated: 2026-07-03
applies_to: [genesis, blueprint, delta, flash]
enforces: ["SDLC v3 §5.1", "Permission boundaries per persona (§6)"]
---

# Agent Sandbox & Permission Boundaries

## Purpose
Confine each persona to **only** the files and commands it may touch — enforced
by code, not by hope. This closes the gap v3 §5.1 flagged as the framework's
biggest: a written permission rule that *nothing enforces*. (Pi ships no
permission system; you build it — see §7.3.)

## The principle
Each persona file's `writes_to` / `reads_from` frontmatter is the **contract**.
This policy defines **how that contract is enforced at runtime.**

## Per-persona permission matrix
Mirrors every persona's frontmatter — the single source of truth for what's
allowed:

| Persona | Writes | Reads | Bash |
|---|---|---|---|
| Analyst | `specs/PROJECT_BRIEF.md` | — | read-only |
| PM | `specs/PRD.md` | brief | none |
| Architect | `specs/ARCHITECTURE.md`, `specs/DATAMODEL_CONTRACT.md` | brief, PRD | read-only |
| Product Owner | `stories/*.md` | PRD, ARCH, contract | none |
| Developer | `src/`, `tests/` | shard, contract, target file | build/test (allow-listed) |
| Code Reviewer | — (verdicts only) | diff, contract, policy | read-only |
| Test Architect | `tests/`, `docs/` | PRD, shard, contract, `src/` | read-only |
| QA | `tests/` | shard, `src/`, matrix | run tests |
| Release Manager | `sessions/`, `metrics/` | status, metrics, rollback artifact | deploy (gated) |
| Orchestrator | story frontmatter, `sessions/`, `metrics/` | all shards, state, metrics | status/archive writes |

## Enforcement tier — pick one (in order of weight)

1. **Pi extension via `tool_call` interception — recommended, day one.** Block any
   `write`/`edit`/`bash` outside the active persona's allow-set. Cheapest real
   enforcement; hot-reloadable. (See reference snippet below.)
2. **Containerize the harness (Docker).** Mount only the dirs the persona needs;
   `read-only` mount the contract, `read-write` only its `writes_to`. Belt to the
   extension's suspenders.
3. **Micro-VM** — only once agents touch **real customer data**. Overkill before
   then.

> You can run **1 + 2 together**. Never run *none* for production-adjacent work.

## Reference: Pi permission-gate extension

```ts
// .pi/extensions/iuvareai-sandbox.ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

// Mirror each persona's `writes_to` — keep in sync with .iuvareai/agents/*.md
const WRITES: Record<string, string[]> = {
  developer: ["src/", "tests/"],
  qa: ["tests/"],
  "test-architect": ["tests/", ".iuvareai/docs/"],
  "release-manager": [".iuvareai/sessions/", ".iuvareai/metrics/"],
  orchestrator: [".iuvareai/stories/", ".iuvareai/sessions/", ".iuvareai/metrics/"],
  // specs-only personas: pm, analyst, architect, product-owner
};

const SECRET_RE = /(\.env|credentials|secret|\.pem|\.key)/i;

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    // Block writes/edits outside the active persona's writes_to
    if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
      const persona = activePersona(ctx); // your helper: read from session/env
      const allowed = WRITES[persona];
      if (allowed && !allowed.some((p) => event.input.path?.startsWith(p))) {
        return { block: true, reason: `${persona} may not write ${event.input.path}` };
      }
    }
    // Block reading any secret into context
    if (isToolCallEventType("read", event) && SECRET_RE.test(event.input.path)) {
      return { block: true, reason: "path is on the secret exclusion list (see secrets.md)" };
    }
  });
}
```

## Bash allow-listing per track

| Track | Bash scope |
|---|---|
| Flash | local build/test only |
| Delta | build / test / migrate (no prod) |
| Blueprint | + staging deploy (gated by Final Gate) |
| Genesis | full (containerized; never prod credentials) |

Genesis is the *only* track with broad bash — and only inside a container.

## Global exclusions (every persona, every track)
Never in any context packet: `.env`, credentials, keys, tokens, PII in test
fixtures. (Enforced by the extension above + the context-shield rules in each
persona file.)

## Crossing a boundary
If a persona genuinely needs to touch something outside its set, it **does not
bypass** — it escalates to the Orchestrator/human. The boundary exists for a
reason; the right fix is usually a re-shard or a contract bump, not a permission
exception.
