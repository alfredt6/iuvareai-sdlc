# Optional Expertise Lenses

Personas improve reasoning; they do **not** grant file or command permissions.
The active task capability is the sole runtime authority. Operators never need
to switch personas to unblock ordinary work.

- [Analyst](analyst.md), [PM](pm.md) — discovery and measurable requirements
- [Architect](architect.md), [UX Designer](ux-designer.md) — technical and experience design
- [Product Owner](product-owner.md) — difficult decomposition and prioritization
- [Developer](developer.md) — implementation lens
- [Code Reviewer](code-reviewer.md), [Test Architect](test-architect.md), [QA](qa.md) — independent verification lenses
- [Release Manager](release-manager.md) — release/rollback planning
- [Orchestrator](orchestrator.md) — portfolio coordination, not routine state editing

Load only what improves the current task. The default coding agent can create
documentation, source, tests, and safe configuration when exact outputs are
included in its task grant. Every lens can execute repository-local Git commands:
read-only operations are inspection, while local mutations require the `git`
command class, remote operations require `network`, and destructive operations
require `destructive`. Git capability comes from task scope, never the persona.
