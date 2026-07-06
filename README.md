# Iuvare AI SDLC

> An open, **OKF-conformant**, **agent-driven** Software Development Lifecycle for AI-native teams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![OKF](https://img.shields.io/badge/Open%20Knowledge%20Format-v0.1-blue.svg)](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)
[![SDLC](https://img.shields.io/badge/SDLC-v3.0-purple.svg)](.iuvareai/IUVARE_AI_SDLC_v3.md)

**Iuvare AI SDLC** is a spec-driven, gate-enforced framework for building software with AI coding agents — Pi, Claude Code, Cursor, or OpenAI Codex. It moves engineering discipline *upstream* into precise specs, versioned data contracts, and automated gates, so fast agents don't accumulate technical debt at machine speed.

The whole framework is an **[Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf)** bundle: a portable, machine-traversable knowledge graph that your agents read **and** write — and that works unchanged across every harness.

---

## Why

In the AI-native era the bottleneck inverts: time saved typing syntax is reinvested into **Pristine Specification** and **Autonomous Verification**. An agent without hard boundaries accrues debt at machine speed — *including bad specs that propagate at machine speed.* Iuvare disciplines the **specs themselves**, not just the code, via an automated **Definition of Ready**.

## Quick start

**New project (preferred):**
```bash
npx degit YOURNAME/iuvareai-sdlc my-project
cd my-project
node scripts/okf-conformance.mjs   # → ✓ OKF v0.1 conformance passed
```

**Add to an existing project:**
```bash
git clone https://github.com/YOURNAME/iuvareai-sdlc /tmp/iuvareai
node /tmp/iuvareai/scripts/iuvareai-init.mjs /path/to/existing-project
```

Then activate per-project: personas → Pi skills, wire CI, build the sandbox extension. See **[Install & Reuse](.iuvareai/docs/install.md)**.

## What's inside

```
iuvareai-sdlc/
├── .iuvareai/                     # the OKF knowledge bundle
│   ├── IUVARE_AI_SDLC_v3.md       # the master spec
│   ├── index.md                   # bundle root + type vocabulary
│   ├── agents/      (10 personas) # the WHO — role behaviors
│   ├── policies/    (5 policies)  # the MUST — enforced rules
│   ├── docs/        (6 guides)    # the HOW — methodology
│   ├── specs/ stories/ deltas/    # created per project (empty here)
│   └── sessions/ metrics/         # audit + cost/quality logs
└── scripts/                       # conformance, DoR, contract-guard, init
```

## Core ideas

- **4 intelligence tracks** — Flash / Delta / Blueprint / Genesis — match process weight to risk so a hotfix isn't crushed under greenfield ceremony.
- **10 personas** — loaded as on-demand skills (only the active phase is in context).
- **Definition of Ready** — a machine-checked gate that stops un-startable stories before they waste an agent run.
- **Semver data contracts** — every story cites a contract version; a MAJOR bump auto-flags stale stories so they can't silently generate code against an outdated schema.
- **Bounded self-healing** — max 3 fix attempts, then escalate. No infinite retry loops, no runaway quota burn.
- **OKF bundle** — portable across harnesses and organizations; format, not platform.

## Documentation

- **[The SDLC spec (v3)](.iuvareai/IUVARE_AI_SDLC_v3.md)** — the full blueprint (16 sections)
- **[Install & Reuse](.iuvareai/docs/install.md)** — scaffolding new projects
- **[OKF Adoption](.iuvareai/docs/okf.md)** / **[OKF Philosophy](.iuvareai/docs/okf-philosophy.md)** — why a format, not docs
- **[Sharding](.iuvareai/docs/sharding.md)** · **[Definition of Ready](.iuvareai/docs/definition-of-ready.md)** · **[State Machine](.iuvareai/docs/state-machine.md)**
- Policies: **[VCS](.iuvareai/policies/vcs.md)** · **[CI](.iuvareai/policies/ci.md)** · **[Budget](.iuvareai/policies/budget.md)** · **[Sandbox](.iuvareai/policies/sandbox.md)** · **[Secrets](.iuvareai/policies/secrets.md)**

## Requirements

- **Node.js** (for the scripts — stdlib only, no dependencies)
- **Any agent harness** — Pi, Claude Code, Cursor, or OpenAI Codex
- **Git**

## Status

v3.0 — documentation layer complete and OKF-conformant. Activation layer (Pi skills, sandbox extension, CI wiring) is applied per-project. See the [Adoption Roadmap](.iuvareai/IUVARE_AI_SDLC_v3.md) (§16).

## License

[MIT](LICENSE) — free for personal and commercial use.

## Contributing

Issues and pull requests welcome. This is an open standard-in-progress; the OKF bundle version (`okf_version` in [`.iuvareai/index.md`](.iuvareai/index.md)) and the SDLC version track compatibility.
