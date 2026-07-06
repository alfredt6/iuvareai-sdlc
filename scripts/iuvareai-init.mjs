// scripts/iuvareai-init.mjs
// Scaffold the Iuvare AI SDLC into a target project from THIS template repo.
//   Method B (add SDLC to an existing project):
//     node scripts/iuvareai-init.mjs /path/to/existing-project
//   For brand-new projects, prefer GitHub "Use this template" or `degit` (see docs/install.md).
import { cpSync, existsSync, mkdirSync } from "node:fs";
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

// Copy the tooling scripts.
if (existsSync(join(templateRoot, "scripts"))) {
  cpSync(join(templateRoot, "scripts"), join(target, "scripts"), { recursive: true });
}

// Ensure per-project artifact dirs exist.
for (const d of ARTIFACT_DIRS) mkdirSync(join(target, ".iuvareai", d), { recursive: true });

console.log(`✓ scaffolded .iuvareai/ + scripts/ into ${target}`);
console.log(`\nNext steps:`);
console.log(`  cd ${target}`);
console.log(`  node scripts/okf-conformance.mjs   # verify the bundle`);
console.log(`  # then activate personas as Pi skills, wire CI, and start your first story.`);
