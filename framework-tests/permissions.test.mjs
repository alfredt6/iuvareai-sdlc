import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  canonicalRepoPath,
  checkWriteSetFit,
  isSensitivePath,
  matchesWritePattern,
  validateRepoPath,
} from "../scripts/lib-permissions.mjs";

function agentsFixture() {
  const root = mkdtempSync(join(tmpdir(), "iuvare-permissions-"));
  const agents = join(root, ".iuvareai", "agents");
  mkdirSync(agents, { recursive: true });
  writeFileSync(join(agents, "developer.md"), `---\ntype: Persona\npersona: developer\nwrites_to:\n  - "src/"\n  - "tests/"\n---\n`);
  writeFileSync(join(agents, "test-architect.md"), `---\ntype: Persona\npersona: test-architect\nwrites_to:\n  - "tests/"\n  - ".iuvareai/docs/"\n---\n`);
  writeFileSync(join(agents, "platform.md"), `---\ntype: Persona\npersona: platform\nwrites_to:\n  - "package.json"\n---\n`);
  return { root, agents };
}

test("write patterns distinguish directories, exact files, and globs", () => {
  assert.equal(matchesWritePattern("src/a.ts", "src/"), true);
  assert.equal(matchesWritePattern("src2/a.ts", "src/"), false);
  assert.equal(matchesWritePattern(".iuvareai/stories/001.md", ".iuvareai/stories/*.md"), true);
  assert.equal(matchesWritePattern(".iuvareai/stories/nested/001.md", ".iuvareai/stories/*.md"), false);
});

test("repository paths reject traversal, absolute paths, and Windows separators", () => {
  assert.match(validateRepoPath("../package.json"), /inside/);
  assert.match(validateRepoPath("C:/package.json"), /relative/);
  assert.match(validateRepoPath("src\\a.ts"), /POSIX/);
  assert.equal(validateRepoPath("package.json"), null);
});

test("developer output must fit the developer write set", () => {
  const { agents } = agentsFixture();
  assert.deepEqual(checkWriteSetFit({ expectedOutputs: ["src/a.ts", "tests/a.test.ts"], implementer: "developer", track: "genesis", agentsDir: agents }), []);
  assert.match(checkWriteSetFit({ expectedOutputs: ["package.json"], implementer: "developer", track: "genesis", agentsDir: agents }).join("\n"), /implementer: conductor/);
});

test("Test Architect owns framework docs, not repository docs", () => {
  const { agents } = agentsFixture();
  assert.deepEqual(checkWriteSetFit({ expectedOutputs: [".iuvareai/docs/plan.md"], implementer: "test-architect", track: "genesis", agentsDir: agents }), []);
  assert.match(checkWriteSetFit({ expectedOutputs: ["docs/onboarding.md"], implementer: "test-architect", track: "genesis", agentsDir: agents })[0], /may not write/);
});

test("root writes are explicit Conductor actions and bootstrap is Genesis-only", () => {
  assert.deepEqual(checkWriteSetFit({ expectedOutputs: ["package.json"], implementer: "conductor", track: "genesis", bootstrap: true, conductorReason: "One-time toolchain bootstrap" }), []);
  assert.deepEqual(checkWriteSetFit({ expectedOutputs: ["package.json"], implementer: "conductor", track: "delta", bootstrap: false, conductorReason: "Human-reviewed dependency update" }), []);
  assert.match(checkWriteSetFit({ expectedOutputs: ["package.json"], implementer: "conductor", track: "blueprint", bootstrap: true, conductorReason: "x" })[0], /Genesis/);
  assert.match(checkWriteSetFit({ expectedOutputs: ["package.json"], implementer: "conductor", track: "genesis", bootstrap: true })[0], /conductor_reason/);
  assert.match(checkWriteSetFit({ expectedOutputs: ["package.json"], implementer: "platform", track: "genesis", agentsDir: agentsFixture().agents })[0], /implementer: conductor/);
});

test("canonical path resolution blocks lexical and symlink escapes", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "iuvare-root-"));
  const outside = mkdtempSync(join(tmpdir(), "iuvare-outside-"));
  mkdirSync(join(root, "src"));
  symlinkSync(outside, join(root, "src", "escape"));
  assert.throws(() => canonicalRepoPath(root, "src/escape/file.ts"), /escapes/);
  assert.equal(canonicalRepoPath(root, "src/new.ts"), "src/new.ts");
});

test("secret detection is precise enough to allow the secrets policy", () => {
  assert.equal(isSensitivePath(".env.production"), true);
  assert.equal(isSensitivePath(".env.example"), false);
  assert.equal(isSensitivePath("keys/prod.pem"), true);
  assert.equal(isSensitivePath(".iuvareai/policies/secrets.md"), false);
  assert.equal(isSensitivePath("src/secret-safe-configuration.ts"), false);
});
