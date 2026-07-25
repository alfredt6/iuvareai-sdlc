import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installer = join(repo, "scripts", "iuvareai-init.mjs");

test("installer preflight leaves no partial bundle on collision", () => {
  const target = mkdtempSync(join(tmpdir(), "iuvare-install-collision-"));
  mkdirSync(join(target, "scripts"));
  writeFileSync(join(target, "scripts", "dor-check.mjs"), "do not overwrite\n");
  const result = spawnSync(process.execPath, [installer, target], { encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(join(target, ".iuvareai")), false);
  assert.equal(readFileSync(join(target, "scripts", "dor-check.mjs"), "utf8"), "do not overwrite\n");
});

test("installer and Pi activation ship the runnable permission gate", () => {
  const target = mkdtempSync(join(tmpdir(), "iuvare-install-ok-"));
  const install = spawnSync(process.execPath, [installer, target], { encoding: "utf8" });
  assert.equal(install.status, 0, install.stderr);
  assert.equal(existsSync(join(target, "integrations", "pi", "iuvareai-sandbox.ts")), true);

  const activate = spawnSync(process.execPath, [join(target, "scripts", "activate-pi-skills.mjs")], {
    cwd: target,
    encoding: "utf8",
  });
  assert.equal(activate.status, 0, activate.stderr);
  assert.equal(existsSync(join(target, ".pi", "extensions", "iuvareai-sandbox.ts")), true);
  assert.match(activate.stdout, /fail-closed permission gate/);
});
