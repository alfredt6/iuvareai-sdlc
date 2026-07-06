---
type: Policy
title: "CI/CD Pipeline Contract"
description: "Pipeline stages: DoR check, contract-guard, quality, regression, integration, deploy."
tags: [policy, governance, ci]
timestamp: 2026-07-04
policy: ci
version: 1.0.0
status: active
last_updated: 2026-07-03
applies_to: [genesis, blueprint, delta, flash]
enforces: ["SDLC v3 §11.3", "Definition of Ready §8", "Contract Versioning §5.4", "Environments §12"]
---

# CI/CD Pipeline Contract

## Purpose
Make the SDLC's gates **machine-checkable**, not vibes-checkable. CI is where
the Definition of Ready, the data-contract version rule, and the regression
guarantees actually get enforced — automatically, on every push and every merge.

## Scope
Defines the **pipeline stages**, their **triggers**, their **pass/fail
criteria**, and how they map to the environment promotion model (§12). Branching
and PR mechanics live in `vcs.md`; this file defines what runs *on* those
branches and PRs.

---

## 1. Pipeline Overview

| Stage | Trigger | Runs | Blocks |
|---|---|---|---|
| **DoR check** | PR open / push | Shard frontmatter validation, contract-version compat, input existence, testable criteria | ✅ merge |
| **Contract-guard** | any change to `DATAMODEL_CONTRACT.md` | All open shards still compatible? else flag `stale` | ✅ merge |
| **Quality** | PR open / push | Lint, typecheck, unit tests | ✅ merge |
| **Regression** | merge → `main` | Full regression suite (Delta: the **existing** suite) | ✅ deploy |
| **Integration** | staging deploy | Staging/integration suite | ✅ prod promote |
| **Deploy** | manual / Gate 4 | Promote artifact local → staging → prod | ✅ prod (Final Gate) |

---

## 2. Required Status Checks (branch protection)

These **must** be green before `main` accepts a merge (see `vcs.md` §3):

1. `dor-check`
2. `quality` (lint + typecheck + unit)
3. `contract-guard` (when the PR touches `DATAMODEL_CONTRACT.md`)
4. `secret-scan`

`regression` and `integration` gate **deployment**, not merge.

---

## 3. DoR Check (the headline stage)

Implements the **Definition of Ready** (SDLC §8) as code. Inputs: the PR's shard
path (from the `[shard: ...]` citation, with branch-name fallback). It verifies:

1. **`status`** is set and a legal transition (per §9).
2. **`contract_version`** major **matches** the current `DATAMODEL_CONTRACT.md`
   major (see §4 for the rule).
3. **Every `inputs` path exists** in the repo.
4. **`expected_outputs`** is non-empty (target files known up front).
5. **`test_criteria`** is non-empty and each entry is a testable statement.
6. **Every `depends_on`** story is in status `done`.
7. **`track`** is set; for Delta: `delta_type` and `contract_touched` are set.

**On failure:** the story cannot reach `ready`; the Orchestrator returns it to
`draft`. The check prints the specific failing rule, never a generic "failed."

### Reference script (`scripts/dor-check.mjs`)
```js
import { readFileSync, existsSync } from "node:fs";
import yaml from "js-yaml"; // npm i js-yaml

const shardPath = process.env.SHARD_PATH; // from PR citation
if (!shardPath || !existsSync(shardPath)) {
  console.error(`✗ DoR: shard path missing or not found: ${shardPath}`);
  process.exit(1);
}

// 1. Parse shard frontmatter
const text = readFileSync(shardPath, "utf8");
const fm = text.match(/^---\n([\s\S]*?)\n---/);
if (!fm) fail("no YAML frontmatter");
const s = yaml.load(fm[1]);

// 2. Contract-version compatibility (MAJOR must match)
const contractVer = readFileSync(".iuvareai/specs/DATAMODEL_CONTRACT.md", "utf8")
  .match(/^#\s*version:\s*(\d+)\./m)?.[1];
const shardMajor = String(s.contract_version).split(".")[0];
if (contractVer !== shardMajor)
  fail(`contract major mismatch: shard ${shardMajor} vs contract ${contractVer}`);

// 3. Inputs exist
for (const p of s.inputs ?? []) if (!existsSync(p)) fail(`missing input: ${p}`);

// 4. expected_outputs declared
if (!s.expected_outputs?.length) fail("expected_outputs empty");

// 5. test_criteria present + testable
if (!s.test_criteria?.length) fail("test_criteria empty");

// 6. depends_on all done (simplified — read each dep shard's status)
for (const dep of s.depends_on ?? []) {
  const depStatus = readStatus(dep); // your helper
  if (depStatus !== "done") fail(`dependency ${dep} not done (${depStatus})`);
}

console.log(`✓ DoR passed for ${shardPath}`);
process.exit(0);

function fail(msg) { console.error(`✗ DoR: ${msg}`); process.exit(1); }
```

---

## 4. Contract-Guard (semver compatibility)

When a PR touches `.iuvareai/specs/DATAMODEL_CONTRACT.md`:

- Parse the contract's `# version: MAJOR.MINOR.PATCH` header.
- For **every open story shard**, compare its `contract_version` MAJOR to the
  contract's MAJOR.
  - **Same MAJOR → compatible** (MINOR/PATCH differences are safe; the contract
    only breaks across MAJOR bumps, per §5.4).
  - **Different MAJOR → incompatible** → that shard is auto-flagged `stale` and
    its PR is blocked until the shard is re-readied against the new contract.

