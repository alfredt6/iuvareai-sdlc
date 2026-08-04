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
- Inject credentials at execution time through the platform, workload identity,
  OS keychain, secret manager, or protected provider CLI profile; never write
  them to repository files, task metadata, prompts, tool arguments, or logs.
- Cloud provider authentication is completed by the operator outside the agent
  session. Agents may use the resulting least-privilege CLI context but may not
  run login/auth/configure commands or request credential values. Common cloud
  credential/profile directories and OS process-environment pseudo-files are
  excluded from task reads.
- Direct/Standard agents never receive production credentials.
- Controlled production/cloud execution occurs in a protected environment after
  exact-action approval; secret-returning operations are forbidden and output is
  bounded and redacted before entering agent context.
- Scope credentials to the least privilege, provider account/project, resource
  types, actions, environment, and duration. Prefer expiring credentials and
  workload identity over long-lived personal API keys.
- Redact audit output and rotate any credential suspected of exposure.
- Secret scanning is required for committed work and blocks release on findings.
