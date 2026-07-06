---
type: Specification
title: "The Iuvare AI SDLC (v3.0)"
description: "The open AI-driven SDLC blueprint: tracks, phases, personas, gates, and governance."
tags: [sdlc, specification]
timestamp: 2026-07-04
---

# 📜 THE IUVARE AI SDLC (v3.0)
### The Open Software Engineering Blueprint for Iuvare AI

> **Canonical version.** This is the single authoritative Iuvare AI SDLC. It
> evolved from earlier "orchestration-flow" drafts into a complete AI-driven
> Software Development Lifecycle, closing the governance and execution gaps found
> in review. Earlier drafts live in git history.

---

## 🔁 Changelog (v2 → v3)

> **📦 OKF adoption (post-v3):** The `.iuvareai/` tree is now an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf) v0.1 bundle. Every knowledge concept carries a `type` field; `index.md` manifests enable progressive disclosure; `scripts/okf-conformance.mjs` validates the bundle. Iuvare-specific fields ride as producer extensions. See [docs/okf.md](docs/okf.md).

**Structural / governance additions:**
- **Definition of Ready (DoR)** — automated spec-quality gate that stops vague PRDs and un-ready stories from reaching the Developer. *(Closes v2's sharpest gap: specs were disciplined only by a human sign-off.)*
- **Story State Machine** — every shard now carries `status` / `owner` / `depends_on`; stories move through a defined lifecycle so nothing is grabbed twice and recovery after interruption is deterministic.
- **Sharding Methodology** — concrete atomicity rules (was a one-liner in v2).
- **Version Control & CI/CD Contract** — branching model, PR rules, pipeline stages, contract-compatibility checks (referenced but undefined in v2).
- **Environments & Promotion Model** — local → staging → production with per-track criteria.
- **Secret & Credential Management** — how agents that *legitimately* need access get it, beyond "exclude `.env`."
- **Process Feedback / Retrospective Loop** — quality metrics over time, not just cost.
- **Trust-Threshold Gate Model** — gates are now mapped to tracks so Flash isn't crushed under Genesis-grade ceremony (fixes human-approval fatigue).
- **Orchestrator Agent role** — an explicit sequencer/enforcer (optional; v2 left this implicitly human).
- **Refactor & tech-debt path** — folded into Delta Track via `delta_type`.
- **Conflict Resolution Protocol** — disambiguated escalation targets.
- **Starter budget numbers** — seed placeholders (were "TBD").
- **The 10-Question Orchestration Checklist** — permanent evaluation frame.

**Schema changes:** Story/Delta shards gained `status`, `owner`, `depends_on`, `dor_checked_at`, and `delta_type`. See §7.

---

## 📖 SECTION 0: Glossary

*(All v2 terms retained. New/clarified terms marked 🆕.)*

| Term | Definition |
|---|---|
| Harness | The wrapper around an AI model giving it tools + a think→act→observe loop. (Pi, Claude Code, Cursor agent mode.) |
| Sub-agent | A secondary AI instance spawned for one isolated sub-task in its own context window. |
| Permission gate | A control point that blocks an agent action until a human or policy allows it. |
| **🆕 Definition of Ready (DoR)** | An automated, machine-checkable checklist a story must pass *before* any agent begins implementation. Distinct from a human "sign-off" gate. |
| **🆕 Definition of Done (DoD)** | The criteria a story must meet to leave the pipeline: all `test_criteria` pass, gate approvals recorded, artifacts merged. |
| **🆕 State machine** | The fixed set of statuses a story moves through (`draft → ready → in_progress → review → qa → done`, plus `blocked` / `stale`). |
| Sandboxing | Running an agent in a restricted environment so a mistaken command can't reach real systems or prod data. |
| MCP | Model Context Protocol — standard way to connect agents to external tools/data. |
| Context window | The finite text an agent can see at once. |
| Context shield | Filtering what enters the window — only the shard, contract, and target file. |
| Shard | A small, self-contained unit of work (one story card). |
| Delta shard | A shard describing a *change* to shipped code. |
| **🆕 Delta type** | `behavior` (changes behavior), `fix` (bug), or `refactor` (no behavior change). Drives whether regression vs. re-verification is required. |
| Self-healing loop | Bounded cycle feeding a failing test back to the coder for a fix. |
| Session | Full record of one agent run (Pi: JSONL); doubles as an audit log. |
| Frontmatter (YAML) | `key: value` block atop a Markdown file for machine-readable metadata. |
| Token budget | Cap on text an agent may consume per task. |
| Semver | `MAJOR.MINOR.PATCH`; MAJOR = breaking change, used on the data contract. |
| **🆕 Trust threshold** | The minimum governance weight a track requires; cheaper tracks bypass expensive gates. |
| **🆕 Orchestrator agent** | An optional agent (or human role) that sequences stories, enforces DoR, and archives sessions. |
| **🆕 Rework signal** | A per-story quality metric: review rejections, self-heal attempts used, DoR failures. Feeds the retrospective loop. |

---

## 🏛 SECTION 1: Strategic Foundations

### 1.1 The Shift in Engineering Economics
In the AI-native era the bottleneck inverts: time saved typing syntax is reallocated into **Pristine Specification** and **Autonomous Verification**. An agent without hard boundaries accumulates debt at machine speed — *including bad specs that propagate at machine speed.* v3 therefore disciplines the **specs themselves**, not just the code, via the Definition of Ready (§8).

### 1.2 The Orchestrator-Conductor Hybrid Model
Human team members cycle between two modes. *(Clarified from v2 to remove role/tool fuzziness.)*

- **The Conductor (micro-steering):** A human working *inside* the coding harness (Pi/Cursor/Claude Code) in a tight execution loop on granular changes. The harness is the execution surface; the human is always the governor.
- **The Orchestrator (macro-governance):** A human (optionally assisted by an **Orchestrator agent**, §6.10) who coordinates specialized agents via text contracts and enforces gates before production.

> **Principle:** The human is *always* the governor. "Conductor" and "Orchestrator" are operational modes of the same human, not separate people or tools.

### 1.3 What an Orchestration Framework Must Answer
Every agent SDLC is, at its core, answers to ten questions. v3 uses this as its design and self-audit frame (full checklist in §14):

1. Division of labor · 2. Sequence · 3. Handoff contracts · 4. State management · 5. Context management · 6. Verification · 7. Governance · 8. Recovery · 9. Observability · 10. Human-in-the-loop model.

---

## 🧭 SECTION 2: Scale-Domain Intelligence Tracks

Four tracks match process weight to risk. **🆕 v3 maps each track to a *trust threshold* — the set of gates it must pass** — so a hotfix isn't crushed under greenfield ceremony.

| Track | Complexity | Required Phase 1/2 artifacts | Verification | 🆕 Required gates |
|---|---|---|---|---|
| **Flash** | Hotfix, UI tweak, simple fn | `TECH_SPEC.md` | Single-run local + unit tests | Gate 3 (diff review); tests green |
| **Delta** | Change to shipped code | `DELTA_SHARD.md` + contract-diff check | Existing regression suite | DoR; Gate 3; regression green |
| **Blueprint** | Isolated feature/extension | `PRD_SHARD.md`, `API_CONTRACT.md` | Human review + staging suite | Gate 1; DoR; Gate 3; staging suite |
| **Genesis** | Greenfield / major upgrade | Full `.iuvareai/` suite | Multi-layer QA + CI/CD regression | Gates 1 + 2; DoR; Gate 3; Gate 4; Final |

**🆕 The anti-fatigue rule:** A track's required-gate column is the *maximum* ceremony for that track. Adding more gates to a low-risk track defeats the purpose of having tracks. When in doubt, escalate to the next track rather than inflating the current one.

---

## 🔄 SECTION 3: The Genesis Track Lifecycle

### 📋 Phase 1 — Exploration & Elicitation
**Objective:** Translate vision into immutable functional & non-functional boundaries.

- **Personas:** Analyst (market alignment, risk, scope boundaries) · PM (requirements, NFRs, epics).
- **Commands:** `*analyze {intent}` · `*spec-out {brief_file}`
- **Artifacts:** `PROJECT_BRIEF.md` · `PRD.md`
- **🚫 Gate 1:** Human signs off on scope. If it isn't in the PRD, no agent may build it.

### 🏗 Phase 2 — Architectural Mapping & Data Contracts
**Objective:** Define system topography, entities, and strict contracts before app code.

- **Personas:** Technical Architect (stack, data flow, models) · Product Owner (shards the PRD).
- **Commands:** `*model-system {prd_file}` · `*shard-epics {prd_file}`
- **Artifacts:** `ARCHITECTURE.md` · `DATAMODEL_CONTRACT.md` (semver-tagged) · `stories/{epic}.{story}.{title}.md`
- **🚫 Gate 2:** Manual verification of schema + integration design. Global interface changes ⇒ **semver-MAJOR** contract bump.

### 🆕 Phase 2b — Definition of Ready (between sharding and coding)
**Objective:** Stop un-ready stories before they waste a Developer run.
Every story shard must pass the **DoR checklist (§8)** — automated via CI — *before* Phase 3. A story that fails DoR returns to `draft` (see State Machine, §9). **This is v3's headline addition.**

### 💻 Phase 3 — Spec-Driven, Context-Engineered Development
**Objective:** Targeted implementation with clean file containment.

- **Personas:** Developer (drafts logic) · Code Reviewer (security + dependency guardrails).
- **Context Window Shield:** each agent receives *only* the shard, `DATAMODEL_CONTRACT.md`, and the target file(s).
- **🚫 Gate 3:** Human Conductor reviews the git diff line-by-line on the PR before staging.

### 🧪 Phase 4 — Autonomous Verification & Self-Healing
**Objective:** Validate and remediate within bounds.

- **Personas:** Test Architect (edge-case matrices) · QA Engineer (runs workflows, assertions).
- **Bounded self-healing (max 3 attempts):**
  ```
  CRITICAL INTERRUPT: Test failure detected.
  - Expected Behavior: [from story shard]
  - Observed Behavior: [error snippet]
  - Attempt: [n / 3]
  Action: Fix this target error without altering adjacent operational parameters.
  ```
  On attempt-3 failure the loop **stops** and escalates to the Release Manager with the **full** attempt history.
- **🚫 Final Gate:** Human validates system performance before production.

---

## 🩹 SECTION 4: The Delta & Refactor Track (Maintenance Flow)

**Assumption:** you're *changing something that already shipped* — most real work after month one.

**Flow:**
1. Orchestrator points the agent at existing code + its original story shard (if any).
2. Agent/human drafts a `DELTA_SHARD.md` carrying a **🆕 `delta_type`**:
   - `behavior` — changes shipped behavior (needs new/updated tests).
   - `fix` — bug fix (needs a regression test proving the fix).
   - `refactor` — no intended behavior change (must pass the *existing* suite unchanged; coverage must not drop).
3. If `DATAMODEL_CONTRACT.md` is touched ⇒ **mandatory semver bump** and dependent stories flagged `stale`.
4. Run against the **existing** regression suite. Goal: prove nothing broke (except for `behavior` deltas, where you prove the intended break).

---

## 🔒 SECTION 5: Cross-Cutting Governance Layers

### 5.1 Agent Sandboxing & Permission Boundaries
**🆕 v3 requires a concrete enforcement mechanism, not just a written policy** (v2's admitted biggest gap). Pick one, in order of weight:

1. **Containerize the whole harness (Docker) — recommended day one.** Mount only `src/`, `tests/`, and the specific `.iuvareai/` artifacts the active persona needs. Read-only mount the contract; read-write only the persona's `writes_to` set.
2. **Micro-VM extension** — worth it only once agents touch real customer data.
3. **Explicit signed-risk acceptance** — document the blast radius if you run un-contained; never default to this for production-adjacent work.

**Required policy (`policies/sandbox.md`):** per-persona `writes_to`/`reads_from` sets (mirrored in each persona file's frontmatter), bash allow-lists per track, and the global context-exclusion list (`.env`, credentials, PII fixtures — never in any context packet, any track).

### 5.2 Budget & Quota Governance
**Unit of budget = weighted quota for subscriptions; dollars for API overflow**
(full detail in `policies/budget.md`).

On flat-rate plans (e.g. Z.ai, OpenAI Codex) you don't pay per token — you pay
for **quota windows** (5h rolling + weekly), consumed at a **time-of-day
multiplier**. So the scarce resource is quota, not money, and *when* you run
agents matters as much as *how much*.

| Track | Quota envelope | Hard ceiling (% of a 5h window) |
|---|---|---|
| Flash | ~10–30 pts | 5% |
| Delta | ~50–150 pts | 15% |
| Blueprint | ~150–500 pts | 25% |
| Genesis | ~500–2000 pts | 40% |

- **Time-of-day lever:** heavy work costs up to 3× at peak — schedule
  Genesis/Blueprint into off-peak hours (esp. the 1× promo window).
- **Runaway guard:** a story that hits its ceiling force-escalates (pairs with
  the 3-attempt self-heal bound).
- **Dollar caps (API overflow only):** Flash ~$0.50 / Delta ~$2 / Blueprint ~$5
  / Genesis ~$25 per story — apply *only* when bursting to a pay-per-token API.

Every session logs **quota + rework signal (§5.8)** per story under
`.iuvareai/metrics/`, not just per sprint.

### 5.3 Conflict Resolution Protocol *(disambiguated from v2)*
Two distinct escalation lanes — v2 conflated them:

- **Quality/code disputes within a phase** (Reviewer↔Developer; "is this a bug?"): loop back to the author, **max 2 cycles**, then escalate to the **human Conductor**.
- **Scope/cross-phase disputes** (Architect↔PM): **cannot self-resolve** — always escalate to the **human Orchestrator**. Agents never negotiate scope unsupervised.
- **Production/self-heal disputes** (3-attempt exhaustion): escalate to the **Release Manager**, then the **human Final Gate**.

> Note: a QA *test failure* is not a dispute — it routes through the bounded self-healing loop, not the conflict protocol. Conflict protocol applies only when humans/agents *disagree on intent*.

### 5.4 Data Contract Versioning
`DATAMODEL_CONTRACT.md` carries `# version: MAJOR.MINOR.PATCH`. Any Genesis/Blueprint change to a field/type/relationship ⇒ **MAJOR** bump. Pure-Delta non-schema changes ⇒ no bump. **CI verifies every shard's `contract_version` is compatible** with the current contract major. Incompatible ⇒ story auto-transitions to `stale`.

### 5.5 Observability & Audit Trail
Every session (Pi JSONL) is archived to `.iuvareai/sessions/{story_id}.jsonl`. **🆕 Metrics are archived to `.iuvareai/metrics/{story_id}.jsonl`** (cost + rework signals). This is the difference between "we used AI" and "we can show exactly what it did, when, who approved, and what it cost."

### 5.6 Rollback & Incident Protocol
Gate 4 includes a **confirmed rollback path** (prior artifact or feature flag) before any Genesis/Blueprint prod change. Self-healing patches that pass tests but regress in prod trigger **automatic rollback to last-known-good**, not a live debug session.

### 🆕 5.7 Secret & Credential Management
"Exclude `.env`" handles *inbound* (secrets never enter context). It says nothing about agents that **legitimately need** access (e.g., a Delta migration test). Rules (`policies/secrets.md`):
- Credentials are **injected at runtime** via the environment/secret manager, never read from files into the context window.
- Staging uses **sanitized** data; prod credentials are never available to Flash/Delta agents.
- Test fixtures use **synthetic** data only — never real PII, even redacted.

### 🆕 5.8 Process Feedback / Retrospective Loop
Cost alone can't improve a framework that runs on prompt quality. Per story, also log a **rework signal**: DoR-fail count, review-rejection count, self-heal attempts used. Aggregate periodically by **persona × track**; personas with high rework get retuned. This is how the framework improves itself.

---

## 🧩 SECTION 6: The Personas (full roster)

Personas are Markdown profiles in `.iuvareai/agents/`, loaded as Pi skills **on demand** (only the active-phase persona is in context — context hygiene). Each carries YAML frontmatter mirroring §5.1 permission sets.

| Persona | Phase | Core responsibility | Primary artifact |
|---|---|---|---|
| **Analyst** | 1 | Market alignment, risk, scope boundaries | `PROJECT_BRIEF.md` |
| **PM** | 1 | Functional/NFRs, epics | `PRD.md` |
| **Technical Architect** | 2 | Stack, data flow, versioned contract | `ARCHITECTURE.md`, `DATAMODEL_CONTRACT.md` |
| **Product Owner** | 2 | Shards the PRD into stories | `stories/*.md` |
| **Developer** | 3 | Context-shielded implementation | `src/`, `tests/` |
| **Code Reviewer** | 3 | Security + dependency guardrails | Review verdict on PR |
| **Test Architect (TEA)** | 4 | Edge-case test matrices | Test plan |
| **QA Engineer** | 4 | Runs workflows, drives bounded self-heal | Pass/fail verdict |
| **Release Manager** | 4/Gates | Gate 4 checklist, rollback path, deploy | Deployment record |
| **🆕 Orchestrator (agent or human)** | all | Sequences stories, enforces DoR, archives sessions | Story state transitions |

> **On the Orchestrator role:** v2 left sequencing implicitly human. v3 makes it an explicit role — you may run it as a human *or* as a lightweight agent. Either way, *someone/something* must own story state transitions and DoR enforcement, or the pipeline drifts.

---

## 🗂 SECTION 7: Shard Schemas (machine-readable)

### 7.1 Story shard (Genesis/Blueprint)
```markdown
---
type: Story
title: user-login-rate-limiting
description: 5-attempt/60s lockout on login.
resource: src/auth/rate_limiter.ts
tags: [auth, security]
timestamp: 2026-07-04T10:00:00Z
epic_id: 001
story_id: 003
track: blueprint
contract_version: "1.4.0"
status: ready            # 🆕 draft | ready | in_progress | review | qa | done | blocked | stale
owner: developer         # 🆕 persona currently responsible
depends_on: [001.002]    # 🆕 story_ids that must be 'done' first
dor_checked_at: 2026-07-03T10:00Z  # 🆕 last CI DoR pass
inputs:
  - src/auth/login.ts
  - .iuvareai/specs/DATAMODEL_CONTRACT.md
expected_outputs:
  - src/auth/rate_limiter.ts
test_criteria:
  - "5 failed attempts within 60s locks the account for 15 minutes"
  - "lockout state persists across server restarts"
max_self_heal_attempts: 3
---

## Context
[Prose: why this story exists]

## Implementation notes
[Prose: constraints, edge cases, things to avoid]
```

### 7.2 Delta shard
```markdown
---
type: Delta
title: auth-rate-limit-delta
description: Rate-limit the login endpoint (delta on shipped code).
resource: src/auth/rate_limiter.ts
tags: [auth, security, delta]
timestamp: 2026-07-04T10:00:00Z
story_id: 004
track: delta
delta_type: behavior     # 🆕 behavior | fix | refactor
contract_version: "1.4.0"
contract_touched: false  # 🆕 true forces a semver bump
status: ready
owner: developer
depends_on: []
dor_checked_at: 2026-07-03T10:00Z
target_files:
  - src/auth/rate_limiter.ts
expected_outputs:
  - src/auth/rate_limiter.ts
  - tests/auth/rate_limit.regression.test.ts
---

## What's changing
[Prose]

## Why
[Prose — cite the incident/request]
```

---

## ✅ SECTION 8: Definition of Ready (DoR)

**A story is *Ready* (eligible for Phase 3) only when all of the following are true.** DoR is checked by CI on the shard's frontmatter + repo state; a failure returns the story to `draft`.

- [ ] `status` is set and transitions are legal per §9.
- [ ] `contract_version` is **compatible** with the current `DATAMODEL_CONTRACT.md` major.
- [ ] Every `inputs` path **exists** in the repo.
- [ ] Every `expected_outputs` path is **declared** (target files known up front).
- [ ] `test_criteria` is **non-empty** and each criterion is **testable** (a human/agent can say how to verify it).
- [ ] Every `depends_on` story is in status `done`.
- [ ] `track` is set and matches the work's risk level.
- [ ] For Delta: `delta_type` and `contract_touched` are set.

> **Why this exists:** v2's thesis was "discipline upstream so debt isn't amplified at machine speed" — but v2 only disciplined *code*, leaving specs to a human sign-off. DoR is the cheap, automatable gate that makes the thesis actually hold.

---

## 🔁 SECTION 9: Story State Machine

```
        ┌──────── Gate 1 (Blueprint/Genesis) ────────┐
        ▼                                            │
     draft ──DoR pass──▶ ready ──assign──▶ in_progress
      ▲                      │                  │
      │                      │             Gate 3 (diff review)
      └──── DoR fail ────────┘                  │
                                                 ▼
                                            review ──approve──▶ qa ──tests green──▶ done
                                                │                  │                    │
                                           reject (≤2)         self-heal (≤3)       merges + deploys
                                                │                  │
                                                ▼                  ▼
                                          (back to dev)      blocked / Release Mgr

     Any story whose contract_version becomes incompatible ──▶ stale
```

**States:** `draft`, `ready`, `in_progress`, `review`, `qa`, `done`, `blocked`, `stale`.

**Rules:**
- **Gate 1** (scope sign-off) is required before any Blueprint/Genesis story reaches `ready`.
- Only the **Orchestrator** (agent or human) writes status transitions.
- Two agents may never hold the same `in_progress` story (enforced by `owner`).
- `stale` is *automatic* when a MAJOR contract bump invalidates a referenced version; it must be manually re-readied.
- `done` requires DoD: all `test_criteria` green, Gate 3 recorded, branch merged.

---

## ✂️ SECTION 10: Sharding Methodology

Sharding is the art of this whole method. Bad shards = context bloat *or* orchestration overhead. Rules (`docs/sharding.md`):

1. **One shard = one verifiable behavior change.** If a shard has two independently testable outcomes, split it.
2. **Independently testable.** A shard's `test_criteria` must be checkable without another shard being done (use `depends_on` for true sequencing).
3. **File-budget heuristic: ≤ 5 touched files** (excluding tests). Exceeding it is a smell — split or justify.
4. **Cite the contract.** Every shard carries `contract_version`.
5. **Single-phase ownership.** Exactly one persona authors a shard (usually the Product Owner).
6. **AC traces to the PRD.** Each `test_criteria` maps to a PRD requirement; orphan criteria are scope creep.
7. **Context-fit.** A shard's `inputs` must fit the target agent's context window alongside the contract. If not, split.

**Anti-patterns to reject:** "and also..." shards (multiple behaviors), mega-shards ("implement auth" — break it down), and contractless shards (no `contract_version`).

---

## 🔀 SECTION 11: Version Control & CI/CD Contract *(new)*

### 11.1 Branching model
- **`main`** is protected and always deployable.
- **One feature branch per story:** `story/{epic}.{story}-{title}` (e.g. `story/001.003-auth-rate-limiting`); the `{epic}.{story}` key mirrors the shard filename so CI can locate the shard from the branch.
- **Squash-merge** with a Conventional Commit message citing the shard path:
  `feat(auth): rate-limit login (story 001.003) [shard: .iuvareai/stories/001.003.user-login-rate-limiting.md]`
- Long-running `release/*` branches only for Genesis; prefer trunk-based otherwise.

### 11.2 Pull-request rules
- PR title/description must reference the shard path (CI parses it).
- **Gate 3** = human reviews the diff on the PR *before* merge to `main`.
- DoR must be green at PR-open time; CI re-checks on every push.

### 11.3 CI pipeline contract (`policies/ci.md`)
| Stage | Trigger | What runs | Blocks |
|---|---|---|---|
| **DoR check** | PR open/push | Shard frontmatter validation, contract-version compat, input existence | ✅ merge |
| **Quality** | PR open/push | Lint, typecheck, unit tests | ✅ merge |
| **Regression** | merge → `main` | Full regression suite (Delta: *existing* suite) | ✅ deploy |
| **Integration** | staging deploy | Staging/integration suite | ✅ prod promote |
| **Contract-guard** | any change to `DATAMODEL_CONTRACT.md` | Verify all open shards still compatible; else flag `stale` | ✅ merge |

---

## 🌍 SECTION 12: Environments & Promotion Model *(new)*

| Env | Purpose | Data | Who promotes |
|---|---|---|---|
| **local** | Dev + Flash | Synthetic | Developer (containerized) |
| **staging** | Blueprint/Genesis verification | **Sanitized** | Release Manager after Gate 3 |
| **production** | Live | Real (credentials never exposed to agents) | Human Final Gate only |

**Promotion criteria:** Flash stops at local + green tests. Delta promotes to prod after regression green + Gate 3. Blueprint requires staging-suite green. Genesis requires Gate 4 (rollback path confirmed) + Final Gate.

---

## 🗂 SECTION 13: Repository Architecture Layout (v3)

```
mallengke-platform/
├── .iuvareai/
│   ├── agents/                    # Persona profiles (frontmatter = permissions)
│   │   ├── analyst.md
│   │   ├── pm.md
│   │   ├── architect.md
│   │   ├── product-owner.md
│   │   ├── developer.md
│   │   ├── code-reviewer.md
│   │   ├── test-architect.md
│   │   ├── qa.md
│   │   ├── release-manager.md
│   │   └── orchestrator.md        # 🆕
│   ├── specs/                     # Active systemic contracts
│   │   ├── PROJECT_BRIEF.md
│   │   ├── PRD.md
│   │   ├── ARCHITECTURE.md
│   │   └── DATAMODEL_CONTRACT.md  # semver-tagged
│   ├── stories/                   # Feature cards (YAML frontmatter + status)
│   │   └── 001.003.user-login-rate-limiting.md
│   ├── deltas/                    # Change requests vs shipped code
│   │   └── 004.auth-rate-limit-delta.md
│   ├── sessions/                  # Archived agent session logs (JSONL)
│   │   └── 001.003.jsonl
│   ├── metrics/                   # 🆕 Per-story cost + rework signals (JSONL)
│   │   └── 001.003.jsonl
│   ├── policies/
│   │   ├── sandbox.md
│   │   ├── budget.md
│   │   ├── secrets.md             # 🆕
│   │   ├── vcs.md                 # 🆕 branching + PR rules
│   │   └── ci.md                  # 🆕 pipeline contract
│   └── docs/                      # 🆕 Methodology references
│       ├── sharding.md
│       ├── definition-of-ready.md
│       ├── state-machine.md
│       └── environments.md
├── src/
├── tests/
└── README.md
```

---

## 🧪 SECTION 14: The 10-Question Orchestration Checklist

Use this to evaluate *any* agent SDLC (yours, BMAD, the next thing). v3's current score is shown.

| # | Question | v3 status |
|---|---|---|
| 1 | **Division of labor** — who does what? | ✅ Personas (§6) |
| 2 | **Sequence** — in what order? | ✅ Phases (§3) |
| 3 | **Handoff contracts** — how work passes between agents | ✅ Shards + contract + DoR |
| 4 | **State management** — where is everything, what's its status | ✅ State machine (§9) |
| 5 | **Context management** — what each agent sees | ✅ Context shield |
| 6 | **Verification** — how do we know it's right | ✅ Tests + DoR + gates |
| 7 | **Governance** — permissions, cost, security | ✅ §5 (sandbox, budget, secrets) |
| 8 | **Recovery** — what when it goes wrong | ✅ Self-heal + conflict lanes + DoR for specs |
| 9 | **Observability** — can we see what happened | ✅ sessions + metrics |
| 10 | **Human-in-the-loop model** — when/how humans intervene | ✅ Trust-threshold gate map (§2) |

*(v2 scored 6/10; v3 closes all four open cells.)*

---

## 🧩 SECTION 15: Pi-Specific Implementation Notes

Pi ships four built-in tools, no sub-agents, no plan mode, no permission system. v3 maps to Pi as follows:

1. **Personas → Pi skills**, loaded on demand (only the active-phase persona in context).
2. **Sub-agents** need an extension for true separate context windows (documented Pi pattern).
3. **Permission gates / sandboxing (§5.1)** must be enforced by containerizing the harness (Docker) or an extension — Pi won't do it. **v3 makes this a requirement, not a recommendation.**
4. **Session logs are already JSONL** — add a post-story step that copies them to `.iuvareai/sessions/` and writes a `.iuvareai/metrics/` entry.
5. **DoR + CI checks (§11)** are ordinary CI jobs reading shard frontmatter — no Pi magic required.
6. **MCP** is available but not default-on; wire it only when a phase needs external data.

---

## 🛣 SECTION 16: Adoption Roadmap

Don't adopt v3 all at once. Recommended sequence:

1. **Shard schema + state machine** (§7, §9) — cheapest high-impact win; adopt today.
2. **VCS + CI contracts** (§11) — unblocks safe automation.
3. **Definition of Ready** (§8) — directly serves the framework's own thesis.
4. **Sandboxing enforcement** (§5.1) — pick Docker now.
5. **Sharding methodology + trust-threshold gates** (§10, §2) — adopt once the above are stable.
6. **Metrics + retrospective loop** (§5.8) — turn on after you have ~20 stories of data.

---

*v3.0 — drafted for review. Each 🆕 section is a candidate for deeper scrutiny before this becomes the permanent SDLC.*
