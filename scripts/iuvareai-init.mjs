// Scaffold the Iuvare AI SDLC into a target project from THIS template repo.
// All collision checks run before the first mutation so a failed install is atomic.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const templateRoot = resolve(here, "..");
const target = resolve(process.argv[2] || process.cwd());
const force = process.argv.includes("--force");
const ARTIFACT_DIRS = ["specs", "stories", "deltas", "sessions", "metrics"];

console.log("Iuvare AI SDLC — init");
console.log(`  template: ${templateRoot}`);
console.log(`  target:   ${target}\n`);

if (target === templateRoot) abort("target is the template itself — point at a different project directory.");

const bundleDst = join(target, ".iuvareai");
const scriptsSrc = join(templateRoot, "scripts");
const scriptsDst = join(target, "scripts");
const integrationsSrc = join(templateRoot, "integrations");
const integrationsDst = join(target, "integrations");

// Preflight: no writes occur before every collision check passes.
if (existsSync(bundleDst) && !force)
  abort("target already has .iuvareai/ — aborting. Use --force to overwrite.");
const scriptCollisions = existsSync(scriptsSrc) && existsSync(scriptsDst)
  ? readdirSync(scriptsSrc).filter((file) => new Set(readdirSync(scriptsDst)).has(file))
  : [];
if (scriptCollisions.length && !force)
  abort(`target scripts/ has file(s) that would be overwritten: ${scriptCollisions.join(", ")}\n  Rename them or re-run with --force to overwrite.`);
if (existsSync(integrationsSrc) && existsSync(integrationsDst) && !force)
  abort("target already has integrations/ — aborting to avoid overwriting. Use --force to merge.");

mkdirSync(target, { recursive: true });
cpSync(join(templateRoot, ".iuvareai"), bundleDst, {
  recursive: true,
  filter: (src) => !src.endsWith(".jsonl"),
});
if (existsSync(scriptsSrc)) {
  if (existsSync(scriptsDst))
    console.log(`• merging into existing scripts/ (your files preserved)${scriptCollisions.length ? `; overwriting: ${scriptCollisions.join(", ")}` : ""}`);
  cpSync(scriptsSrc, scriptsDst, { recursive: true });
}
if (existsSync(integrationsSrc)) cpSync(integrationsSrc, integrationsDst, { recursive: true });
for (const dir of ARTIFACT_DIRS) mkdirSync(join(bundleDst, dir), { recursive: true });

const agentsSrc = join(templateRoot, "AGENTS.md");
const agentsDst = join(target, "AGENTS.md");
if (existsSync(agentsSrc) && !existsSync(agentsDst)) {
  cpSync(agentsSrc, agentsDst);
  console.log("✓ added starter AGENTS.md (harness auto-loads the SDLC)");
} else if (existsSync(agentsDst)) {
  console.log("• kept existing AGENTS.md (not overwritten)");
}

console.log(`\n✓ Iuvare AI SDLC installed into ${target}`);
console.log("\nNext steps:");
console.log(`  cd ${target}`);
console.log("  node scripts/okf-conformance.mjs      # verify the bundle");
console.log("  node scripts/activate-pi-skills.mjs   # Pi: skills + fail-closed permission gate");
console.log("  # then /skill:analyst (or /skill:iuvareai-sdlc for orientation).");

function abort(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}
