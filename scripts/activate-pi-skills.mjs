// scripts/activate-pi-skills.mjs
// Generates Pi-loadable skills (.pi/skills/<name>.md) from the OKF persona
// concepts in .iuvareai/agents/. Each persona becomes a skill Pi discovers by
// `name` + `description` and can invoke as `/skill:<name>`.
//
// The OKF bundle (.iuvareai/agents/) stays the single source of truth; this
// script is the Pi-specific activation layer. Re-run it whenever you edit a persona.
//
// Usage: node scripts/activate-pi-skills.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const SRC = ".iuvareai/agents";
const OUT = ".pi/skills";

if (!existsSync(SRC)) {
  console.error(`✗ no persona source at ${SRC} (run from the project root)`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const NAME_RE = /^name:\s*(\S+)/m;
const PERSONA_RE = /^persona:\s*(\S+)/m;
const DESC_RE = /^description:\s*(.+)$/m;

// Orientation/router skill — a THIN MAP that defers to the canonical spec (no drift).
const ORIENTATION_SKILL = `---
name: iuvareai-sdlc
description: "Iuvare AI SDLC orientation — START HERE. A routing map: which persona to load per phase, the gates, and where the canonical spec lives. Read this FIRST to understand or advance the process."
---

# Iuvare AI SDLC — Orientation Map (start here)

This is a ROUTING MAP, not the spec. For anything beyond routing, read the
canonical spec at .iuvareai/IUVARE_AI_SDLC_v3.md. The live persona roster is at
.iuvareai/agents/index.md.

## Pick a track (risk -> process weight)
- Flash — hotfix, UI tweak, small fn (Gate 3 only)
- Delta — change to shipped code (regression suite)
- Blueprint — isolated feature (staging suite)
- Genesis — greenfield / major upgrade (full gates)
Details: spec section 2.

## Phase -> which persona to load
- Phase 1 Explore/Spec: /skill:analyst -> /skill:pm
- Phase 2 Architect/Design/Shard: /skill:architect, /skill:ux-designer, /skill:product-owner
- Phase 3 Implement/Review: /skill:developer -> /skill:code-reviewer
- Phase 4 Verify/Release: /skill:test-architect -> /skill:qa -> /skill:release-manager
- Any phase (coordinate): /skill:orchestrator

## Gates (human-owned)
Gate 1 scope sign-off (Blueprint/Genesis); Gate 2 schema/design verified;
Gate 3 human reviews the PR diff; Gate 4 rollback path confirmed;
Final Gate human approves production. (spec sections 3 and 5)

## Advancing a story
draft -> ready -> in_progress -> review -> qa -> done (+ blocked / stale).
Only the Orchestrator writes status; DoR must be green before ready.
See docs/state-machine.md and docs/definition-of-ready.md.

## Start here (first story)
- Greenfield: fill .iuvareai/specs/PROJECT_SEED.md, then /skill:analyst
  (it asks clarifying questions first, then writes PROJECT_BRIEF.md).
- Brownfield (existing code, no brief): /skill:analyst reverse-engineers the
  brief from the codebase (asks first).
Then Gate 1 -> /skill:pm (PRD) -> /skill:architect + /skill:ux-designer ->
/skill:product-owner (stories) -> Phase 3.

When in doubt, defer to .iuvareai/IUVARE_AI_SDLC_v3.md — this map is a pointer,
not the source of truth.
`;

let count = 0;
const report = [];

// First pass: collect persona entries (slug + content).
const entries = [];
for (const f of readdirSync(SRC)) {
  if (!f.endsWith(".md") || f === "index.md") continue;
  const text = readFileSync(join(SRC, f), "utf8");
  const slug = (text.match(NAME_RE)?.[1] || text.match(PERSONA_RE)?.[1] || f.replace(/\.md$/, "")).trim();
  // Inject `name:` right after the opening frontmatter fence if absent.
  const out = NAME_RE.test(text) ? text : text.replace(/^---\r?\n/, `---\nname: ${slug}\n`);
  entries.push({ slug, out });
}

// Clean stale outputs — flat .md AND directory forms — for our skills + the old rogue name.
// (Pi discovers both .pi/skills/<name>.md and .pi/skills/<name>/SKILL.md; remove both so
// no duplicates or wrongly-named leftovers survive a re-run.)
for (const n of [...entries.map((e) => e.slug), "iuvareai-sdlc", "iuvare-sdlc"]) {
  rmSync(join(OUT, `${n}.md`), { force: true });
  rmSync(join(OUT, n), { recursive: true, force: true });
}

// Second pass: write persona skills.
for (const { slug, out } of entries) {
  writeFileSync(join(OUT, `${slug}.md`), out);
  const desc = out.match(DESC_RE)?.[1]?.trim() ?? "(missing)";
  report.push(`  ✓ ${slug.padEnd(16)} ${desc.length > 60 ? desc.slice(0, 57) + "…" : desc}`);
  count++;
}

// Orientation/router skill — a thin map that defers to the canonical spec.
writeFileSync(join(OUT, "iuvareai-sdlc.md"), ORIENTATION_SKILL);
report.push(`  ✓ iuvareai-sdlc        orientation map (start here — routes phases to personas)`);
count++;

console.log(`Activated ${count} skill(s) into ${OUT}/ (11 personas + 1 orientation):\n`);
console.log(report.join("\n"));
console.log(`\nIn Pi: skills auto-match by description, or force-load with \`/skill:<name>\`.`);
console.log(`Re-run this script after editing any persona in ${SRC}/.`);
