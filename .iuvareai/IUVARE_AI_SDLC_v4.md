---
type: Specification
title: "The Iuvare AI SDLC (v4.0 Lean)"
description: "A task-scoped, risk-based AI software delivery framework optimized for flow, verification, and enterprise control."
tags: [sdlc, specification, task-capabilities, lean]
timestamp: 2026-07-25
---

# The Iuvare AI SDLC v4.0 Lean

> **Canonical specification.** v4 replaces persona-bound authorization and the
> four v3 tracks with task-scoped capabilities and three risk-proportionate
> delivery lanes. v3 shards remain supported by compatibility validators during
> migration, but new work follows this specification.

## 1. Objective

Iuvare exists to deliver production-grade software quickly. Quality comes from
small changes, explicit acceptance, independent verification, automated checks,
and risk-based approval—not from mandatory role handoffs.

Core flow:

```text
intent → classify → authorize exact task scope → execute → verify → release
```

Most steps are automated. Humans intervene for ambiguity, business decisions,
high-impact repository changes, and irreversible/external actions.

## 2. Five principles

1. **Task scope is authority.** A short-lived capability names exact output
   files, allowed reads, command classes, verification, risk, and expiry.
2. **Personas are optional lenses.** Analyst, Architect, UX, and other skills add
   expertise; they never grant or remove file access.
3. **Process follows risk.** Low-risk work stays direct. Controls increase only
   when impact increases.
4. **Small batches, independent checks.** Prefer reviewable changes completed in
   hours. Standard and Controlled work receive independent verification.
5. **Evidence over ceremony.** Tests, diffs, approvals, artifacts, and audit
   records are controls. Manual persona switching is not.

## 3. Delivery lanes

| Lane | Use when | Required record | Minimum controls |
|---|---|---|---|
| **Direct** | Docs, tests, small local code, safe project files | Session task grant | Exact outputs, focused verification, diff review |
| **Standard** | Features, fixes, refactors, normal production changes | Compact `.iuvareai/tasks/*.md` work item | Task readiness, CI, independent review, rollback-aware release |
| **Controlled** | Auth/security, schema/migrations, CI/infra, regulated or high-impact work | Work item + relevant design/threat/evidence artifacts | Human scope approval, independent security/QA, protected environment approval |

A greenfield product is an initiative, not a permanent heavy lane. Establish
only the brief architecture and product boundaries needed to start, then deliver
vertical slices as Standard or Controlled work items.

## 4. Task capability model

Before mutation, an agent requests a scope:

```yaml
goal: Create the customer-master requirements checklist
lane: direct
risk: low
reads:
  - specs/customer-master/
writes:
  - docs/customer-master/CRT_CUSTOMER_MASTER_REQUIREMENTS_CHECKLIST.md
commands: [quality]
verification:
  - Markdown lint passes
  - Every checklist entry cites a source requirement
```

Rules:

- `writes` contains exact files for built-in write/edit operations.
- `write_trees` contains human-previewed destination directory prefixes used
  only by the dedicated file-operation tool.
- `deletes` names source files/directories that a move may remove.
- `reads` contains exact files or directory prefixes and excludes secrets/PII.
  Design screenshots and image directories are valid read inputs.
- For visual implementation, inspect each relevant image before coding using a
  vision-capable model; never infer design content from filenames alone.
- Crop, resize, rotate, flip, convert, and adjust raster images through
  `iuvare_image_operation` with the source in `reads`, exact target in `writes`,
  and the `image` command class.
- A replacement scope is requested when work legitimately grows.
- Grants expire after 60 minutes by default and are retained in the session log.
- Low-risk normal work is auto-authorized from the explicit user task.
- Medium/high scope receives one human preview and confirmation.
- Critical actions receive parameter-bound approval again at execution time.
- Copy, move, and directory creation use `iuvare_file_operation` with the
  `filesystem` command class; raw `cp`/`mv`/`rsync`/`mkdir` stay blocked.
- Non-interactive runs fail closed when human approval is required.

## 5. Risk classification

| Risk | Examples | Approval |
|---|---|---|
| **Low** | `docs/`, `src/`, `tests/`, safe README changes, image transforms, inspection, tests | Automatic task grant |
| **Medium** | Dependencies, manifests, lockfiles, build config, network calls | Scope preview + human confirmation |
| **High** | CI, agent/framework policy, infrastructure, migrations, database mutation | Controlled lane + human confirmation + independent review |
| **Critical** | Production deployment, destructive data/files, privilege changes | Exact-action approval, expiry/replay protection, audit |

Secrets, private keys, credentials, and real PII are forbidden to agent context
in every lane. Risk is based on impact, not merely on whether a file is at the
repository root.

## 6. Work items

Direct work needs no committed shard. Standard and Controlled work use one
compact work item:

```markdown
---
type: WorkItem
title: customer-master-import
description: Import validated customer master records.
lane: standard
risk: medium
status: proposed
reads: [src/customer/import.ts]
writes: [src/customer/import.ts, tests/customer/import.test.ts]
write_trees: []
deletes: []
commands: [quality, build]
acceptance:
  - Invalid rows are rejected with row-level reasons
verification:
  - Unit and integration tests pass
contract_touched: false
---
```

