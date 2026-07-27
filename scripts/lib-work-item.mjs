import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseFrontmatter } from "./lib-frontmatter.mjs";
import { canonicalRepoPath, validateRepoPath } from "./lib-permissions.mjs";
import { validateTaskScope } from "./lib-task-scope.mjs";

const STATES = new Set(["proposed", "ready", "in_progress", "review", "blocked", "done"]);

export function validateWorkItem(taskPath, { root = process.cwd() } = {}) {
  let repoPath;
  try { repoPath = canonicalRepoPath(root, taskPath); }
  catch (error) { return { errors: [String(error.message ?? error)], frontmatter: null }; }
  if (!/^\.iuvareai\/tasks\/.+\.md$/.test(repoPath))
    return { errors: [`work item must be under .iuvareai/tasks/: ${repoPath}`], frontmatter: null };
  const absolute = resolve(root, repoPath);
  if (!existsSync(absolute)) return { errors: [`work item not found: ${repoPath}`], frontmatter: null };
  const fm = parseFrontmatter(readFileSync(absolute, "utf8"));
  if (!fm) return { errors: ["work item has no YAML frontmatter"], frontmatter: null };

  const errors = [];
  if (fm.type !== "WorkItem") errors.push("type must be WorkItem");
  if (!STATES.has(fm.status)) errors.push("status must be proposed, ready, in_progress, review, blocked, or done");
  if (!Array.isArray(fm.acceptance) || fm.acceptance.length === 0) errors.push("acceptance must be a non-empty list");
  if (fm.lane === "direct") errors.push("Direct work is session-recorded and does not require a committed work item");

  errors.push(...validateTaskScope({
    goal: fm.description || fm.title,
    lane: fm.lane,
    risk: fm.risk,
    reads: fm.reads,
    writes: fm.writes,
    commands: fm.commands,
    verification: fm.verification,
  }));

  for (const input of Array.isArray(fm.reads) ? fm.reads : []) {
    if (validateRepoPath(input) || input.endsWith("/")) continue;
    if (!existsSync(resolve(root, input))) errors.push(`missing read input: ${input}`);
  }
  if (fm.contract_touched !== undefined && typeof fm.contract_touched !== "boolean")
    errors.push("contract_touched must be boolean when present");
  if (fm.contract_touched === true && !/^\d+\.\d+\.\d+$/.test(String(fm.contract_version ?? "")))
    errors.push("contract_version MAJOR.MINOR.PATCH is required when contract_touched is true");

  return { errors: [...new Set(errors)], frontmatter: fm };
}

export const WORK_ITEM_TRANSITIONS = new Map([
  ["proposed", new Set(["ready", "blocked"])],
  ["ready", new Set(["in_progress", "blocked"])],
  ["in_progress", new Set(["review", "blocked"])],
  ["review", new Set(["in_progress", "done", "blocked"])],
  ["blocked", new Set(["proposed", "in_progress"])],
  ["done", new Set()],
]);
