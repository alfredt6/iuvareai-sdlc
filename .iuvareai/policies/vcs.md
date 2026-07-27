---
type: Policy
title: "Version Control Policy v4"
description: "Small batches, peer review, traceability, and revertible delivery."
tags: [policy, vcs]
timestamp: 2026-07-25
policy: vcs
version: 2.0.0
status: active
applies_to: [direct, standard, controlled]
---
# Version Control Policy

- Keep `main` protected, green, and deployable.
- Prefer short-lived branches and small pull requests.
- Standard/Controlled PRs cite their WorkItem; Direct changes may cite the
  session/task summary.
- Require peer or independent review for Standard/Controlled work. Low-risk
  Direct work may use configured diff review without a separate approval queue.
- Require applicable quality, secret, and readiness checks.
- Squash or otherwise preserve one clear revert unit per outcome.
- Never commit secrets or real PII.
- Treat emergency changes through the same fast, reliable automated process;
  do not create an unreviewed bypass.

Suggested branch names: `task/<id>-<title>` and `direct/<title>`. Conventional
Commits remain recommended. Risk, not the word “docs” or file location, decides
which checks apply.
