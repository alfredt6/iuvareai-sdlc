import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateWorkItem } from "../scripts/lib-work-item.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function fixture(overrides = "") {
  const root = mkdtempSync(join(tmpdir(), "iuvare-work-"));
  mkdirSync(join(root, ".iuvareai", "tasks"), { recursive: true });
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "input.ts"), "export {};\n");
  const path = ".iuvareai/tasks/TASK-001.md";
  const base = `---
type: WorkItem
title: customer-import
description: Implement customer import.
lane: standard
risk: low
status: proposed
reads:
  - src/input.ts
writes:
  - src/output.ts
commands: [quality]
acceptance:
  - Invalid rows are rejected
verification:
  - Unit tests pass
contract_touched: false
${overrides}---
`;
  writeFileSync(join(root, path), base);
  return { root, path };
}

test("valid Standard WorkItem passes readiness without a data contract", () => {
  const { root, path } = fixture();
  assert.deepEqual(validateWorkItem(path, { root }).errors, []);
});

test("WorkItem requires acceptance and exact output files", () => {
  const { root, path } = fixture();
  const file = join(root, path);
  writeFileSync(file, readFileSync(file, "utf8").replace("acceptance:\n  - Invalid rows are rejected", "acceptance: []").replace("  - src/output.ts", "  - src/"));
  const errors = validateWorkItem(path, { root }).errors.join("\n");
  assert.match(errors, /acceptance/);
  assert.match(errors, /exact files/);
});

test("contract version is conditional on touching the contract", () => {
  const { root, path } = fixture();
  const file = join(root, path);
  writeFileSync(file, readFileSync(file, "utf8").replace("contract_touched: false", "contract_touched: true"));
  assert.match(validateWorkItem(path, { root }).errors.join("\n"), /contract_version/);
});

test("task-state records legal transitions without an Orchestrator persona", () => {
  const { root, path } = fixture();
  const result = spawnSync(process.execPath, [join(repo, "scripts", "task-state.mjs"), path, "ready"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(join(root, path), "utf8"), /^status: ready$/m);
});
