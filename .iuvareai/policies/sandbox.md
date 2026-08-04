---
type: Policy
title: "Task-Scoped Agent Security"
description: "Exact task capabilities, risk-based approvals, forbidden data, and OS isolation."
tags: [policy, security, task-capabilities]
timestamp: 2026-07-25
policy: sandbox
version: 2.0.0
status: active
applies_to: [direct, standard, controlled]
---
# Task-Scoped Agent Security

## Authority

Personas are expertise lenses and confer no permissions. Every mutation is
controlled by a short-lived task grant containing goal, lane, risk, read scope,
exact write files, optional file-operation destination trees and move deletions,
command classes, verification, approval, and expiry.

- No grant: safe discovery reads inside the active repository and inspection
  commands only.
- Active grant: reads and writes must fit the scope; built-in writes are exact
  repository-local files.
- External sources: exact absolute files or directory prefixes in `reads` are
  canonicalized and always human-previewed. They are read-only; external writes,
  moves, deletions, filesystem roots, secret-like paths, and VCS metadata are
  forbidden. Authorized files may be inspected, used as image inputs, or copied
  into an authorized repository-local output.
- Image transforms: use `iuvare_image_operation` with an authorized read source,
  exact write target, and the low-risk `image` command class.
- Copy/move/mkdir: use `iuvare_file_operation`; destination trees and move
  deletions receive a human preview. Raw shell transfer commands are blocked.
- Local Docker application image builds: request the `container` command class
  in a Controlled/critical grant. The exact build command receives a second
  confirmation. Push/export-to-registry is a release action, and unrelated
  Docker commands remain blocked.
- Cloud operations: request the `cloud` command class in a
  Controlled/critical grant and use `iuvare_cloud_operation`. The tool runs only
  an allowlisted provider CLI without a shell, rejects credential and forbidden
  secret/privilege arguments, redacts bounded output, and asks for confirmation
  of every exact action. Raw cloud CLI commands through `bash` are blocked.
- Expansion: replace the grant explicitly; never silently widen it.
- Expiry: 60 minutes by default.

## Approval

- Low risk is auto-authorized from the explicit user task.
- Medium/high scope receives a human preview of goal, external read-only inputs,
  writes, commands, and risk.
- Critical container-build, cloud, release, and destructive commands receive
  exact-command approval at execution time. Cloud approval is per invocation;
  changed arguments require a new confirmation.
- Non-interactive execution fails closed when approval is required.

## Classification

Normal project docs/source/tests are low. External source reads, scoped directory
transfers, manifests, and dependencies are medium.
CI, framework policy, infrastructure definitions, and migrations are high.
Live cloud/server mutation, production, destructive mutation, and privilege
change are critical. Root location alone
does not imply danger.

## Forbidden data

`.env` values, credentials, keys, tokens, secret stores, and real PII are never
read, written, logged, or included in fixtures. Synthetic data only.

## Layered enforcement

1. WorkItem readiness for Standard/Controlled work.
2. Harness interception (`iuvare_request_scope` in Pi).
3. Container or micro-VM isolation for production-adjacent shell/process work.
4. CI/environment policy for artifacts, credentials, approval, and rollback.

The harness interceptor is not an OS sandbox. External read authorization does
not grant shell/process access beyond the surrounding OS isolation. Cloud CLIs
must run inside a container or micro-VM with only the preinstalled provider CLI
and least-privilege, short-lived credential required by the approved task. Project
documentation is a normal agent output when its exact path is in the task grant. Reusable `.iuvareai/docs/`
methodology is a protected framework path and requires Controlled approval.
