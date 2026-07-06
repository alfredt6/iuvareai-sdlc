---
type: Specification
title: "The Iuvare AI Orchestration Flow (v2.0)"
description: "Superseded predecessor of the Iuvare AI SDLC (v3). Retained for history."
tags: [sdlc, specification, superseded]
timestamp: 2026-07-03
---

# 📜 THE IUVARE AI ORCHESTRATION FLOW (v2.0)
### The Proprietary Software Engineering Blueprint for Iuvare AI

**Changelog from v1.0:** Added Delta Track (maintenance/brownfield), Agent Sandboxing & Permission Boundaries, Budget & Cost Governance, Conflict Resolution Protocol, Observability & Audit Trail, Rollback Protocol, machine-readable story shard schema, and Pi-specific implementation notes.

---

## 📖 SECTION 0: Glossary

New or unfamiliar terms used throughout this document.

| Term | Definition |
|---|---|
| **Harness** | The wrapper software around an AI model that gives it tools (read/write files, run bash, browse the web) and a loop of "think → act → observe → repeat." The model is the brain; the harness is the body it acts through. (Pi, Claude Code, and Cursor's agent mode are all harnesses.) |
| **Sub-agent** | A secondary AI instance spawned by a main agent to handle one isolated sub-task in its own separate context window, then reports a summary back. Keeps the primary conversation from getting cluttered with intermediate work. |
| **Permission gate** | A control point that blocks an agent from taking an action (writing a file, running a command) until a human approves it or a policy explicitly allows it. |
| **Sandboxing** | Running an agent inside a restricted, isolated environment (e.g. a container or micro-VM) so that even a destructive or mistaken command can't touch your real system or production data. |
| **MCP (Model Context Protocol)** | A standard way for an agent to connect to external tools and data sources (a database, Slack, a ticketing system) without hand-coding each integration. |
| **Context window** | The finite amount of text an agent can "see" at once during a task. Feeding it an entire repository wastes this budget on irrelevant files and degrades output quality. |
| **Context shield** | Deliberately filtering what enters the context window — in this framework, only the relevant story shard, the data contract, and the target file, never the whole repo. |
| **Shard** | A single, small, self-contained unit of work broken off from a larger spec (e.g. one story card instead of the entire PRD). |
| **Delta shard** | A shard describing a *change* to existing, already-shipped code, rather than new greenfield work. |
| **Self-healing loop** | An automated cycle where a failing test's error trace is fed back to the coding agent, which attempts a fix — without a human approving each individual retry. |
| **Session** | The complete record of one agent run: every message, tool call, and file edit. Pi stores sessions as JSONL (one JSON object per line), which doubles as an audit log. |
| **Frontmatter (YAML)** | A small block of `key: value` pairs at the top of a markdown file, before the prose starts. Lets software read a file's metadata without parsing English sentences. |
| **Token budget** | A cap on how much text an agent is allowed to consume (input + output) for a given task, used to control cost and stop runaway loops. |
| **Semver (semantic versioning)** | A version numbering scheme (`MAJOR.MINOR.PATCH`) where a MAJOR bump signals a breaking change — used here for `DATAMODEL_CONTRACT.md` so downstream code knows when it must be updated. |

---

## 🏛 SECTION 1: Strategic Foundations

### 1.1 The Shift in Engineering Economics
In the AI-native era, the traditional engineering bottleneck is inverted. Time saved typing syntax is reallocated into **Pristine Specification** and **Autonomous Verification**. An AI agent without hard boundaries accumulates technical debt at machine speed. The Iuvare Flow ensures predictability by moving human discipline upstream — into specs, contracts, and gates — rather than relying on catching problems after code is written.

### 1.2 The Orchestrator-Conductor Hybrid Model
Human team members cycle between two operational modes:

- **The Conductor (Micro-Steering):** Works inside the coding harness (Pi, Cursor, Claude Code) in a tight, conversational execution loop to implement granular changes.
- **The Orchestrator (Macro-Governance):** Coordinates networks of autonomous specialized agents via text-driven contracts, enforcing strict gates before code integrates into production.

### 1.3 The Scale-Domain Intelligence Tracks

| Track | Project complexity | Required Phase 1 & 2 artifacts | Verification method |
|---|---|---|---|
| **Flash** | Hotfixes, minor UI tweaks, simple function adjustments | `TECH_SPEC.md` | Single-run local validation & automated unit tests |
| **Delta** *(new)* | Changes to already-shipped code; brownfield maintenance | `DELTA_SHARD.md` + contract diff check | Regression suite against existing coverage + contract version check |
| **Blueprint** | Isolated features, minor extensions, modular endpoints | `PRD_SHARD.md`, `API_CONTRACT.md` | Human review gate + staging deployment test suite |
| **Genesis** | Greenfield projects, massive system upgrades, new platforms | Full `.iuvareai/` core suite (PRD, Architecture, Story Shards) | Multi-layered autonomous QA + CI/CD regression testing |

**Why Delta Track exists:** v1 had no path for changing existing code without either (a) skipping process entirely, or (b) forcing a full PRD through a change that touches three files. Delta Track closes that gap — see Section 4.

---

## 🔄 SECTION 2: The Genesis Track Lifecycle

*(See the diagram above — this section is the detailed reference for what's in each box.)*

### 📋 Phase 1: Exploration & Elicitation
**Objective:** Translate fluid natural-language product visions into immutable functional and non-functional engineering boundaries.

**Personas:**
- **The Analyst** — evaluates market alignment, identifies architectural risks, outlines primary feature goals.
- **The PM** — translates objectives into strict user hierarchies, functional specifications, and initial performance metrics.

**Commands:** `*analyze {intent_description}` (generates competitive risks) · `*spec-out {brief_file}` (outputs structural markdown PRD)

**Artifacts:** `PROJECT_BRIEF.md` (vision, scope, out-of-scope declarations) · `PRD.md` (Functional/Non-Functional Requirements, epics)

**🚫 Gate 1:** Human signs off on scope. If a feature isn't in `PRD.md`, coding agents are hard-blocked from building it later.

### 🏗 Phase 2: Architectural Mapping & Data Contracts
**Objective:** Define system topography, entity relations, and strict technical contracts before any application code is written.

**Personas:**
- **The Technical Architect** — recommends stacks, constructs data flow mapping, outlines data models.
- **The Product Owner** — shards the PRD into isolated implementation files.

**Commands:** `*model-system {prd_file}` · `*shard-epics {prd_file}`

**Artifacts:** `ARCHITECTURE.md` · `DATAMODEL_CONTRACT.md` (versioned — see 4.4) · `/stories/{epic_id}.{story_id}.{title}.md`

**🚫 Gate 2:** Manual verification of schema and integration design. Changes to global interfaces require a semver-major bump of the contract file.

### 💻 Phase 3: Spec-Driven Context-Engineered Development
**Objective:** Rapid, targeted code implementation with clean file containment, avoiding context bloat and hallucinated logic.

**Personas:**
- **The Developer** — reads the filtered context packet and drafts application logic.
- **The Code Reviewer** — inspects output against security guardrails and dependency rules.

**Operational Execution (Context Window Shield):** Each agent receives only:
- The specific story shard file
- `DATAMODEL_CONTRACT.md`
- The target application file being modified

**🚫 Gate 3:** The human Conductor reviews git diffs line-by-line before pushing to staging.

### 🧪 Phase 4: Autonomous Verification & Self-Healing
**Objective:** Continuously validate and remediate broken loops or regressions — within bounds.

**Personas:**
- **The Test Architect (TEA)** — models edge-case test matrices from PRD acceptance rules.
- **The QA Engineer** — runs integration workflows, triggers compilation/runtime assertions.

**The Self-Healing Sequence (bounded — new in v2):**
```
CRITICAL INTERRUPT: Test failure detected.
- Expected Behavior: [stated in story shard]
- Observed Behavior: [error log snippet]
- Attempt: [n / 3]
Action: Fix this target error without altering adjacent operational parameters.
```
If attempt 3 also fails, the loop **stops automatically** and escalates to the Release Manager with the full attempt history attached (not just the last error). No infinite retries — a loop that can't converge in 3 tries needs human judgment, not a 4th guess.

**🚫 Final Gate:** Human validates final system performance before production deployment.

---

## 🩹 SECTION 3: The Delta Track (Maintenance Flow)

Genesis and Blueprint assume you're building something new. Delta Track assumes you're **changing something that already shipped** — which, realistically, is most of what happens after month one of a live SaaS product.

**Flow:**
1. Orchestrator points the agent at the existing code + its original story shard (if one exists).
2. Agent (or human) drafts a `DELTA_SHARD.md`: what's changing, why, and — critically — whether it touches anything defined in `DATAMODEL_CONTRACT.md`.
3. If the contract is touched, a semver bump is mandatory (see 4.4) and any dependent stories are flagged as stale.
4. Code changes run against the *existing* regression suite, not a fresh one — the goal is proving nothing broke, not re-proving everything works.

This is what keeps your specs from becoming fiction six weeks after launch.

---

## 🔒 SECTION 4: Cross-Cutting Governance Layers

These apply across all tracks and all phases, not just at the end.

### 4.1 Agent Sandboxing & Permission Boundaries
**Why this matters for you specifically:** Pi ships with four tools (read, write, edit, bash) and, by default, runs with the full filesystem and process permissions of whoever launched it. There is no built-in approval gate. This is different from some other harnesses that ship permission systems out of the box — with Pi, you build it.

**Required policy (`policies/sandbox.md`):**
- Which directories each persona may write to (e.g. Developer persona: `src/` and `tests/` only, never `.iuvareai/specs/`)
- Whether bash execution is unrestricted or allow-listed per track (Flash Track can be looser; Genesis Track touching production-adjacent code should not be)
- Which of Pi's documented isolation patterns you standardize on — containerizing the whole process (Docker) is the simplest starting point for a small team; a micro-VM extension is worth it only once you're running agents against real customer data.
- Explicit exclusion list for context packets: `.env`, credentials, and any PII in test fixtures are never included in what's fed to an agent, regardless of track.

### 4.2 Budget & Cost Governance
- Each track has a **token/cost cap** before it forces escalation to a human (exact numbers depend on your usage patterns — start conservative and loosen once you have data).
- Every session logs cost per story as an output artifact, not just per sprint — this is what makes "which track actually saves money" answerable later.

### 4.3 Conflict Resolution Protocol
When two personas disagree (Code Reviewer rejects the Developer's output; Architect and PM scope collide):
- **Reviewer ↔ Developer:** Reviewer's notes loop back to Developer, max 2 cycles, then escalate to the human Conductor.
- **Cross-phase disagreement (Architect vs. PM):** Cannot self-resolve — always escalates to the human Orchestrator. Agents don't get to negotiate scope with each other unsupervised.

### 4.4 Data Contract Versioning
`DATAMODEL_CONTRACT.md` carries a semver header (`# version: 1.4.0`). Any Genesis or Blueprint change that alters a field, type, or relationship requires a MAJOR bump. Delta Track changes that don't touch the schema require no bump. CI checks that any story shard referencing the contract cites a compatible version — this is what stops a stale story from silently generating code against an outdated schema.

### 4.5 Observability & Audit Trail
Every agent session (Pi's session JSONL, or equivalent from your harness) is archived under `.iuvareai/sessions/{story_id}.jsonl`, not left on a local machine. This is the difference between "we used AI to build this" and "we can show exactly what the AI did, when, and who approved it" — the latter is what makes this defensible IP and audit-ready for enterprise clients.

### 4.6 Rollback & Incident Protocol
The Release Manager's Gate 4 checklist now includes: confirmed rollback path (previous deployment artifact or feature flag) before any Genesis or Blueprint Track change goes to production. Self-healing patches that pass tests but regress in production trigger automatic rollback to last-known-good, not a live debugging session in prod.

---

## 🗂 SECTION 5: Story Shard Schema (machine-readable)

v1 shards were pure prose. v2 adds YAML frontmatter so shards can be validated and diffed programmatically, while keeping prose for the narrative a human (or agent) actually reads.

```markdown
---
epic_id: 001
story_id: 003
title: user-login-rate-limiting
track: blueprint
contract_version: "1.4.0"
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
[Prose: why this story exists, what problem it solves]

## Implementation notes
[Prose: constraints, edge cases, things to avoid]
```

---

## 🗂 SECTION 6: The Repository Architecture Layout (v2)

```
mallengke-platform/
├── .iuvareai/
│   ├── agents/                    # Markdown profiles for AI roles
│   │   ├── analyst.md
│   │   ├── pm.md
│   │   ├── architect.md
│   │   └── QA.md
│   ├── specs/                     # Active systemic contracts
│   │   ├── PROJECT_BRIEF.md
│   │   ├── PRD.md
│   │   └── DATAMODEL_CONTRACT.md  # semver-tagged
│   ├── stories/                   # Isolated feature cards (YAML frontmatter)
│   │   ├── 001.auth.login.md
│   │   └── 002.discovery.search.md
│   ├── deltas/                    # NEW — change requests against existing code
│   │   └── 001.auth.rate-limit-delta.md
│   ├── sessions/                  # NEW — archived agent session logs, per story
│   │   └── 001.003.jsonl
│   └── policies/                  # NEW
│       ├── sandbox.md             # permission boundaries per persona
│       └── budget.md              # token/cost caps per track
├── src/
├── tests/
└── README.md
```

---

## 🧩 SECTION 7: Pi-Specific Implementation Notes

Pi (the harness you're using) is deliberately minimal — four built-in tools, no sub-agents, no plan mode, no permission system out of the box. That's a design choice by its maintainer, not a missing feature: Pi expects *you* to build the workflow-specific behavior as TypeScript extensions, and hot-reload them as you go.

What that means concretely for implementing this framework:

1. **Personas** map naturally to Pi's `AGENTS.md` (project-level instructions) and skills system — each persona (Analyst, Architect, Developer, QA) can be a skill loaded on demand rather than a permanently-loaded system prompt, which keeps context lean.
2. **Sub-agents don't exist by default** — if you want the Analyst and PM to run as genuinely separate context windows rather than one long conversation wearing different hats, you'll need to add a sub-agent extension (this is a documented, common pattern in the Pi ecosystem, not something you'd be building from zero).
3. **Permission gates need to be built** — Section 4.1's sandbox policy isn't just documentation with Pi; it has to be enforced by an extension or by containerizing the whole process. This is the single biggest gap between what your framework describes and what Pi gives you on day one.
4. **Session logs are already JSONL** — Section 4.5's audit trail is nearly free with Pi; you mainly need a step that copies session files into `.iuvareai/sessions/` after each story.
5. **MCP integration exists but isn't default-on** — if Phase 3's context packets need to pull from external systems, that's an extension too.

None of this is a knock on Pi — it's the tradeoff of a minimal harness. The next question is whether that tradeoff is the right one for you right now.
