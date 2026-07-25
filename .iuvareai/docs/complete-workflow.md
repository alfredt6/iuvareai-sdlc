---
type: Methodology
title: "Complete Workflow — Track Selection to Production and Feedback"
description: "Mermaid navigation maps for the complete Iuvare AI SDLC, including tracks, personas, gates, story states, recovery, and release."
tags: [methodology, workflow, mermaid, onboarding]
timestamp: 2026-07-25
doc: complete-workflow
version: 1.0.0
status: active
last_updated: 2026-07-25
audience: [conductor, orchestrator, all-personas]
references: ["SDLC v3.1 §2–§16", "Definition of Ready", "Story State Machine", "CI/CD Pipeline Contract"]
---

# Complete Iuvare AI SDLC Workflow

Use this page as the operational map for deciding **what happens next**. The
canonical specification remains [`IUVARE_AI_SDLC_v3.md`](../IUVARE_AI_SDLC_v3.md);
when this navigation map and the specification disagree, the specification and
active policies win.

## Legend

- **Conductor** — human micro-steering work inside the harness.
- **Orchestrator** — human or agent coordinating state, ownership, gates, and
  audit records.
- **Gate** — human-owned approval; an agent cannot waive it.
- **DoR** — machine-checked structural startability plus Gate-2 semantic review.
- **DoD** — tests green, Gate 3 recorded, artifacts merged, and audit data saved.

---

## 1. Master workflow: request → track → ready work

```mermaid
flowchart TD
    START([Work request, product idea, incident, or change]) --> INSTALLED{Framework installed<br/>and current?}

    INSTALLED -- No --> INSTALL[Install or upgrade from canonical template]
    INSTALL --> CONFORM[Run OKF conformance]
    CONFORM --> ACTIVATE[Activate persona skills and harness permission gate]
    ACTIVATE --> ISOLATE[Enable container or micro-VM isolation<br/>and project CI controls]
    ISOLATE --> CLASSIFY
    INSTALLED -- Yes --> CLASSIFY{Choose the lowest-risk track<br/>that safely contains the work}

    CLASSIFY -- Small local hotfix<br/>or UI tweak --> FLASH
    CLASSIFY -- Change to shipped code --> DELTA
    CLASSIFY -- Isolated feature<br/>or extension --> BLUEPRINT
    CLASSIFY -- Greenfield, major upgrade,<br/>or systemic change --> GENESIS

    subgraph FT[Flash track]
        direction TB
        FLASH[Write TECH_SPEC.md] --> FIMPL[Human Conductor implements<br/>inside the bounded spec]
        FIMPL --> FTEST[Run focused local and unit tests]
        FTEST -- Fail --> FIMPL
        FTEST -- Green --> FG3{Gate 3<br/>human diff review}
        FG3 -- Changes --> FIMPL
        FG3 -- Approved --> FEND([Flash complete at local scope])
    end

    subgraph DT[Delta track]
        direction TB
        DELTA[Load shipped source, tests,<br/>and original shard if available] --> DSHARD[Create DELTA_SHARD.md<br/>delta_type, contract_touched,<br/>inputs, outputs, criteria]
        DSHARD --> DCONTRACT{Data contract touched?}
        DCONTRACT -- Yes --> DBUMP[Architect versions contract<br/>and runs contract guard]
        DBUMP --> DSTALE[Incompatible open shards become stale<br/>and must be re-readied]
        DSTALE --> DDRAFT[Delta status: draft]
        DCONTRACT -- No --> DDRAFT
    end

    subgraph BT[Blueprint track]
        direction TB
        BLUEPRINT[Create PRD_SHARD and API contract] --> BG1{Gate 1<br/>scope approved?}
        BG1 -- Changes --> BLUEPRINT
        BG1 -- Approved --> BDESIGN[Architect and UX define affected<br/>interfaces, flow, and design]
        BDESIGN --> BG2{Gate 2 required?<br/>schema or integration changed}
        BG2 -- Changes --> BDESIGN
        BG2 -- Approved or not applicable --> BPO[Product Owner creates<br/>atomic permission-fit shards]
        BPO --> BDRAFT[Story status: draft]
    end

    subgraph GT[Genesis track]
        direction TB
        GENESIS[Complete PROJECT_SEED.md] --> ANALYST[Analyst asks questions<br/>and writes PROJECT_BRIEF.md]
        ANALYST --> PM[PM writes PRD.md<br/>requirements, NFRs, and epics]
        PM --> GG1{Gate 1<br/>scope approved?}
        GG1 -- Changes --> ANALYST
        GG1 -- Approved --> ARCH[Architect writes architecture,<br/>contract, repository layout,<br/>and bootstrap ownership]
        GG1 -- Approved --> UX[UX Designer writes flows,<br/>accessibility, and UI design]
        ARCH --> PO[Product Owner shards epics]
        UX --> PO
        PO --> GG2{Gate 2<br/>schema, integration, design,<br/>and shards approved?}
        GG2 -- Changes --> ARCH
        GG2 -- Changes --> UX
        GG2 -- Changes --> PO
        GG2 -- Approved --> GDRAFT[Story status: draft<br/>first root toolchain work is<br/>a human Conductor bootstrap]
    end

    DDRAFT --> DELIVERY([Enter universal delivery loop])
    BDRAFT --> DELIVERY
    GDRAFT --> DELIVERY
```

