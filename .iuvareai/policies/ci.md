---
type: Policy
title: "CI/CD Contract v4"
description: "Risk-proportionate readiness, quality, independent review, artifact, and promotion controls."
tags: [policy, ci, delivery]
timestamp: 2026-07-25
policy: ci
version: 2.0.0
status: active
applies_to: [direct, standard, controlled]
---
# CI/CD Contract

## Required by lane

| Stage | Direct | Standard | Controlled |
|---|---:|---:|---:|
| Focused quality | yes | yes | yes |
| Task readiness | no committed artifact | required | required |
| Independent review | configurable | required | required + security focus |
| Regression/integration | affected checks | required | required |
| Secret scan | on committed work | required | required |
| Immutable artifact | if released | required for release | required |
| Environment approval | risk-based | risk-based | required |
| Rollback evidence | if released | required | required and tested |
| Provenance/SBOM | project policy | recommended | required |

Canonical readiness command:

```bash
node scripts/task-check.mjs .iuvareai/tasks/<task>.md
```

`dor-check.mjs` remains a compatibility router for v3 shards. Quality checks
must run as early as possible. Peer review and automated evidence replace
centralized change boards for normal changes.

## Promotion

Build once, attest, and promote the same immutable artifact. Production and cloud credentials exist only in the protected execution
environment or protected provider profile. Critical deployment and cloud
commands receive exact-action approval. Provider login, secret retrieval, and
credential-bearing command arguments remain outside agent execution. On production regression, rollback automatically
or immediately, retain evidence, and open a fix WorkItem.

This template supplies framework tests and policy hooks. Adopters must wire
branch protection, secret scanning, environments, provenance, deployment, cloud
provider audit logs, budget alerts, and rollback in their platform;
documentation is not enforcement.
