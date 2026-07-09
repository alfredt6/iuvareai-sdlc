// scripts/iuvareai-init.mjs
// Scaffold the Iuvare AI SDLC into a target project from THIS template repo.
//   Method B (add SDLC to an existing project):
//     node scripts/iuvareai-init.mjs /path/to/existing-project
//   For brand-new projects, prefer GitHub "Use this template" or `degit` (see docs/install.md).
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const templateRoot = resolve(here, ".."); // this repo IS the template
const target = resolve(process.argv[2] || process.cwd());
const force = process.argv.includes("--force");

const ARTIFACT_DIRS = ["specs", "stories", "deltas", "sessions", "metrics"];

console.log(`Iuvare AI SDLC — init`);
console.log(`  template: ${templateRoot}`);
console.log(`  target:   ${target}\n`);

if (target === templateRoot) {
  console.error("✗ target is the template itself — point at a different project directory.");
  process.exit(1);
}
if (existsSync(join(target, ".iuvareai")) && !force) {
  console.error("✗ target already has .iuvareai/ — aborting. Use --force to overwrite.");
  process.exit(1);
}

// Copy the knowledge bundle, excluding data-layer logs (*.jsonl).
cpSync(join(templateRoot, ".iuvareai"), join(target, ".iuvareai"), {
  recursive: true,
  filter: (src) => !src.endsWith(".jsonl"),
});

// Copy the tooling scripts — merge into an existing scripts/, but abort on name collisions.
const scriptsSrc = join(templateRoot, "scripts");
const scriptsDst = join(target, "scripts");
if (existsSync(scriptsSrc)) {
  if (existsSync(scriptsDst)) {
    const existing = new Set(readdirSync(scriptsDst));
    const collisions = readdirSync(scriptsSrc).filter((f) => existing.has(f));
    if (collisions.length && !force) {
      console.error(`✗ target scripts/ has file(s) that would be overwritten: ${collisions.join(", ")}`);
      console.error(`  Rename them or re-run with --force to overwrite.`);
      process.exit(1);
    }
    console.log(`• merging into existing scripts/ (your files preserved)${collisions.length ? `; overwriting: ${collisions.join(", ")}` : ""}`);
  }
  cpSync(scriptsSrc, scriptsDst, { recursive: true });
}

// Ensure per-project artifact dirs exist.
for (const d of ARTIFACT_DIRS) mkdirSync(join(target, ".iuvareai", d), { recursive: true });

// Drop a starter AGENTS.md so the harness auto-loads the SDLC (never clobber an existing one).
const agentsSrc = join(templateRoot, "AGENTS.md");
const agentsDst = join(target, "AGENTS.md");
if (existsSync(agentsSrc) && !existsSync(agentsDst)) {
  cpSync(agentsSrc, agentsDst);
  console.log("✓ added starter AGENTS.md (harness auto-loads the SDLC)");
} else if (existsSync(agentsDst)) {
  console.log("• kept existing AGENTS.md (not overwritten)");
}

console.log(`\n✓ Iuvare AI SDLC installed into ${target}`);
console.log(`\nNext steps:`);
console.log(`  cd ${target}`);
console.log(`  node scripts/okf-conformance.mjs   # verify the bundle`);
console.log(`  # activate personas for your harness (Pi: generate .pi/skills/), then /skill:analyst to start Phase 1.`);