> Flash deliberately stops at local scope in the current trust-threshold model.
> If a “small” change must alter shipped production code, classify it as **Delta**
> so regression and production controls apply.

---

## 2. Universal shard delivery and state machine

This loop applies to Genesis and Blueprint stories and Delta shards.

```mermaid
flowchart TD
    DRAFT([draft]) --> APPROVALS{Required human scope and<br/>design gates recorded?}
    APPROVALS -- No --> WAIT[Stop and obtain the required gate]
    WAIT --> DRAFT
    APPROVALS -- Yes --> DOR[Run scripts/dor-check.mjs]

    DOR --> DORPASS{DoR green?<br/>schema, paths, dependencies,<br/>contract, criteria, permission-fit}
    DORPASS -- No --> AUTHOR[Return to Product Owner or shard author<br/>with every reported failure]
    AUTHOR --> DRAFT
    DORPASS -- Yes --> READY[Orchestrator records ready]

    READY --> ROUTE{All outputs fit the one<br/>declared implementer?}
    ROUTE -- No --> AUTHOR
    ROUTE -- Human Conductor --> HUMAN[Route explicitly to human<br/>reason and bootstrap classification required]
    ROUTE -- Agent persona --> ASSIGN[Select active persona and bind shard<br/>Pi: /iuvare-persona and /iuvare-story]

    HUMAN --> ACTIVE[in_progress<br/>single owner]
    ASSIGN --> ACTIVE
    ACTIVE --> IMPLEMENT[Implement only declared outputs<br/>under contract and sandbox]
    IMPLEMENT --> LOCAL{Local build, lint,<br/>typecheck, and tests green?}
    LOCAL -- No, budget remains --> IMPLEMENT
    LOCAL -- Budget ceiling hit --> BLOCKED[blocked]
    LOCAL -- Yes --> REVIEW[review<br/>Code Reviewer checks security,<br/>dependencies, contract, containment]

    REVIEW --> G3{Gate 3<br/>human line-by-line diff review}
    G3 -- Rejected, cycle 1 or 2 --> ACTIVE
    G3 -- Third dispute --> CONFLICT[Escalate to human Conductor]
    CONFLICT -- Rework approved --> ACTIVE
    CONFLICT -- Cannot resolve --> BLOCKED
    G3 -- Approved --> QA_STATE[qa]

    QA_STATE --> TEA[Test Architect creates edge-case matrix<br/>for Genesis and Blueprint]
    TEA --> QA[QA runs track-required tests<br/>with synthetic or sanitized data]
    QA --> QARESULT{Tests green?}
    QARESULT -- Yes --> DOD[Orchestrator verifies DoD,<br/>archives session and metrics]
    DOD --> DONE([done])

    QARESULT -- No --> ATTEMPTS{Self-heal attempts used<br/>less than 3?}
    ATTEMPTS -- Yes --> PACKET[Issue one bounded failure packet<br/>expected, observed, attempt number]
    PACKET --> ACTIVE
    ATTEMPTS -- No --> BLOCKED

    BLOCKED --> REMEDIATE{Release Manager and human<br/>choose remediation}
    REMEDIATE -- Bounded fix authorized --> ACTIVE
    REMEDIATE -- Abandon or re-scope --> DRAFT

    CONTRACT[Contract MAJOR becomes incompatible] -. any pre-done shard .-> STALE[stale]
    STALE --> REREADY[Update contract_version, inputs,<br/>outputs, and criteria]
    REREADY --> DRAFT

    DONE --> RELEASE([Enter track-specific release flow])
```

### State ownership rule

Only the **Orchestrator** records status transitions. Reviewer and QA verdicts
drive transitions, but they do not directly rewrite the shard. `owner` changes
with workflow custody; immutable `implementer` remains the Phase-3 write
authority.

---

## 3. Release, promotion, rollback, and incident flow

