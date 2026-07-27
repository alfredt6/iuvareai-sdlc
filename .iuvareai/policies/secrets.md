---
type: Policy
title: "Secrets and Sensitive Data"
description: "Never ingest secrets or real PII; inject credentials only in protected execution environments."
tags: [policy, secrets, privacy]
timestamp: 2026-07-25
policy: secrets
version: 2.0.0
status: active
applies_to: [direct, standard, controlled]
---
# Secrets and Sensitive Data

- Never read `.env` values, credentials, tokens, private keys, secret-store
  exports, or real PII into agent context.
- Use synthetic fixtures and sanitized staging data.
- Inject credentials at execution time through the platform; never write them to
  repository files or logs.
- Direct/Standard agents never receive production credentials.
- Controlled production execution occurs in a protected environment after
  exact-action approval; the agent sees only success/failure, not secret values.
- Scope credentials to the least privilege, resource, environment, and duration.
- Redact audit output and rotate any credential suspected of exposure.
- Secret scanning is required for committed work and blocks release on findings.
