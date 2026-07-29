import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { canonicalRepoPath, isSensitivePath, validateRepoPath } from "../scripts/lib-permissions.mjs";
import {
  classifyCommand, classifyPathRisk, isPathInScope, isSupportedImagePath, requiredScopeRisk, scopeNeedsApproval, validateTaskScope,
} from "../scripts/lib-task-scope.mjs";

const docsScope = {
  goal: "Create customer requirements checklist", lane: "direct", risk: "low",
  reads: ["specs/customer-master/"],
  writes: ["docs/customer-master/CRT_CUSTOMER_MASTER_REQUIREMENTS_CHECKLIST.md"],
  commands: ["quality"], verification: ["Markdown lint passes"],
};

test("project documentation is a valid low-risk exact task output", () => {
  assert.deepEqual(validateTaskScope(docsScope), []);
  assert.equal(requiredScopeRisk(docsScope), "low");
  assert.equal(scopeNeedsApproval(docsScope), false);
});

test("a task grant authorizes exact writes, not its whole directory", () => {
  assert.equal(isPathInScope(docsScope.writes[0], docsScope.writes), true);
  assert.equal(isPathInScope("docs/customer-master/OTHER.md", docsScope.writes), false);
});

test("design images are valid low-risk task inputs", () => {
  const scope = { ...docsScope, reads: ["docs/YBO-Screenshots/", "docs/website/home.png"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(isPathInScope("docs/YBO-Screenshots/mobile.webp", scope.reads), true);
  assert.equal(isSupportedImagePath("docs/website/home.png"), true);
  assert.equal(isSupportedImagePath("docs/website/design.svg"), false);
});

test("sensitive and framework paths receive proportionate handling", () => {
  assert.equal(classifyPathRisk("README.md"), "low");
  assert.equal(classifyPathRisk("package.json"), "medium");
  assert.equal(classifyPathRisk(".github/workflows/deploy.yml"), "high");
  assert.match(validateTaskScope({ ...docsScope, writes: [".env"] }).join("\n"), /forbidden/);
});

test("declared risk may not understate calculated risk", () => {
  const errors = validateTaskScope({ ...docsScope, writes: ["package.json"] });
  assert.match(errors.join("\n"), /understates/);
});

test("direct lane rejects high-risk output", () => {
  const errors = validateTaskScope({ ...docsScope, risk: "high", writes: [".github/workflows/ci.yml"] });
  assert.match(errors.join("\n"), /direct lane/);
});

test("commands map to task classes", () => {
  assert.equal(classifyCommand("git diff --stat"), "inspect");
  assert.equal(classifyCommand("npm test"), "quality");
  assert.equal(classifyCommand("npm install zod"), "dependency");
  assert.equal(classifyCommand("npm run db:migrate"), "database");
  assert.equal(classifyCommand("kubectl deploy app"), "release");
});

test("repository paths reject traversal and secrets", () => {
  assert.match(validateRepoPath("../package.json"), /inside/);
  assert.equal(isSensitivePath(".env.production"), true);
  assert.equal(isSensitivePath(".env.example"), false);
});

test("canonical path resolution blocks lexical and symlink escapes", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "iuvare-root-"));
  const outside = mkdtempSync(join(tmpdir(), "iuvare-outside-"));
  mkdirSync(join(root, "src"));
  symlinkSync(outside, join(root, "src", "escape"));
  assert.throws(() => canonicalRepoPath(root, "src/escape/file.ts"), /escapes/);
});