This is the mechanism that stops a stale story from silently generating code
against an outdated schema — the crown-jewel guarantee of the whole framework.

---

## 5. Quality Gate

Runs on every PR push:

- **Lint** (e.g. ESLint/Biome) — zero new warnings in the diff.
- **Typecheck** (e.g. `tsc --noEmit`) — must pass clean.
- **Unit tests** — the shard's own unit tests must pass.
- **Coverage** (Delta/refactor only) — must not drop below the prior baseline.

Failing any → PR blocked. This is the cheapest stage; run it first and fast.

---

## 6. Regression (per track)

Runs on merge to `main`, before the artifact is considered deployable:

| Track | What "regression" means |
|---|---|
| **Flash** | The change's own unit tests (light). |
| **Delta** | The **existing** regression suite, unchanged — prove *nothing broke*. (For `behavior` deltas, also the new tests proving the intended change.) |
| **Blueprint** | Full regression suite + the feature's integration tests. |
| **Genesis** | Full regression + cross-module + migration tests. |

> The Delta rule is load-bearing: the point is **proving nothing broke**, not
> re-proving everything works. A `refactor` whose suite stays green with no
> coverage drop is the ideal outcome.

---

## 7. Integration (staging)

Runs on deploy to **staging** (§12):

- End-to-end workflows against **sanitized** data.
- External-integration smoke tests (where wired via MCP/extension).
- Performance sanity against quantified NFRs (e.g. p95 < target).

Blocks promotion to production. Blueprint/Genesis require this green; Flash and
most Deltas skip staging.

---

## 8. Deployment & Promotion

Mapping to the environment model (§12) and gates:

```
local (Developer, containerized)
   └─ merge to main → regression green
staging (Release Manager, after Gate 3)
   └─ integration green → Gate 4 (rollback path confirmed)
production (Release Manager executes; Human Final Gate approves)
```

- **Gate 4** is a CI/release-pipeline check: *confirmed rollback path exists*
  (prior semver tag or feature flag) before any prod deploy.
- The **Final Gate** is a **human approval** — never automated. The Release
  Manager executes the deploy only after it.
- **Auto-rollback:** if a deployed change regresses in prod (alerts/metrics trip
  within the watch window), roll back to the last semver tag automatically — no
  live debugging in production (§5.6).

---

## 9. Reference Implementation (GitHub Actions)

Illustrative — the same stages map to GitLab CI, CircleCI, etc.

```yaml
# .github/workflows/iuvare.yml
name: iuvare
on:
  pull_request:
  push:
    branches: [main]
    paths: [".iuvareai/specs/DATAMODEL_CONTRACT.md"]

jobs:
  dor-check:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    env:
      SHARD_PATH: ${{ ... }}        # parse from PR body [shard: ...]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: node scripts/dor-check.mjs

  contract-guard:
    if: github.event_name == 'push'   # contract changed on main
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/contract-guard.mjs   # flags stale shards

  quality:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage

  regression:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:regression
      - run: npm run build           # produce deployable artifact

  integration:
    needs: regression
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:integration

  deploy:
    needs: integration
    environment: production          # GitHub environment protection = Final Gate
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/release-checklist.sh   # Gate 4: confirm rollback path
      - run: ./scripts/deploy.sh
```

> The `environment: production` protection rule in GitHub is a clean way to
> model the **human Final Gate** (required manual approval) without custom code.

---

## 10. Failure Handling & State Transitions

CI outcomes drive the story state machine (§9), not the other way around:

| CI outcome | Story action |
|---|---|
| `dor-check` fails | Stay/return to `draft` (cannot open an approvable PR). |
| `quality` fails | Stay `in_progress`; Developer fixes (counts toward review cycles only if Gate 3 already raised it). |
| `contract-guard` flags stale | Transition to `stale`; re-ready against new contract. |
| Regression/integration fail post-merge | **Do not deploy.** Open a Delta `fix` shard; Gate 4 blocks promotion. |
| Prod regression after deploy | **Auto-rollback** to last semver tag; open incident + Delta `fix`. |

A failing check is a **signal to act on**, never a reason to disable the check.

---

## 11. Artifacts, Caching & Secrets

- **Artifacts:** publish the build artifact on every `main` merge; tag it with
  the semver on release. This is what `release/*` and rollback reference.
- **Caching:** cache `node_modules`/build dirs to keep Quality fast.
- **Secrets:** inject via the CI secret store (e.g. GitHub Actions secrets) —
  never echo them, never write them to files agents can read. Staging uses
  sanitized-data credentials; prod credentials are scoped to the `production`
  environment only (§5.7).

---

## 12. Track → Required Pipeline

Minimum pipeline each track must pass before its gate clears:

| Track | DoR | Quality | Contract-guard | Regression | Integration | Gate 4 |
|---|---|---|---|---|---|---|
| **Flash** | — | ✅ | — | light | — | — |
| **Delta** | ✅ | ✅ | if touched | existing suite | — | on prod deploy |
| **Blueprint** | ✅ | ✅ | if touched | full | ✅ staging | ✅ |
| **Genesis** | ✅ | ✅ | ✅ | full + migrations | ✅ staging | ✅ |

This table is the concrete expression of the **trust-threshold gate model**
(SDLC §2): heavier tracks carry heavier pipelines, light tracks stay fast.
