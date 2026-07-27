// Compatibility entry point. v4 work items use task readiness; v3 stories/deltas
// continue to validate during migration.
import { validateShard } from "./lib-dor.mjs";
import { validateWorkItem } from "./lib-work-item.mjs";

const target = process.env.TASK_PATH || process.env.SHARD_PATH || process.argv[2];
if (!target) {
  console.error("✗ path missing\n  usage: node scripts/dor-check.mjs <work-item-or-legacy-shard>");
  process.exit(1);
}
const result = target.replaceAll("\\", "/").startsWith(".iuvareai/tasks/")
  ? validateWorkItem(target)
  : validateShard(target);
for (const error of result.errors) console.error(`✗ Ready: ${error}`);
if (result.errors.length) {
  console.error(`\n✗ readiness FAILED for ${target} (${result.errors.length} violation(s))`);
  process.exit(1);
}
console.log(`✓ readiness passed for ${target}`);
