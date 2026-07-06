# Personas

Role profiles loaded as on-demand skills (only the active-phase persona is kept in
context). Each carries YAML frontmatter mirroring its permission set
(`writes_to` / `reads_from`).

# Phase 1 — Exploration & Elicitation
* [The Analyst](analyst.md) — market alignment, scope boundaries, risk → PROJECT_BRIEF.md
* [The PM](pm.md) — functional & non-functional requirements, epics → PRD.md

# Phase 2 — Architectural Mapping & Data Contracts
* [The Technical Architect](architect.md) — stack, data flow, versioned data contract
* [The Product Owner](product-owner.md) — shards the PRD into atomic, testable stories

# Phase 3 — Spec-Driven Development
* [The Developer](developer.md) — context-shielded implementation against the contract
* [The Code Reviewer](code-reviewer.md) — adversarial security + dependency gate (Gate 3)

# Phase 4 — Verification & Self-Healing
* [The Test Architect](test-architect.md) — designs edge-case test matrices
* [The QA Engineer](qa.md) — runs verification + bounded self-healing
* [The Release Manager](release-manager.md) — owns Gate 4, rollback path, deployment

# Cross-phase
* [The Orchestrator](orchestrator.md) — sequences stories, enforces DoR, archives sessions/metrics
