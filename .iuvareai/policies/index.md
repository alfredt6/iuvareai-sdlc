# Policies

Enforced governance rules — the MUST layer. Wired into Git settings + CI + the Pi
sandbox extension, not just prose.

* [Version Control](vcs.md) — trunk-based branching, branch protection, conventional commits, PR rules (Gates 3–4)
* [CI/CD Pipeline](ci.md) — DoR check, contract-guard, regression, promotion
* [Budget & Quota](budget.md) — subscription-quota budgeting, time-of-day scheduling, runaway guard
* [Sandbox](sandbox.md) — per-persona permission boundaries, enforced via Pi extension
* [Secrets](secrets.md) — never ingest; inject at runtime; scope per environment
