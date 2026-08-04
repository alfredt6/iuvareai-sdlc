import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  canonicalReadPath, canonicalRepoPath, canonicalScopeReadPath, isExternalReadPath,
  isForbiddenExternalReadPath, isSensitivePath, validateReadPath, validateRepoPath,
} from "../scripts/lib-permissions.mjs";
import {
  classifyCommand, classifyPathRisk, classifyReadRisk, isPathInScope, isSupportedImagePath, redactCloudOutput, requiredScopeRisk, scopeNeedsApproval, validateCloudOperation, validateTaskScope,
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

test("external source reads are explicit, read-only, and human-approved", () => {
  const external = join(tmpdir(), "iuvare-shared-source").replace(/\\/g, "/") + "/";
  const scope = { ...docsScope, risk: "medium", reads: [external], writes: [] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(classifyReadRisk(external), "medium");
  assert.equal(requiredScopeRisk(scope), "medium");
  assert.equal(scopeNeedsApproval(scope), true);
  assert.equal(isExternalReadPath(external), true);
  assert.match(validateTaskScope({ ...scope, writes: [external + "changed.ts"] }).join("\n"), /repository-relative/);
});

test("external read paths reject filesystem roots, secrets, and repository metadata", () => {
  assert.match(validateReadPath("/"), /filesystem root/);
  assert.match(validateReadPath("C:/"), /filesystem root/);
  assert.match(validateReadPath("C:/source/../"), /filesystem root/);
  assert.equal(isForbiddenExternalReadPath("C:/shared/repo/.git/config"), true);
  assert.equal(isForbiddenExternalReadPath("C:/shared/repo/.env"), true);
  assert.equal(isForbiddenExternalReadPath("C:/Users/operator/.config/doctl/config.yaml"), true);
  assert.equal(isForbiddenExternalReadPath("C:/Users/operator/.azure/accessTokens.json"), true);
  assert.equal(isForbiddenExternalReadPath("/proc/self/environ"), true);
  assert.match(validateTaskScope({ ...docsScope, risk: "critical", reads: ["C:/shared/repo/.git/"] }).join("\n"), /forbidden external/);
});

test("canonical external reads retain directory scope without weakening local writes", () => {
  const root = mkdtempSync(join(tmpdir(), "iuvare-root-"));
  const external = mkdtempSync(join(tmpdir(), "iuvare-source-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(external, "shared.ts"), "export {};\n");
  const scopeEntry = canonicalScopeReadPath(root, external + "/");
  const source = canonicalReadPath(root, join(external, "shared.ts"));
  assert.equal(isExternalReadPath(scopeEntry), true);
  assert.equal(isPathInScope(source, [scopeEntry]), true);
  assert.throws(() => canonicalRepoPath(root, join(external, "shared.ts")), /escapes/);
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
  assert.equal(classifyCommand("doctl compute droplet list"), "cloud");
  assert.equal(classifyCommand("zeabur deploy"), "cloud");
  assert.equal(classifyCommand("aws ec2 describe-instances"), "cloud");
  assert.equal(classifyCommand("az vm create --name app"), "cloud");
  assert.equal(classifyCommand("gcloud compute instances list"), "cloud");
  assert.equal(classifyCommand("terraform apply plan.tfplan"), "cloud");
  assert.equal(classifyCommand("pulumi up --yes"), "cloud");
  assert.equal(classifyCommand("docker build -t app:test ."), "container");
  assert.equal(classifyCommand("docker image build ."), "container");
  assert.equal(classifyCommand("docker buildx build --load ."), "container");
  assert.equal(classifyCommand("docker compose build app"), "container");
  assert.equal(classifyCommand("docker-compose build app"), "container");
  assert.equal(classifyCommand("docker compose up -d --no-deps --force-recreate worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose logs worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose ps"), "inspect");
  assert.equal(classifyCommand("docker compose up -d worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose up --detach worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose restart worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose -f compose.dev.yml --profile workers up -d worker"), "container-runtime");
  assert.equal(classifyCommand("docker-compose stop worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose down"), "container-runtime");
  assert.equal(classifyCommand("docker logs worker"), "container-runtime");
  assert.equal(classifyCommand("docker top worker"), "container-runtime");
  assert.equal(classifyCommand("docker compose top worker"), "container-runtime");
  assert.equal(classifyCommand("docker ps"), "inspect");
  assert.equal(classifyCommand("docker buildx build --push ."), "release");
  assert.equal(classifyCommand("docker buildx build --push=true ."), "release");
  assert.equal(classifyCommand("docker buildx build --output=type=registry ."), "release");
  assert.equal(classifyCommand("docker buildx build --cache-to type=registry,ref=cache ."), "release");
  assert.equal(classifyCommand("docker run app:test"), "container");
  assert.equal(classifyCommand("docker exec worker npm test"), "container");
  assert.equal(classifyCommand("docker compose exec worker npm test"), "container");
  assert.equal(classifyCommand("docker compose run --rm worker npm test"), "container");
  assert.equal(classifyCommand("docker compose up --build worker"), "container");
  assert.equal(classifyCommand("docker commit worker local:debug"), "container");
  assert.equal(classifyCommand("docker volume create cache"), "container");
  assert.equal(classifyCommand("docker network create app-net"), "container");
  assert.equal(classifyCommand("docker push app:latest"), "release");
  assert.equal(classifyCommand("docker compose push worker"), "release");
  assert.equal(classifyCommand("docker compose down --volumes"), "destructive");
  assert.equal(classifyCommand("docker compose up -V worker"), "destructive");
  assert.equal(classifyCommand("docker compose rm -f worker"), "destructive");
  assert.equal(classifyCommand("docker system prune -f"), "destructive");
  assert.equal(classifyCommand("docker rm -f worker"), "destructive");
  assert.equal(classifyCommand("docker login registry.example.com"), null);
  assert.equal(classifyCommand("docker inspect worker"), null);
  assert.equal(classifyCommand("docker compose config"), null);
  assert.equal(classifyCommand("docker cp worker:/run/secrets/token ."), null);
  assert.equal(classifyCommand("kubectl deploy app"), "release");
});

test("cloud operations require critical Controlled authorization and reject credentials", () => {
  const scope = { ...docsScope, lane: "controlled", risk: "critical", writes: [], commands: ["cloud"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(requiredScopeRisk(scope), "critical");
  assert.equal(scopeNeedsApproval(scope), true);
  assert.match(validateTaskScope({ ...scope, lane: "direct" }).join("\n"), /use controlled/);
  assert.deepEqual(validateCloudOperation("digitalocean", ["compute", "droplet", "list"]), []);
  assert.match(validateCloudOperation("zeabur", ["auth", "login", "--token=secret"]).join("\n"), /credential|authentication/);
  assert.match(validateCloudOperation("aws", ["secretsmanager", "get-secret-value"]).join("\n"), /secret retrieval/);
  assert.match(validateCloudOperation("aws", ["deploy", "AbCdEf0123456789AbCdEf0123456789AbCdEf01"]).join("\n"), /secret values/);
  assert.match(validateCloudOperation("custom", ["deploy"]).join("\n"), /unsupported/);
  const sanitized = redactCloudOutput('{"token":"dop_v1_example","password":"do not retain"} Bearer abc123');
  assert.doesNotMatch(sanitized, /dop_v1_example|do not retain|abc123/);
  assert.match(sanitized, /REDACTED/);
});

test("common local container runtime commands require one medium-risk scope", () => {
  const scope = { ...docsScope, lane: "direct", risk: "medium", writes: [], commands: ["container-runtime"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(requiredScopeRisk(scope), "medium");
  assert.equal(scopeNeedsApproval(scope), true);
});

test("local Docker image builds and arbitrary execution require critical Controlled authorization", () => {
  const scope = { ...docsScope, lane: "controlled", risk: "critical", writes: [], commands: ["container"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(requiredScopeRisk(scope), "critical");
  assert.equal(scopeNeedsApproval(scope), true);
  assert.match(validateTaskScope({ ...scope, lane: "direct" }).join("\n"), /use controlled/);
});

test("the Pi gate requires exact-action confirmation for container builds", () => {
  const gate = readFileSync(new URL("../integrations/pi/iuvareai-sandbox.ts", import.meta.url), "utf8");
  assert.match(gate, /commandClass === "container" \|\| commandClass === "release"/);
  assert.match(gate, /ctx\.ui\.confirm\("Critical action"/);
  assert.match(gate, /container-runtime/);
  assert.doesNotMatch(gate, /commandClass === "container-runtime"/);
  assert.match(gate, /External reads \(read-only\)/);
  assert.match(gate, /canonicalScopeReadPath/);
  assert.match(gate, /iuvare_cloud_operation/);
  assert.match(gate, /validateCloudOperation/);
  assert.match(gate, /shell: false/);
  assert.match(gate, /resolveCloudExecutable/);
  assert.match(gate, /insideProject/);
  assert.match(gate, /raw cloud CLI commands are disabled/);
  assert.doesNotMatch(gate, /pi\.exec\(executable/);
});

test("git mutation scope is available to every lens through the shared capability model", () => {
  const scope = { ...docsScope, risk: "medium", commands: ["git"] };
  assert.deepEqual(validateTaskScope(scope), []);
  assert.equal(requiredScopeRisk(scope), "medium");
  assert.equal(scopeNeedsApproval(scope), true);
});

test("repository paths reject traversal and secrets", () => {
  assert.match(validateRepoPath("../package.json"), /inside/);
  assert.equal(isSensitivePath("C:\\shared\\.env.production"), true);
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
