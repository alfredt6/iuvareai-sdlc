// scripts/contract-guard.mjs
// On any change to DATAMODEL_CONTRACT.md, flag shards whose `contract_version`
// major no longer matches the contract (they must become `stale`). SDLC §5.4.
// Usage: node scripts/contract-guard.mjs
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./lib-frontmatter.mjs";

const contractPath = ".iuvareai/specs/DATAMODEL_CONTRACT.md";
if (!existsSync(contractPath)) {
  console.log("ℹ no DATAMODEL_CONTRACT.md yet (pre-Phase 2) — nothing to guard.");
  process.exit(0);
}

const contractMajor = readFileSync(contractPath, "utf8").match(/^#\s*version:\s*(\d+)\./m)?.[1];
if (!contractMajor) {
  console.error(`✗ contract-guard: no '# version: MAJOR...' header in ${contractPath}`);
  process.exit(1);
}

const stale = [];
for (const d of [".iuvareai/stories", ".iuvareai/deltas"]) {
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) {
    if (!f.endsWith(".md") || f === "index.md") continue;
    const fm = parseFrontmatter(readFileSync(join(d, f), "utf8"));
    if (!fm?.contract_version) continue;
    const major = String(fm.contract_version).split(".")[0];
    if (major !== contractMajor)
      stale.push({ file: `${d}/${f}`, shardMajor: major });
  }
}

if (stale.length) {
  console.error(`✗ contract-guard: ${stale.length} shard(s) incompatible with contract v${contractMajor}:`);
  for (const s of stale)
    console.error(`  ${s.file}: shard v${s.shardMajor} → flag STALE`);
  process.exit(1);
}
console.log(`✓ contract-guard: all shards compatible with contract v${contractMajor}.`);
