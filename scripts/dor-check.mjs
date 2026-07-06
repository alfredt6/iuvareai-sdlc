// scripts/dor-check.mjs
// Validates a story/delta shard against the Definition of Ready (SDLC §8).
// Usage:
//   SHARD_PATH=.iuvareai/stories/001.003.user-login-rate-limiting.md node scripts/dor-check.mjs
//   node scripts/dor-check.mjs .iuvareai/stories/001.003.user-login-rate-limiting.md
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./lib-frontmatter.mjs";

const shardPath = process.env.SHARD_PATH || process.argv[2];
if (!shardPath || !existsSync(shardPath)) {
  console.error(`✗ DoR: shard path missing or not found: ${shardPath}`);
  console.error(`  usage: node scripts/dor-check.mjs <shard-path>`);
  process.exit(1);
}

const fm = parseFrontmatter(readFileSync(shardPath, "utf8"));
if (!fm) {
  console.error(`✗ DoR: no YAML frontmatter in ${shardPath}`);
  process.exit(1);
}

let failed = false;
const fail = (m) => { console.error(`✗ DoR: ${m}`); failed = true; };

// 1. status set
if (!fm.status) fail("missing `status`");

// 2. contract_version present + major matches current contract (if a contract exists)
const contractPath = ".iuvareai/specs/DATAMODEL_CONTRACT.md";
if (existsSync(contractPath)) {
  if (!fm.contract_version) fail("missing `contract_version`");
  const contractMajor = readFileSync(contractPath, "utf8").match(/^#\s*version:\s*(\d+)\./m)?.[1];
  const shardMajor = String(fm.contract_version || "").split(".")[0];
  if (contractMajor && shardMajor && contractMajor !== shardMajor)
    fail(`contract major mismatch: shard ${shardMajor} vs contract ${contractMajor}`);
}

// 3. every inputs path exists
for (const p of fm.inputs || []) if (!existsSync(p)) fail(`missing input: ${p}`);

// 4. expected_outputs declared
if (!fm.expected_outputs?.length) fail("`expected_outputs` empty");

// 5. test_criteria present + non-empty
if (!fm.test_criteria?.length) fail("`test_criteria` empty");

// 6. every depends_on story is 'done'
for (const dep of fm.depends_on || []) {
  const status = findStatus(dep);
  if (status === undefined) fail(`dependency ${dep} not found`);
  else if (status !== "done") fail(`dependency ${dep} not done (${status})`);
}

// 7. track set
if (!fm.track) fail("missing `track`");

// 8. delta-only fields
if (fm.track === "delta") {
  if (!fm.delta_type) fail("delta missing `delta_type`");
  if (fm.contract_touched === undefined || fm.contract_touched === null)
    fail("delta missing `contract_touched`");
}

function findStatus(depId) {
  const id = String(depId).replace(/^(stories|deltas)\//, "");
  for (const d of [".iuvareai/stories", ".iuvareai/deltas"]) {
    if (!existsSync(d)) continue;
    const hit = readdirSync(d).find((f) => f.startsWith(id + ".") && f.endsWith(".md"));
    if (hit) return parseFrontmatter(readFileSync(join(d, hit), "utf8"))?.status;
  }
  return undefined;
}

if (failed) {
  console.error(`\n✗ DoR FAILED for ${shardPath}`);
  process.exit(1);
}
console.log(`✓ DoR passed for ${shardPath}`);
