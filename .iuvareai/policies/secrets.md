---
type: Policy
title: "Secret & Credential Management"
description: "Never ingest secrets; inject at runtime; scope credentials per environment."
tags: [policy, governance, secrets]
timestamp: 2026-07-04
policy: secrets
version: 1.0.0
status: active
last_updated: 2026-07-03
applies_to: [genesis, blueprint, delta, flash]
enforces: ["SDLC v3 §5.7", "Global context exclusions (sandbox.md)"]
---

# Secret & Credential Management

## Purpose
Govern secrets in **two directions**:
1. **Inbound** — secrets never *enter* agent context.
2. **Outbound** — when an agent legitimately *needs* access (a migration test,
   an integration run), it gets credentials safely — **never by reading a secret
   file into the prompt.**

## Inbound: never ingest
- `.env`, API keys, tokens, and real PII are on the **global exclusion list**
  (see `sandbox.md`).
- The sandbox **Pi extension** blocks `read` and `bash cat` on secret paths.
- `.gitignore` must include `.env`, `.env.*`, `*.pem`, `*.key`, and any fixture
  dir holding real data.
- A CI **secret-scan** (e.g. `gitleaks`) runs as a required check (see `ci.md`).

## Outbound: legitimate access via runtime injection
When a story genuinely needs credentials (DB migration test, integration suite,
third-party API):

- Inject at **runtime** via environment variables / the platform secret manager —
  **never** read the secret value into the prompt.
- Code references the *name* (`process.env.DATABASE_URL`), not the literal value.
- The agent never sees the secret; the *process* does.

### Environment scoping

| Env | Credentials | Available to |
|---|---|---|
| **local** | synthetic / throwaway only | Developer (containerized) |
| **staging** | **sanitized-data** creds (realistic but fake) | Release Manager after Gate 3 |
| **production** | real creds, scoped to the `production` CI environment only | Human Final Gate + Release Manager execute |

Production credentials are **never** available to Flash/Delta/local agents and
never present in any persona's context window.

## Data hygiene
- **Test fixtures:** synthetic and deterministic only — never real PII, **even
  redacted**. Redaction leaks; use generators.
- **Staging data:** sanitized (structurally real, values fake).
- **Production data:** never copied into non-prod environments.

## Per-provider note (subscriptions)
Subscription plans (Z.ai, OpenAI Codex) do **not** change secret handling. Your
provider access key is configured on the **harness**, not exposed to personas.
The rules above hold regardless of which provider a story routes to.

## Enforcement summary

| Rule | Mechanism |
|---|---|
| No secrets in context | sandbox extension read-block + exclusion list |
| No secrets in git | `.gitignore` + `secret-scan` CI check |
| Legitimate access | runtime env injection, scoped per environment |
| No real PII | synthetic fixtures only |
| Prod isolation | credentials scoped to the `production` CI environment |