```mermaid
flowchart TD
    DONE([done]) --> TRACK{Track}

    TRACK -- Flash --> FLOK[Focused tests and Gate 3 recorded]
    FLOK --> FSTOP([Complete at local scope])

    TRACK -- Delta --> DREG{Existing regression suite green<br/>and Gate 3 recorded?}
    DREG -- No --> NODEPLOY[Do not deploy<br/>open Delta fix shard]
    DREG -- Yes --> DAPPROVE{Human production approval}
    DAPPROVE -- No --> HOLD[Hold release]
    DAPPROVE -- Yes --> PROD

    TRACK -- Blueprint --> BSTAGE[Release Manager deploys to staging]
    BSTAGE --> BINT{Integration and feature suite green?}
    BINT -- No --> NODEPLOY
    BINT -- Yes --> BG4{Gate 4<br/>rollback path confirmed?}
    BG4 -- No --> HOLD
    BG4 -- Yes --> BFINAL{Human production approval}
    BFINAL -- No --> HOLD
    BFINAL -- Yes --> PROD

    TRACK -- Genesis --> GFULL{Full regression, cross-module,<br/>and migration tests green?}
    GFULL -- No --> NODEPLOY
    GFULL -- Yes --> GSTAGE[Release Manager deploys to staging<br/>with sanitized data]
    GSTAGE --> GINT{Integration, E2E, and<br/>quantified NFR checks green?}
    GINT -- No --> NODEPLOY
    GINT -- Yes --> GG4{Gate 4<br/>rollback artifact or feature flag confirmed?}
    GG4 -- No --> HOLD
    GG4 -- Yes --> GFINAL{Final Gate<br/>human approves production?}
    GFINAL -- No --> HOLD
    GFINAL -- Yes --> PROD[Deploy immutable artifact to production]

    HOLD --> RELEASE_REVIEW[Resolve approval or rollback gap]
    RELEASE_REVIEW --> TRACK
    NODEPLOY --> FIX[Create Delta fix with regression proof]
    FIX --> DELIVERY([Universal delivery loop])

    PROD --> WATCH{Production watch window healthy?}
    WATCH -- Yes --> CLOSE[Close deployment record<br/>retain sessions, metrics, and provenance]
    WATCH -- No --> ROLLBACK[Automatic rollback to last-known-good]
    ROLLBACK --> INCIDENT[Open incident and Delta fix shard]
    INCIDENT --> DELIVERY
    CLOSE --> RETRO[Aggregate rework and budget metrics<br/>by persona and track]
    RETRO --> IMPROVE{Recurring failure pattern?}
    IMPROVE -- Yes --> TUNE[Retune persona, policy, methodology,<br/>or automated control with tests]
    TUNE --> VERIFY[Run framework tests and OKF conformance]
    VERIFY --> UPGRADE[Version, review, publish,<br/>and re-sync project copies]
    IMPROVE -- No --> END([Release complete])
    UPGRADE --> END
```

---

## 4. “What should I do next?” lookup

| Current condition | Next action | Primary authority |
|---|---|---|
| Framework not installed/current | Install or re-sync, run conformance, activate harness integration, enable OS isolation | Human Conductor |
| Greenfield with only an idea | Fill `PROJECT_SEED.md`, then load Analyst | Human → Analyst |
| `PROJECT_SEED.md` complete | Ask clarifying questions and produce `PROJECT_BRIEF.md` | Analyst |
| Brief complete | Produce quantified PRD and epics | PM |
| PRD complete | Obtain Gate 1 scope approval | Human |
| Gate 1 approved | Define architecture, contract, repository/bootstrap ownership, and UX | Architect + UX Designer |
| Architecture/UX complete | Create atomic, source-backed, permission-fit shards | Product Owner |
| Shards/design ready | Obtain Gate 2 where required | Human |
| Shard is `draft` | Run `node scripts/dor-check.mjs <shard>` | Product Owner + Orchestrator |
| Shard is `ready` | Verify routing, select one owner, move to `in_progress` | Orchestrator |
| `implementer: conductor` | Human performs the explicitly declared outputs | Human Conductor |
| Shard is `in_progress` | Implement only outputs and run local quality checks | Developer/declared implementer |
| Shard is `review` | Security/dependency review and Gate 3 | Code Reviewer + Human |
| Shard is `qa` | Edge-case matrix, required suite, bounded self-heal | Test Architect + QA |
| Shard is `blocked` | Stop automation; inspect full attempt history and choose remediation | Release Manager + Human |
| Shard is `stale` | Update it against the new contract and return it to `draft` | Product Owner + Orchestrator |
| Shard is `done` | Follow the track-specific promotion path | Release Manager + Human |
| Production regression | Auto-rollback, open incident, create Delta `fix` | Release Manager + Human |
| Repeated rework pattern | Change the framework with tests, version it, then re-sync projects | Human framework maintainers |

## Operational commands

```bash
# Validate the installed knowledge bundle
node scripts/okf-conformance.mjs

# Pi: regenerate persona skills and install the permission gate
node scripts/activate-pi-skills.mjs

# Check one story or Delta before ready/assignment
node scripts/dor-check.mjs .iuvareai/stories/001.001.example.md

# Verify contract compatibility; default mode never mutates
node scripts/contract-guard.mjs

# Apply automatic stale transitions, then review and commit the changes
node scripts/contract-guard.mjs --write
```

## Non-negotiable stop conditions

Stop and escalate instead of guessing when:

- a required human gate is missing;
- no one implementer can write every expected output;
- a root write is assigned to an agent persona;
- acceptance criteria are semantically vague or outputs cannot satisfy them;
- the data-contract major is incompatible;
- credentials, real PII, or production access would enter agent context;
- the self-heal limit, review-cycle limit, or budget ceiling is exhausted;
- rollback cannot be demonstrated before a production promotion.
