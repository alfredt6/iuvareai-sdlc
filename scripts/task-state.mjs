import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateWorkItem, WORK_ITEM_TRANSITIONS } from "./lib-work-item.mjs";

const [taskPath, next] = process.argv.slice(2);
if (!taskPath || !next) {
  console.error("usage: node scripts/task-state.mjs <task-path> <next-state>");
  process.exit(1);
}
const { errors, frontmatter } = validateWorkItem(taskPath);
const structural = errors.filter((error) => !error.startsWith("status must"));
if (!frontmatter || structural.length) {
  structural.forEach((error) => console.error(`✗ ${error}`));
  process.exit(1);
}
const allowed = WORK_ITEM_TRANSITIONS.get(frontmatter.status);
if (!allowed?.has(next)) {
  console.error(`✗ illegal transition ${frontmatter.status} -> ${next}`);
  process.exit(1);
}
const absolute = resolve(taskPath);
const source = readFileSync(absolute, "utf8");
const current = `status: ${frontmatter.status}`;
if (source.split(current).length !== 2) {
  console.error("✗ status line is missing or not unique");
  process.exit(1);
}
writeFileSync(absolute, source.replace(current, `status: ${next}`));
console.log(`✓ ${frontmatter.status} -> ${next}: ${taskPath}`);
