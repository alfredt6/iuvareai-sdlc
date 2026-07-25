---
type: Methodology
title: "Install & Reuse — Setup for New Projects"
description: "How to scaffold the Iuvare AI SDLC into any new project from the canonical template."
tags: [methodology, install, template]
timestamp: 2026-07-04
---

# Install & Reuse

The Iuvare AI SDLC is a **reusable framework**. Set it up once as a canonical
template, then scaffold every future project from it in seconds.

## Framework vs. project artifacts

| Reusable (the framework — ship in the template) | Per-project (empty in the template; filled per project) |
|---|---|
| `agents/` (11 personas) | `specs/` (PROJECT_BRIEF, PRD, Architecture, DataContract, UI_DESIGN) |
| `policies/` (5 governance) | `stories/` |
| `docs/` (methodology) | `deltas/` |
| `scripts/` + `integrations/` (validators, installer, harness gates) | `sessions/` (JSONL logs) |
| `IUVARE_AI_SDLC_v3.md` + `framework-tests/` | `metrics/` (JSONL logs) |
| all `index.md` manifests + OKF overlay | |

The template's per-project dirs are empty (`.gitkeep` only), so cloning it
gives you a clean framework with no leftover stories.

## Recommended: a canonical template repo (set up once)

1. **One-time:** create a GitHub repo (e.g. `iuvareai-sdlc`) containing **only**
   the framework — `.iuvareai/`, `scripts/`, `integrations/`, framework tests,
   and framework CI. Mark it as a **template repository** (GitHub → Settings →
   "Template repository").
2. **Per project** use one of the methods below.
3. **Upgrade** the framework by bumping the SDLC version + `okf_version` in the
   template; pull updates into projects as needed.

## Method A — new project from the template (preferred)
- **GitHub UI:** "Use this template → Create a new repository."
- **CLI (no git history):**
  ```bash
  npx degit alfredt6/iuvareai-sdlc my-new-project
  cd my-new-project
  node scripts/okf-conformance.mjs   # verify
  ```

## Method B — add the SDLC to an *existing* project (brownfield)
Clone the template anywhere, then run the init script pointing at your project:
```bash
git clone https://github.com/alfredt6/iuvareai-sdlc /tmp/iuvare
node /tmp/iuvare/scripts/iuvareai-init.mjs /path/to/existing-project
```

**What it does** — adds `.iuvareai/` (excluding data logs), tooling `scripts/`,
harness `integrations/`, and a starter `AGENTS.md`. **Your existing code is never
touched.** All collision checks complete before the first write, so a failed
install does not leave a partial framework copy.

**If your project already has a `scripts/` directory** — the installer **merges**:
your scripts are preserved and the Iuvare scripts are added alongside. If a file
name *collides* (e.g. you already have a `scripts/okf-conformance.mjs`), it
**aborts safely** without overwriting; rename your file, or re-run with `--force`
to overwrite.

**Guards:** it refuses to clobber `.iuvareai/`, colliding framework scripts, or
an existing `integrations/` tree unless `--force` is explicit. It always preserves
an existing `AGENTS.md`.

### Starting Phase 1 with no brief/PRD (brownfield)
An existing project usually has **no `PROJECT_BRIEF.md`/`PRD.md`** yet — that's
expected; `specs/` ships with only the `PROJECT_SEED.md` template. Begin at
Phase 1 and let the **Analyst reverse-engineer** the brief from your existing code:

```
/skill:analyst
This is an existing codebase with no brief/PRD yet. Read the repo (README, code
structure, manifest, any docs) to understand what this product is. Then ask me a
numbered list of clarifying questions (vision, users, in-scope vs out-of-scope,
risks). After I answer, write .iuvareai/specs/PROJECT_BRIEF.md capturing the
product as it truly is.
```

Then Gate 1 → PM (`PRD.md`) → Architect/UX → stories.

## Post-install checklist
1. `node scripts/okf-conformance.mjs` → must pass (every concept has a `type`).
2. **Activate the persona skills for your harness.** The `.iuvareai/agents/*.md` concepts are Agent-Skills-compatible and the **single source of truth**; generate your harness's skill files from them:
   - **Pi (one command):** `node scripts/activate-pi-skills.mjs` → writes `.pi/skills/<persona>.md` for all 11 personas + the orientation skill, and installs `.pi/extensions/iuvareai-sandbox.ts`. **Re-run it whenever you edit a persona or integration.** Select `/iuvare-persona <name>` before agent work; Developer also binds `/iuvare-story <shard-path>`. Skills load with `/skill:<name>`.
   - **Claude Code:** copy `.iuvareai/agents/*.md` → `.claude/skills/`.
   - **Cursor:** copy `.iuvareai/agents/*.md` → `.cursor/skills/`.

   Keep harness-specific activation in your project, not this agnostic template: the **generated** skill files (`.pi/skills/`, `.claude/skills/`, `.cursor/skills/`) are per-project artifacts — **do not commit them to the template**. Edit `.iuvareai/agents/*.md` and re-generate; never hand-edit the generated skills.
3. **Wire CI** — add `okf-conformance`, `dor-check`, `contract-guard`, and `secret-scan` as required checks (see [ci.md](../policies/ci.md)).
4. **Verify the installed permission gate and add OS isolation** (see [sandbox.md](../policies/sandbox.md)). The Pi gate controls direct tools; Docker/micro-VM containment controls shell/process behavior.
5. **Start your first story** — Analyst → PM → Architect → Product Owner → Developer → QA.

## Upgrading v3.0 shards to v3.1

This is an intentional Ready-gate tightening. Before re-running DoR:

1. Add immutable `implementer: developer` to ordinary source/test stories.
2. Convert repository-root toolchain stories to `implementer: conductor`,
   `track: genesis`, `bootstrap: true`, with `conductor_reason`.
3. Split mixed code + repository-documentation output sets so one implementer
   owns each shard (or define a narrowly-scoped custom documentation persona).
4. For Delta, add every existing modified source/test file to `inputs` and use a
   real boolean for `contract_touched`.
5. Re-run `node scripts/activate-pi-skills.mjs` after persona updates.

Do not bulk-label every out-of-set shard Conductor; each use is a visible human
exception and should remain rare.

## Versioning & upgrades
- The framework is versioned two ways: the **SDLC version** (`v3.1`) and the **OKF
  bundle version** (`okf_version: "0.1"` in the root `index.md`).
- Versioned framework changes flow from the template; reconcile per project. The
  `okf-conformance` check guarantees a project's bundle stays structurally valid.
