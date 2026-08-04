# Iuvare AI SDLC v4 Lean

> An open, OKF-conformant, task-scoped SDLC for fast and production-grade AI-assisted software delivery.

Iuvare v4 keeps enterprise controls while removing mandatory persona switching.
Agents receive short-lived capabilities for exact task outputs; expertise personas
are optional lenses. Process scales through **Direct**, **Standard**, and
**Controlled** lanes according to actual risk.

## Quick start

```bash
npx degit alfredt6/iuvareai-sdlc my-project
cd my-project
node scripts/okf-conformance.mjs
node scripts/activate-pi-skills.mjs
```

For an existing project:

```bash
git clone https://github.com/alfredt6/iuvareai-sdlc /tmp/iuvareai
node /tmp/iuvareai/scripts/iuvareai-init.mjs /path/to/project
```

## Normal Pi experience

Ask for the outcome directly. Before mutation, the agent calls
`iuvare_request_scope` with exact outputs. Low-risk work is automatic; manifests,
CI/infra, migrations, release, and destructive actions receive proportionate
human approval. No `/iuvare-persona` or `/iuvare-story` step is required.

```text
intent → exact task scope → implement → verify → review/release by risk
```

Use `/iuvare-status` to inspect the current 60-minute grant,
`/iuvare-vision` to check image support, and `/iuvare-clear` to revoke it.
Design screenshots can be listed in task `reads` and inspected through Pi's
built-in `read` tool before UI implementation. Agents can crop, resize, rotate,
convert, and visually adjust authorized images with `iuvare_image_operation`.
Copy/move/mkdir operations use the scoped `iuvare_file_operation` tool rather
than raw shell commands. Agents can also inspect another source directory or
repository by adding an absolute file or trailing-`/` directory prefix to task
`reads` (for example, `C:/Brainbots/shared-src/`). External reads are
human-previewed and read-only; writes and moves remain inside the active
repository, while secrets and external VCS metadata remain blocked. Local
Docker/Compose status commands are inspection, while common local lifecycle and
log commands use one medium-risk `container-runtime` grant without repeated
confirmation. Builds, `run`/`exec`/`create`/`commit`, registry push, volume
removal, `rm`/`rmi`, and prune retain critical exact-action controls. Docker
authentication, secret-revealing config/inspect, file transfer, remote contexts,
and unknown commands remain blocked. Cloud server setup uses the shell-free
`iuvare_cloud_operation` tool with a Controlled/critical `cloud` grant and
confirmation of every exact provider action. DigitalOcean, Zeabur, AWS, Azure,
GCP, Terraform, Pulumi, Fly.io, Railway, and Vercel CLIs are allowlisted.
Credentials are configured outside Pi through a protected CLI profile, workload
identity, secret manager, or isolated execution environment—never pasted into
chat or tool arguments.

## Delivery lanes

- **Direct** — docs, tests, safe README/config, and small bounded work; session record only.
- **Standard** — features, fixes, refactors, and normal production changes; compact WorkItem + CI + independent review.
- **Controlled** — auth, schema/migrations, CI/infra, regulated, destructive, and production-critical work; explicit approval and evidence.

## Repository

```text
.iuvareai/
├── IUVARE_AI_SDLC_v4.md
├── agents/       # optional expertise lenses, not permissions
├── policies/     # risk, CI, VCS, secrets, budget
├── docs/         # reusable methodology
├── specs/        # project systemic knowledge
├── tasks/        # Standard/Controlled WorkItems
├── evidence/     # project verification/release evidence
└── sessions/ metrics/
integrations/pi/  # task-capability runtime gate
scripts/          # readiness, state, conformance, installer
framework-tests/  # framework regression suite
```

Project documentation belongs in root `docs/` and is a normal agent output when
its exact path is authorized. Project evidence never belongs in reusable
`.iuvareai/docs/`.

## Validation

```bash
node --test framework-tests/*.test.mjs
node scripts/okf-conformance.mjs
node scripts/task-check.mjs .iuvareai/tasks/<task>.md
```

## Security boundary

The Pi interceptor controls direct reads/writes/commands but is not an OS
sandbox. Its external-source grant controls direct task reads but is not a
machine-wide process boundary. Production-adjacent and cloud operations must run
in a container or micro-VM with least-privilege, short-lived credentials.
Adopters must also provide branch protection, secret scanning, immutable
artifacts, provenance, environment approval, provider audit/budget controls,
and rollback automation.

See the [canonical specification](.iuvareai/IUVARE_AI_SDLC_v4.md),
[workflow guide](.iuvareai/docs/complete-workflow.md),
[design-image guide](.iuvareai/docs/design-reference-images.md),
[file-operation guide](.iuvareai/docs/file-operations.md),
[cloud-operations guide](.iuvareai/docs/cloud-operations.md), and
[installation guide](.iuvareai/docs/install.md).

MIT licensed.
