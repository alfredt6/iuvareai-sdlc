# Systemic Specs

Active systemic contracts, produced during Phases 1–2. These are created by
personas during the flow, so the directory is populated on demand.

* `PROJECT_BRIEF.md` — vision, scope, out-of-scope (Analyst, Phase 1)
* `PRD.md` — functional/non-functional requirements, epics (PM, Phase 1)
* `ARCHITECTURE.md` — system topography, data flow (Architect, Phase 2)
* `DATAMODEL_CONTRACT.md` — semver-tagged data contract (Architect, Phase 2)
* `UI_DESIGN.md` — design system, user flows, accessibility, component specs (UX/UI Designer, Phase 2)

Once authored, each becomes an OKF concept (`type: ProjectBrief` / `PRD` /
`Architecture` / `DataContract` / `UIDesign`). The data contract's `# version: MAJOR.MINOR.PATCH`
header drives the contract-guard (see [ci.md](../policies/ci.md)).
