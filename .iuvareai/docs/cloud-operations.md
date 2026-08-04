---
type: Methodology
title: "Credential-Safe Cloud Operations"
description: "Configure approved cloud infrastructure without placing provider credentials in agent context."
tags: [methodology, cloud, infrastructure, secrets]
timestamp: 2026-07-25
---
# Credential-Safe Cloud Operations

## Boundary

Cloud server creation, deployment, and configuration are Controlled/critical
operations. Agents use `iuvare_cloud_operation`, never raw provider commands in
`bash`. Every operation requires both an approved task scope with the `cloud`
command class and a second confirmation showing the exact provider CLI action.
Non-interactive runs fail closed.

The built-in provider allowlist is:

| Provider | CLI |
|---|---|
| DigitalOcean | `doctl` |
| Zeabur | `zeabur` |
| AWS | `aws` |
| Azure | `az` |
| Google Cloud | `gcloud` |
| Terraform | `terraform` |
| Pulumi | `pulumi` |
| Fly.io | `flyctl` |
| Railway | `railway` |
| Vercel | `vercel` |

No arbitrary executable or agent-authored shell command is accepted. The tool
resolves the CLI to a canonical executable outside the project, displays that
absolute path for approval, and starts it with a structured argument array and
`shell: false`. Windows `.cmd`/`.bat` shims are rejected; use a native executable
or the required isolated Linux/WSL environment. Provider CLIs, Terraform
providers, or Pulumi programs can still
start their own child processes, so OS isolation remains mandatory. Add another
provider through a reviewed framework change rather than a `custom` escape
hatch.

## Credential setup

Never paste an API key into chat, a prompt, task metadata, a repository file, a
CLI argument, or a tool parameter. Before starting Pi, the operator must:

1. Install and pin the required provider CLI from its official distribution.
2. Create a short-lived, least-privilege credential limited to the required
   account, project, resource types, actions, and environment.
3. Authenticate the CLI outside the agent session using the provider's protected
   credential profile, browser login, workload identity, managed identity, OS
   keychain, secret manager, or protected environment injection. Common cloud
   credential/profile paths and `/proc`/`sys`/`dev` pseudo-files are blocked from
   agent reads.
4. Start Pi inside the required container or micro-VM with only that credential
   and provider CLI available.
5. Revoke or expire the credential after the task and rotate it immediately if
   any output suggests exposure.

For DigitalOcean, configure a named `doctl` context outside Pi and give the token
only the required custom scopes and expiration. For Zeabur, complete browser or
token login outside Pi and let the CLI use its protected persisted context. Do
not ask the agent to run authentication commands or provide `--token`,
`--access-token`, `--api-key`, password, or secret arguments.

## Execution flow

A cloud-only task may leave repository outputs empty:

```yaml
goal: Create the approved staging application server
lane: controlled
risk: critical
reads: []
writes: []
write_trees: []
deletes: []
commands: [cloud]
verification:
  - Health check succeeds
  - Monitoring and rollback are configured
```

After scope approval, the agent calls the dedicated tool with non-secret CLI
arguments, for example a DigitalOcean droplet action or a Zeabur deployment
action. The confirmation dialog displays the exact executable and arguments.
Approval is for that invocation only and cannot be replayed for changed
arguments.

Prefer declarative, reviewable configuration: Terraform/Pulumi plans,
cloud-init, immutable images, and repository-owned deployment manifests. Use
remote/encrypted state for Terraform or Pulumi; do not allow credentials or
sensitive state to be written into the repository. Use those mechanisms to
configure operating-system packages and services instead of opening an
unrestricted interactive SSH shell. Plans and previews do not replace
exact approval for the mutating action.

## Forbidden operations

The tool rejects:

- credential-bearing flags or values;
- provider authentication/login/configuration commands;
- secret and credential retrieval;
- common privilege-management and service-account key operations;
- raw cloud CLI execution through `bash`;
- execution without an interactive approval surface.

Provider output is heuristically redacted and capped at 20 KB/500 lines before
it reaches model context. This is defense in depth, not permission to run
commands expected to return secrets. Secret-returning operations remain
forbidden. If a provider unexpectedly emits a credential, stop, revoke it, and
retain only sanitized incident evidence.

## Completion and rollback

Before execution, define resource names, region, size, network/firewall rules,
budget limits, health checks, observability, and rollback/destroy steps. Verify
the deployed endpoint without exposing customer data. On regression, roll back
or destroy the newly created resource first, then diagnose from sanitized logs.
Retain the task grant, exact-action approval, provider audit trail, verification,
and rollback evidence.