`contract_version` is required only when `contract_touched: true`. Documentation,
frontend-only, and unrelated work do not carry irrelevant data-contract fields.

## 7. Lifecycle

```text
proposed → ready → in_progress → review → done
     ↘          ↘          ↘       ↘
                    blocked
```

A validated command records legal transitions; Git/PR/CI integrations may derive
them automatically. No persona owns status metadata. `done` means acceptance and
verification are green, review requirements are met, and evidence is retained.

## 8. Expertise and execution

The default agent may create documentation, source, tests, and safe project
configuration when exact files are authorized. Specialist skills are loaded
only when useful:

- Analyst/PM for product discovery and measurable requirements.
- Architect/UX for system or experience decisions.
- Product Owner for difficult decomposition.
- Developer/Delivery Agent for implementation.
- Code Reviewer/Test Architect/QA as independent verifier lenses.
- Release Manager for release planning; critical execution remains separately
  authorized.
- Orchestrator for portfolio coordination, never for routine metadata edits.

For Standard/Controlled work, maker and checker should use independent contexts
and preferably independent model instances.

## 9. Verification and gates

| Control | Direct | Standard | Controlled |
|---|---:|---:|---:|
| Exact task scope | required | required | required |
| Acceptance + verification | concise | required | required |
| Automated quality checks | focused | required | required |
| Independent review | optional/configurable | required | required, security-aware |
| Human scope approval | only medium+ | only medium+ | required |
| Production/environment approval | if deployed | risk-based | required |
| Rollback evidence | if deployed | required for production | required and tested |

Peer review and automation are preferred to centralized approval queues. No gate
is added merely because a previous change failed; improve tests, observability,
or policy classification instead.

## 10. Repository architecture

```text
.iuvareai/
├── IUVARE_AI_SDLC_v4.md       # reusable canonical specification
├── agents/                    # optional expertise lenses
├── policies/                  # enforced rules
├── docs/                      # reusable methodology only
├── specs/                     # project systemic decisions
├── tasks/                     # Standard/Controlled work items
├── evidence/                  # project test, approval, threat, release evidence
├── stories/ deltas/           # v3 compatibility during migration
└── sessions/ metrics/         # runtime audit and flow metrics
docs/                          # project/product/operations documentation
src/ tests/                    # implementation and verification
```

Supported raster design inputs are `jpg`, `jpeg`, `png`, `gif`, `webp`, and
`bmp`. Pi's `read` tool sends these as model attachments. SVG can be inspected as
text, but a raster screenshot is required when rendered appearance is the source
of truth. Project evidence never goes in `.iuvareai/docs/`. Framework files are protected
high-risk paths; project artifacts remain writable through exact task grants.

## 11. Security layers

1. **Task readiness** checks scope shape, path safety, risk fit, acceptance, and
   verification before Standard/Controlled execution.
2. **Harness interception** enforces active grant reads, exact writes, command
   classes, expiry, and approvals.
3. **OS isolation** contains shell/process behavior. Containers or micro-VMs are
   mandatory for production-adjacent work.
4. **CI and environment controls** enforce independent checks, immutable
   artifacts, provenance, secret scanning, approvals, and rollback.

A harness interceptor is not an OS sandbox.

## 12. Release model

- Build once and promote an immutable artifact.
- Normal low-risk production changes use peer review, CI, monitoring, and a
  rollback path rather than a centralized approval board.
- Controlled releases require protected-environment approval.
- Production credentials are injected by the platform and never enter agent
  context.
- On regression, rollback first and open a new fix work item; do not live-debug
  production.

## 13. Bounded autonomy

Agent loops require clear verification and stopping conditions. Standard bounds:

- maximum three implementation/test repair attempts;
- maximum two independent-review rework cycles before human escalation;
- task-grant expiry;
- lane budget ceiling;
- immediate stop on forbidden data, privilege escalation, or ambiguous critical
  action.

## 14. Metrics

Measure outcomes and friction by lane:

- lead time and deployment frequency;
- change-failure and rollback rate;
- task-readiness failure count;
- review rework and self-heal attempts;
- blocked tool calls and scope expansions;
- human approval wait time;
- manual persona switches (target: zero);
- quota/cost.

Retune policy when controls produce frequent false blocks. Never weaken a
security boundary without evidence and an explicit policy change.

## 15. Migration from v3

1. Keep existing stories/deltas valid through `dor-check.mjs` compatibility.
2. Create new work as Direct grants or v4 WorkItems.
3. Stop using `implementer` and persona `writes_to` as runtime authority.
4. Move project test/release notes from `.iuvareai/docs/` to
   `.iuvareai/evidence/`, `tests/`, or project `docs/`.
5. Replace `/iuvare-persona` and `/iuvare-story` with automatic
   `iuvare_request_scope` calls.
6. Convert pipeline checks incrementally; do not block current delivery on a
   bulk migration.

*v4.0 Lean — task-scoped authority, optional expertise lenses, risk-based flow.*
