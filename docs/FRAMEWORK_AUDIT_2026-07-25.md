# Framework Audit — 2026-07-25

## Scope

Audit of the reusable `iuvareai-sdlc` template after two greenfield development
halts. This report distinguishes corrected structural defects from controls that
remain deployment responsibilities.

## Corrected findings

| ID | Severity | Finding | Control |
|---|---:|---|---|
| D1 | P0 | No root-config bootstrap authority | Genesis-only `implementer: conductor` + `bootstrap: true` + reason |
| D2 | P0 | `docs/` ownership contradicted persona frontmatter | Canonical Test Architect set is `.iuvareai/docs/`; repo `docs/` needs an explicit persona or Conductor shard |
| D3 | P0 | DoR checked output presence, not writability | DoR dynamically checks every output against the named implementer's `writes_to` |
| D4 | P1 | Sharding ignored permission/bootstrap fit | Permission-fit, bootstrap, and modification-input rules added |
| D5 | P1 | Architecture omitted repository/bootstrap ownership | Architect deliverable now requires that section |
| D6 | P1 | Routing did not verify assignee write authority | Orchestrator checks `implementer` and output fit before assignment |
| D7 | P2 | Delta inputs omitted modified source | Existing modified outputs must also be listed in `inputs` |
| D8 | P2 | CI documentation duplicated stale DoR code | CI policy points only to canonical `scripts/dor-check.mjs` |
| A1 | P0 | Sandbox policy shipped a non-runnable snippet | Pi activation now installs a fail-closed persona/output gate |
| A2 | P1 | Installer could leave a partial install after collision | All collision checks now run before mutation |
| A3 | P1 | DoR accepted invalid enum/type/path values | Strict states/tracks/semver/booleans/lists and repository-relative paths |
| A4 | P1 | No framework regression suite or CI | Node framework-test suite + pinned-action GitHub workflow |
| A5 | P1 | Contract guard claimed automatic staleness but only printed a message | Check mode + explicit `--write` transition; done shards remain historical |

## Design decisions

- `owner` remains mutable workflow state. `implementer` is immutable routing
  intent and therefore cannot be inferred from `owner` after handoffs.
- Conductor is an explicit human authority, not an all-powerful agent persona.
  Root outputs are human Conductor work with an explicit `bootstrap` boolean;
  `bootstrap: true` is legal only for Genesis.
- A shard must fit one implementer. Matching each output to unrelated personas
  would still produce an unassignable mixed-ownership shard.
- Machine checks establish structural startability. Gate 2 remains accountable
  for semantic output sufficiency and truly testable acceptance criteria.

## Production-readiness boundary

The Pi extension gates direct `read`, `write`, `edit`, and allow-listed `bash`
tool calls. It does **not** turn shell-command pattern matching into an OS
security boundary. Production-adjacent use still requires the container or
micro-VM control required by sandbox policy, with secrets unavailable to the
process. CI branch protection, environment approvals, provenance, secret
scanning, and deployment rollback are project controls and cannot be enabled by
a repository template alone.

Reference alignment used during hardening:
[NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) (secure build
and release practices), the
[OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html)
(least privilege and human approval), and
[SLSA requirements](https://slsa.dev/spec/v1.0/requirements) (build integrity and
provenance).
