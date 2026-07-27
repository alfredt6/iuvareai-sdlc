import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = resolve(fileURLToPath(new URL("../scripts/contract-guard.mjs", import.meta.url)));

function fixture(status = "ready", version = "1.0.0") {
  const root = mkdtempSync(join(tmpdir(), "iuvare-contract-"));
  mkdirSync(join(root, ".iuvareai/specs"), { recursive: true });
  mkdirSync(join(root, ".iuvareai/stories"), { recursive: true });
  mkdirSync(join(root, ".iuvareai/deltas"), { recursive: true });
  writeFileSync(join(root, ".iuvareai/specs/DATAMODEL_CONTRACT.md"), "# version: 2.0.0\n");
  const shard = join(root, ".iuvareai/stories/001.001.example.md");
  writeFileSync(shard, `---\ntype: Story\nstatus: ${status}\ncontract_version: "${version}"\n---\n`);
  return { root, shard };
}

test("contract guard blocks an incompatible open shard until it is stale", () => {
  const { root } = fixture();
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /incompatible/);
});

test("--write performs the automatic stale transition", () => {
  const { root, shard } = fixture();
  const result = spawnSync(process.execPath, [script, "--write"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(shard, "utf8"), /^status: stale$/m);
  const verify = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stderr);
});

test("done shards are historical and do not become stale", () => {
  const { root, shard } = fixture("done");
  const result = spawnSync(process.execPath, [script, "--write"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(shard, "utf8"), /^status: done$/m);
});

test("v4 contract-touching WorkItems become blocked while unrelated tasks are ignored", () => {
  const { root } = fixture("done", "2.0.0");
  mkdirSync(join(root, ".iuvareai/tasks"), { recursive: true });
  const touching = join(root, ".iuvareai/tasks/TASK-001.md");
  const unrelated = join(root, ".iuvareai/tasks/TASK-002.md");
  writeFileSync(touching, `---\ntype: WorkItem\nstatus: ready\ncontract_touched: true\ncontract_version: "1.0.0"\n---\n`);
  writeFileSync(unrelated, `---\ntype: WorkItem\nstatus: ready\ncontract_touched: false\n---\n`);
  const result = spawnSync(process.execPath, [script, "--write"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(touching, "utf8"), /^status: blocked$/m);
  assert.match(readFileSync(unrelated, "utf8"), /^status: ready$/m);
});
