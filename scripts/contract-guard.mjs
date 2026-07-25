// Guard open shards against a data-contract MAJOR bump.
// Check mode (default): incompatible open shards must already be status: stale.
// Write mode: node scripts/contract-guard.mjs --write (automatic state transition;
// the resulting shard changes still require normal review/commit).
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./lib-frontmatter.mjs";

const contractPath = ".iuvareai/specs/DATAMODEL_CONTRACT.md";
const write = process.argv.includes("--write");
if (!existsSync(contractPath)) {
  console.log("ℹ no DATAMODEL_CONTRACT.md yet (pre-Phase 2) — nothing to guard.");
  process.exit(0);
}

const contractVersion = readFileSync(contractPath, "utf8").match(/^#\s*version:\s*(\d+\.\d+\.\d+)(?:\s+.*)?$/m)?.[1];
if (!contractVersion) {
  console.error(`✗ contract-guard: no valid '# version: MAJOR.MINOR.PATCH' header in ${contractPath}`);
  process.exit(1);
}
const contractMajor = contractVersion.split(".")[0];
const failures = [];
let transitioned = 0;

for (const dir of [".iuvareai/stories", ".iuvareai/deltas"]) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".md") || file === "index.md") continue;
    const path = join(dir, file);
    const text = readFileSync(path, "utf8");
    const fm = parseFrontmatter(text);
    if (!fm) { failures.push(`${path}: missing frontmatter`); continue; }
    if (fm.status === "done") continue;
    if (!fm.contract_version || !/^\d+\.\d+\.\d+$/.test(String(fm.contract_version))) {
      failures.push(`${path}: open shard has no valid contract_version`);
      continue;
    }
    const shardMajor = String(fm.contract_version).split(".")[0];
    if (shardMajor === contractMajor || fm.status === "stale") continue;

    if (!write) {
      failures.push(`${path}: shard v${shardMajor} is incompatible with contract v${contractMajor}; set status: stale or re-ready against the contract`);
      continue;
    }
    if (!fm.status || !/^status:\s*[^\r\n]+/m.test(text)) {
      failures.push(`${path}: cannot transition missing status to stale`);
      continue;
    }
    writeFileSync(path, text.replace(/^status:\s*[^\r\n]+/m, "status: stale"));
    transitioned++;
    console.log(`↻ ${path}: ${fm.status} → stale (contract v${contractMajor})`);
  }
}

if (failures.length) {
  console.error(`✗ contract-guard: ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  if (!write) console.error("  run with --write for the automatic stale transition, then review and commit the shard changes");
  process.exit(1);
}
if (write) console.log(`✓ contract-guard: transitioned ${transitioned} shard(s) to stale.`);
else console.log(`✓ contract-guard: all open shards are compatible or explicitly stale against contract v${contractMajor}.`);
