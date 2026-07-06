---
type: Policy
title: "Version Control Policy"
description: "Trunk-based branching, branch protection, conventional commits, and PR rules governing Gates 3–4."
tags: [policy, governance, vcs]
timestamp: 2026-07-04
policy: vcs
version: 1.0.0
status: active
last_updated: 2026-07-03
applies_to: [genesis, blueprint, delta, flash]
enforces: ["SDLC v3 §11.1–11.2", "State Machine §9", "Contract Versioning §5.4"]
---

# Version Control Policy

## Purpose
Make every change to the codebase **traceable to a story shard**, **reviewable
at a diff**, and **revertable to last-known-good.** This is the mechanical spine
of Gates 3 and 4: without disciplined branches and PRs, "human reviews the diff"
is just a slogan.

## Scope
Applies to **all tracks**. Flash is deliberately lighter (see §6). This policy
governs branches, commits, PRs, merges, releases, and secrets — *not* the CI
stages themselves (those live in `ci.md`).

---

## 1. Branching Model

**Trunk-based development on `main`.**

- **`main`** is protected, always green, and always deployable. Nothing lands by
  direct push — everything arrives via a reviewed, squashed PR.
- **One short-lived branch per unit of work.** A branch exists for the lifetime
  of one story (or one hotfix) and is deleted on merge.
- **Long-lived feature branches are forbidden.** If a branch lives more than a
  few days, the story is too big — re-shard it (§10 of the SDLC).
- **`release/*` branches** are used **only** for Genesis Track releases that need
  stabilization apart from `main`. Everything else is trunk-based.

> Rationale: trunk-based keeps merge conflict surface tiny and makes "revert to
> last-known-good" trivial — which is what the Rollback Protocol (§5.6) depends
> on.

---

## 2. Branch Naming Conventions

The branch name is the human handle; the **canonical link to the shard is the
`{epic}.{story}` numeric key**, which mirrors the shard filename
(`{epic_id}.{story_id}.{title}.md`).

| Work type | Pattern | Example |
|---|---|---|
| Story (Blueprint/Genesis) | `story/{epic}.{story}-{kebab-title}` | `story/001.003-auth-rate-limiting` |
| Delta (behavior/fix/refactor) | `story/{epic}.{story}-{kebab-title}` | `story/002.004-rate-limit-delta` |
| Flash (no shard) | `flash/{kebab-title}` | `flash/login-button-color` |
| Production hotfix | `hotfix/{kebab-title}` | `hotfix/null-pointer-checkout` |
| Release stabilization | `release/{semver}` | `release/2.1.0` |

Rules:
- Lowercase, hyphen-separated, no spaces, no underscores.
- The `{epic}.{story}` segment (e.g. `001.003`) **must match** the shard's
  `epic_id`/`story_id` — CI uses it to locate the shard when the PR description
  omits the explicit citation.
- Deltas live in `.iuvareai/deltas/` but follow the same `story/` prefix — they
  are stories in the state machine, just with `track: delta`.

---

## 3. Branch Protection Rules (`main`)

Enforce these on `main` (GitHub: *Settings → Branches → Branch protection*;
equivalents exist in GitLab/Gitea):

- ✅ **Require a pull request** before merging (no direct pushes).
- ✅ **Require approvals** → this *is* **Gate 3** (human diff review). Minimum 1.
- ✅ **Require status checks to pass** before merging → the required-check list
  is in `ci.md` §2 (DoR check + Quality, minimum).
- ✅ **Require branches to be up to date** before merging (catches late conflicts).
- ✅ **Do not allow force pushes** and **do not allow deletions** of `main`.
- ✅ **Require linear history** (pairs with squash-merge → clean, revertible log).
- ✅ **Require conversation resolution** before merge (no stale review threads).

> For `release/*` branches: same protection as `main` during stabilization.

---

## 4. Commit & Merge Conventions

