import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
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

test("design images are valid low-risk inputs and exact transform outputs", () => {
  const scope = {
    ...docsScope,
    reads: ["docs/YBO-Screenshots/", "docs/website/home.png"],
    writes: ["docs/website/home-cropped.webp"],
    commands: ["image"],
  };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(scopeNeedsApproval(scope), false);
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

test("scoped file trees support copy and move without broad built-in writes", () => {
  const scope = {
    ...docsScope,
    risk: "medium",
    writes: [],
    writeTrees: ["docs/archive/"],
    deletes: ["docs/source/"],
    reads: ["docs/source/"],
    commands: ["filesystem"],
  };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(scopeNeedsApproval(scope), true);
  assert.equal(isPathInScope("docs/archive/copied/file.md", scope.writeTrees), true);
  assert.equal(isPathInScope("docs/source", scope.deletes), true);
});

test("commands map to task classes", () => {
  assert.equal(classifyCommand("git diff --stat"), "inspect");
  assert.equal(classifyCommand("git branch"), "inspect");
  assert.equal(classifyCommand("git add src/app.ts"), "git");
  assert.equal(classifyCommand("git commit -m update"), "git");
  assert.equal(classifyCommand("git fetch origin"), "network");
  assert.equal(classifyCommand("git push --force origin main"), "destructive");
  assert.equal(classifyCommand("git reset --hard HEAD"), "destructive");
  assert.equal(classifyCommand("git clean -fd"), "destructive");
  assert.equal(classifyCommand("git branch -D obsolete"), "destructive");
  assert.equal(classifyCommand("git config --global user.name agent"), null);
  assert.equal(classifyCommand("git -C ../outside status"), null);
  assert.equal(classifyCommand("cp -r docs/a docs/b"), "filesystem");
  assert.equal(classifyCommand("mv docs/a docs/b"), "filesystem");
  assert.equal(classifyCommand("magick source.png target.webp"), "image");
  assert.equal(classifyCommand("npm test"), "quality");
  assert.equal(classifyCommand("npm install zod"), "dependency");
  assert.equal(classifyCommand("npm run db:migrate"), "database");
  assert.equal(classifyCommand("docker build -t app:test ."), "container");
  assert.equal(classifyCommand("docker image build ."), "container");
  assert.equal(classifyCommand("docker buildx build --load ."), "container");
  assert.equal(classifyCommand("docker compose build app"), "container");
  assert.equal(classifyCommand("docker-compose build app"), "container");
  assert.equal(classifyCommand("docker buildx build --push ."), "release");
  assert.equal(classifyCommand("docker buildx build --push=true ."), "release");
  assert.equal(classifyCommand("docker buildx build --output=type=registry ."), "release");
  assert.equal(classifyCommand("docker buildx build --cache-to type=registry,ref=cache ."), "release");
  assert.equal(classifyCommand("docker run app:test"), null);
  assert.equal(classifyCommand("docker compose up"), null);
  assert.equal(classifyCommand("kubectl deploy app"), "release");
});

test("local Docker image builds require critical Controlled authorization", () => {
  const scope = { ...docsScope, lane: "controlled", risk: "critical", commands: ["container"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(requiredScopeRisk(scope), "critical");
  assert.equal(scopeNeedsApproval(scope), true);
  assert.match(validateTaskScope({ ...scope, lane: "direct" }).join("\n"), /use controlled/);
});

test("the Pi gate requires exact-action confirmation for container builds", () => {
  const gate = readFileSync(new URL("../integrations/pi/iuvareai-sandbox.ts", import.meta.url), "utf8");
  assert.match(gate, /commandClass === "container" \|\| commandClass === "release"/);
  assert.match(gate, /ctx\.ui\.confirm\("Critical action"/);
});

test("git mutation scope is available to every lens through the shared capability model", () => {
  const scope = { ...docsScope, risk: "medium", commands: ["git"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(requiredScopeRisk(scope), "medium");
  assert.equal(scopeNeedsApproval(scope), true);
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
