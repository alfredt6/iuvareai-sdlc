// Validates a story/delta shard against the Definition of Ready (SDLC §8).
// Usage:
//   SHARD_PATH=.iuvareai/stories/001.003.user-login-rate-limiting.md node scripts/dor-check.mjs
//   node scripts/dor-check.mjs .iuvareai/stories/001.003.user-login-rate-limiting.md
import { validateShard } from "./lib-dor.mjs";

const shardPath = process.env.SHARD_PATH || process.argv[2];
if (!shardPath) {
  console.error("✗ DoR: shard path missing");
  console.error("  usage: node scripts/dor-check.mjs <shard-path>");
  process.exit(1);
}

const { errors } = validateShard(shardPath);
for (const error of errors) console.error(`✗ DoR: ${error}`);
if (errors.length) {
  console.error(`\n✗ DoR FAILED for ${shardPath} (${errors.length} rule violation(s))`);
  process.exit(1);
}
console.log(`✓ DoR passed for ${shardPath}`);
