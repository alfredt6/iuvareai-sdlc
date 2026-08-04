# Project Instructions

This project follows **Iuvare AI SDLC v4 Lean**. Read
`.iuvareai/IUVARE_AI_SDLC_v4.md` before planning or mutating the repository.

## Normal operation

- Work from the user's outcome; do not ask the user to select a persona.
- Personas in `.iuvareai/agents/` are optional expertise lenses, not permissions.
- Before the first mutation, request an exact task capability through
  `iuvare_request_scope`. Low-risk work is automatic; sensitive work receives one
  human preview.
- Direct work is session-recorded. Standard/Controlled work uses a compact
  `.iuvareai/tasks/*.md` work item and `node scripts/task-check.mjs <path>`.
- Keep changes small, verify them, and show the diff. Use an independent checker
  for Standard/Controlled work.
- To inspect another source directory or repository, add its exact absolute file
  or trailing-`/` directory prefix to task `reads`. External reads are
  human-previewed and read-only; use repository-relative paths for all outputs.
- Design images are first-class task inputs. Add their exact files or containing
  directory to the task `reads`, inspect them with the built-in `read` tool before
  UI implementation, and use a model that advertises image input. For cropping,
  resizing, rotating, converting, or visual adjustments, request the `image`
  command class and use `iuvare_image_operation` with an exact output in `writes`.
- For copying, moving, or creating directories, request the `filesystem` command
  class and use `iuvare_file_operation`. Use exact `writes` for file targets,
  `write_trees` for destination directory trees, and `deletes` for move sources.
  Do not use raw `cp`, `mv`, `rsync`, or `mkdir`.
- When local Docker/Compose is part of implementation, request
  `container-runtime` in the initial scope for routine lifecycle and log
  commands; these do not need repeated confirmation. Status/list commands are
  inspection. Builds, `run`/`exec`/`create`/`commit`, push, volume deletion,
  `rm`/`rmi`, and prune retain critical release/destructive controls.
- Cloud server setup/configuration uses `iuvare_cloud_operation` with a
  Controlled/critical `cloud` grant and exact-action confirmation. Credentials
  are provisioned outside the agent through a protected provider profile,
  workload identity, secret manager, or execution environment. Never request or
  pass API keys, passwords, tokens, private keys, authentication commands, or
  secret-retrieval arguments.

## Repository boundaries

- External read scope never authorizes external writes, moves, or deletions.
  Filesystem roots, secret-like paths, and external VCS metadata remain blocked;
  start the agent in the other repository when it must be modified.
- Project outputs may be created wherever the authorized task requires,
  including `docs/`, `src/`, `tests/`, safe root documentation, and project
  artifact directories.
- `.iuvareai/docs/`, `.iuvareai/agents/`, `.iuvareai/policies/`, the canonical
  specification, `scripts/`, `integrations/`, CI/infra, migrations, and release
  configuration are protected high-risk areas. Modify them only through an
  explicitly approved Controlled task.
- Never read or write secrets, credentials, private keys, `.env` values, or real
  PII. Live cloud commands require container/micro-VM isolation, least-privilege
  expiring credentials, budget/health controls, provider audit logs, and a
  rollback or destroy plan.
- Project test/release/threat evidence belongs in `.iuvareai/evidence/`, `tests/`,
  or project `docs/`—never in reusable `.iuvareai/docs/` methodology.

## Validation

```bash
node --test framework-tests/*.test.mjs  # framework repository
node scripts/okf-conformance.mjs
node scripts/task-check.mjs <work-item> # Standard/Controlled project work
```

OS isolation remains mandatory for production-adjacent shell execution.

## Visual references

Pi can send `jpg`, `jpeg`, `png`, `gif`, `webp`, and `bmp` files to a
vision-capable model through `read`. Use `/iuvare-vision` to check the active
model. `terminal.showImages` controls terminal display only; `images.blockImages`
must remain `false` for model inspection. SVG is readable as source text; provide
a raster screenshot when visual rendering fidelity matters.
