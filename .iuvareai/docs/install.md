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
| `scripts/` (conformance, DoR, contract-guard, init) | `sessions/` (JSONL logs) |
| `IUVARE_AI_SDLC_v3.md` (the spec) | `metrics/` (JSONL logs) |
| all `index.md` manifests + OKF overlay | |

The template's per-project dirs are empty (`.gitkeep` only), so cloning it
gives you a clean framework with no leftover stories.

## Recommended: a canonical template repo (set up once)

1. **One-time:** create a GitHub repo (e.g. `iuvareai-sdlc`) containing **only**
   the framework — the `.iuvareai/` bundle and `scripts/`. (The current
   `mallengke.ph/.iuvareai` is already this, since it has no project artifacts yet.)
   Mark it as a **template repository** (GitHub → Settings → "Template repository").
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

**What it does** — adds `.iuvareai/` (excluding data logs), the tooling `scripts/`,
and a starter `AGENTS.md`. **Your existing code is never touched.**

**If your project already has a `scripts/` directory** — the installer **merges**:
your scripts are preserved and the Iuvare scripts are added alongside. If a file
name *collides* (e.g. you already have a `scripts/okf-conformance.mjs`), it
**aborts safely** without overwriting; rename your file, or re-run with `--force`
to overwrite.

**Guards:** it refuses to clobber an existing `.iuvareai/` or `AGENTS.md`
(use `--force` to override).

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
2. **Activate personas for your harness** — the `.iuvareai/agents/*.md` concepts are Agent-Skills-compatible; copy them into your agent's skill dir (Pi: `.pi/skills/`; Claude Code: `.claude/skills/`; Cursor: `.cursor/skills/`). Keep harness-specific activation in your project, not this agnostic template.
3. **Wire CI** — add `okf-conformance`, `dor-check`, `contract-guard`, and `secret-scan` as required checks (see [ci.md](../policies/ci.md)).
4. **Build the sandbox extension** (see [sandbox.md](../policies/sandbox.md)) — the one enforcement mechanism prose can't provide.
5. **Start your first story** — Analyst → PM → Architect → Product Owner → Developer → QA.

## Versioning & upgrades
- The framework is versioned two ways: the **SDLC version** (`v3`) and the **OKF
  bundle version** (`okf_version: "0.1"` in the root `index.md`).
- MINOR/breaking changes flow from the template; reconcile per project. The
  `okf-conformance` check guarantees a project's bundle stays structurally valid.
