---
type: Methodology
title: "Controlled Delivery"
description: "High-impact and regulated delivery with explicit approval and evidence."
tags: [methodology, workflow, controlled]
timestamp: 2026-07-25
---
# Controlled Delivery

Follow Standard Delivery plus only the controls justified by the risk:

1. Record relevant design, threat, migration, compliance, or rollback evidence
   under `.iuvareai/evidence/`.
2. Obtain human approval of the exact task scope before mutation.
3. Use isolated maker and security/QA checker contexts.
4. Build an immutable artifact and verify rollback in staging.
5. Require protected-environment approval for production.
6. Require a second, exact-parameter confirmation for critical execution such as
   deployment, destructive mutation, or privilege change.

Secrets and production data never enter agent context. Container or micro-VM
isolation is mandatory.