### 4.1 Conventional Commits
Every PR's squash-commit message follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject> (story <epic>.<story>) [shard: <path>]
```

- **`type`**: `feat` · `fix` · `refactor` · `perf` · `test` · `docs` · `build` · `ci` · `chore`
- **`scope`**: the module/area (e.g. `auth`, `billing`).
- **`[shard: ...]`** footer: the **machine-parseable** link back to the story.
  CI reads it to record which story a merge closed and to drive state → `done`.

**Example** (matches SDLC §11.1):
```
feat(auth): rate-limit login (story 001.003) [shard: .iuvareai/stories/001.003.user-login-rate-limiting.md]
```

### 4.2 Merge strategy
- **Squash and merge** — one story = one commit on `main`. This is what makes
  `git revert` a clean, atomic rollback unit (essential to §5.6).
- **Auto-delete the branch** after merge.
- Never merge a PR with failing required checks, even if "just a docs change" —
  the contract-guard exists to catch exactly that class of mistake.

---

## 5. Pull Request Rules

A PR is the artifact Gate 3 reviews. Minimum contents:

1. **Title** — Conventional Commit format (§4.1).
2. **Description** — must include the shard citation `[shard: <path>]`. This is
   the primary source CI uses; branch-name parsing is only a fallback.
3. **Summary** — what changed and why, in plain language a reviewer can verify
   against the shard's `test_criteria`.
4. **Test evidence** — which `test_criteria` pass and how (command + result).
5. **Out-of-scope declaration** — anything touched that *isn't* in the shard
   must be called out explicitly (and usually rejected).

**Hard rules:**
- DoR must be **green at PR-open**; CI re-runs on every push.
- A PR may implement **exactly one story**. Bundle two stories → split the PR.
- Deltas must state their `delta_type` (`behavior`/`fix`/`refactor`) and, if
  `refactor`, assert no behavioral change with passing existing tests.

---

## 6. Track → VCS Mapping

| Track | Branch | Shard | PR required? | Gate 3 review? |
|---|---|---|---|---|
| **Flash** | `flash/*` | `TECH_SPEC.md` (light) | Yes (lightweight) | Yes (diff) |
| **Delta** | `story/*` | `DELTA_SHARD.md` | Yes | Yes |
| **Blueprint** | `story/*` | `PRD_SHARD.md` | Yes | Yes |
| **Genesis** | `story/*` (+ `release/*`) | Full suite | Yes | Yes |

Flash still requires a PR and a Gate 3 diff review — it only skips the upstream
spec gates (1, 2) and the staging suite. Never let "it's small" become "it
bypasses review."

---

## 7. Story State → Branch Lifecycle

The git branch is the physical manifestation of a story's state (SDLC §9):

| Story state | Git reality |
|---|---|
| `ready` | No branch yet (or a draft branch). DoR green. |
| `in_progress` | Branch `story/{epic}.{story}-...` created and active. |
| `review` | PR open against `main`; Gate 3 pending. |
| `qa` | Gate 3 approved; QA/CI running. |
| `done` | Squash-merged to `main`; branch deleted; deployable. |
| `blocked` | PR open but failing; do **not** force-merge — remediate or escalate. |
| `stale` | A MAJOR contract bump invalidated the shard. **Do not merge.** Re-ready (→ `draft`) or abandon the branch. |

> The **Orchestrator** owns state transitions; the branch is created when a
> story moves `ready → in_progress` and removed when it reaches `done`.

---

## 8. Releases & Tagging

- Tag every deployable release with a **semver git tag**: `v{MAJOR.MINOR.PATCH}`
  (e.g. `v2.1.0`).
- The tag is what "last-known-good" points at for the Rollback Protocol (§5.6).
- The **Release Manager** owns tagging and the release notes (generated from the
  squash commits since the last tag, filtered by Conventional Commit `type`).

---

## 9. Secrets in Version Control

- **Never commit** `.env`, keys, tokens, or real PII. `.gitignore` must include
  `.env`, `.env.*`, and any fixture directories holding real data.
- Secrets enter the system only via the **CI secret store** or the runtime
  secret manager — see `secrets.md` (§5.7). Agents never read them into context.
- Add a pre-commit/CI **secret scan** (e.g. `gitleaks`) as a required check.

---

## 10. Enforcement Summary

| Rule | Enforced by |
|---|---|
| No direct push to `main` | Branch protection |
| Gate 3 (human review) | Required approvals |
| DoR green before merge | Required status check (`dor-check`) |
| Contract compatibility | Required status check (`contract-guard`) |
| Shard citation present | CI parses PR title/description |
| No secrets | `.gitignore` + secret-scan check |
| Atomic rollback | Squash-merge + semver tags |

If a rule here and a rule in `ci.md` ever appear to conflict, **`ci.md` wins on
pipeline behavior** and **this file wins on branching/PR behavior.**
