import { validateWorkItem } from "./lib-work-item.mjs";

const taskPath = process.env.TASK_PATH || process.argv[2];
if (!taskPath) {
  console.error("✗ task path missing\n  usage: node scripts/task-check.mjs <.iuvareai/tasks/file.md>");
  process.exit(1);
}
const { errors } = validateWorkItem(taskPath);
for (const error of errors) console.error(`✗ Task Ready: ${error}`);
if (errors.length) process.exit(1);
console.log(`✓ Task Ready: ${taskPath}`);
