import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseFrontmatter } from "./lib-frontmatter.mjs";
import { canonicalRepoPath, checkWriteSetFit, isSensitivePath, validateRepoPath } from "./lib-permissions.mjs";

const STATES = new Set(["draft", "ready", "in_progress", "review", "qa", "done", "blocked", "stale"]);
const TRACKS = new Set(["flash", "delta", "blueprint", "genesis"]);
const DELTA_TYPES = new Set(["behavior", "fix", "refactor"]);
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

export function validateShard(shardPath, { root = process.cwd() } = {}) {
  const errors = [];
  const fail = (message) => errors.push(message);
  let shardRepoPath;
  try { shardRepoPath = canonicalRepoPath(root, shardPath); }
  catch (error) { return { errors: [error instanceof Error ? error.message : String(error)], frontmatter: null }; }
  if (!/^[.]iuvareai\/(stories|deltas)\/.+\.md$/.test(shardRepoPath))
    return { errors: [`shard must be a Markdown file under .iuvareai/stories/ or .iuvareai/deltas/: ${shardRepoPath}`], frontmatter: null };
  const absoluteShard = resolve(root, shardRepoPath);
  if (!existsSync(absoluteShard)) return { errors: [`shard path missing or not found: ${shardPath}`], frontmatter: null };

  const fm = parseFrontmatter(readFileSync(absoluteShard, "utf8"));
  if (!fm) return { errors: [`no YAML frontmatter in ${shardPath}`], frontmatter: null };

  // 1. Legal state value. Transition history is enforced by the Orchestrator/state-transition layer.
  if (!fm.status) fail("missing `status`");
  else if (!STATES.has(fm.status)) fail(`invalid status '${fm.status}'`);

  // 2. Strict semver and compatible contract major.
  const contractPath = resolve(root, ".iuvareai/specs/DATAMODEL_CONTRACT.md");
  if (!fm.contract_version) fail("missing `contract_version`");
  else if (!SEMVER_RE.test(String(fm.contract_version))) fail("`contract_version` must be MAJOR.MINOR.PATCH");
  if (existsSync(contractPath)) {
    const contractVersion = readFileSync(contractPath, "utf8").match(/^#\s*version:\s*(\d+\.\d+\.\d+)(?:\s+.*)?$/m)?.[1];
    if (!contractVersion) fail("current data contract has no valid '# version: MAJOR.MINOR.PATCH' header");
    else if (fm.contract_version && SEMVER_RE.test(String(fm.contract_version))) {
      const contractMajor = contractVersion.split(".")[0];
      const shardMajor = String(fm.contract_version).split(".")[0];
      if (contractMajor !== shardMajor)
        fail(`contract major mismatch: shard ${shardMajor} vs contract ${contractMajor}`);
    }
  }

  // 3. Inputs are typed, safe, and present. Deltas must name modified source files here too.
  if (fm.inputs !== undefined && !Array.isArray(fm.inputs)) fail("`inputs` must be a list");
  for (const input of Array.isArray(fm.inputs) ? fm.inputs : []) {
    const reason = validateRepoPath(input);
    if (reason) fail(`invalid input '${String(input)}': ${reason}`);
    else if (isSensitivePath(input)) fail(`sensitive input is excluded from agent context: ${input}`);
    else {
      try { canonicalRepoPath(root, input); }
      catch (error) { fail(error instanceof Error ? error.message : String(error)); continue; }
      if (!existsSync(resolve(root, input))) fail(`missing input: ${input}`);
    }
  }
  if (fm.track === "delta") {
    for (const output of Array.isArray(fm.expected_outputs) ? fm.expected_outputs : []) {
      if (typeof output === "string" && (output.startsWith("src/") || output.startsWith("tests/")) && existsSync(resolve(root, output)) && !(fm.inputs || []).includes(output))
        fail(`delta modified file must also appear in inputs: ${output}`);
    }
  }

  // 4 + 9. Declared outputs must fit one explicit implementation authority.
  if (fm.expected_outputs !== undefined && !Array.isArray(fm.expected_outputs))
    fail("`expected_outputs` must be a list");
  for (const output of Array.isArray(fm.expected_outputs) ? fm.expected_outputs : []) {
    if (typeof output === "string" && isSensitivePath(output))
      fail(`sensitive output is forbidden: ${output}`);
    else if (typeof output === "string") {
      try { canonicalRepoPath(root, output); }
      catch (error) { fail(error instanceof Error ? error.message : String(error)); }
    }
  }
  for (const error of checkWriteSetFit({
    expectedOutputs: fm.expected_outputs,
    implementer: fm.implementer,
    track: fm.track,
    bootstrap: fm.bootstrap,
    conductorReason: fm.conductor_reason,
    agentsDir: resolve(root, ".iuvareai/agents"),
  })) fail(error);

  // 5. Structural testability. Semantic sufficiency remains a Gate 2 responsibility.
  if (!Array.isArray(fm.test_criteria) || fm.test_criteria.length === 0)
    fail("`test_criteria` must be a non-empty list");
  else for (const criterion of fm.test_criteria)
    if (typeof criterion !== "string" || !criterion.trim()) fail("every `test_criteria` entry must be a non-empty string");

  // 6. Dependencies exist and are done.
  if (fm.depends_on !== undefined && !Array.isArray(fm.depends_on)) fail("`depends_on` must be a list");
  for (const dep of Array.isArray(fm.depends_on) ? fm.depends_on : []) {
    const status = findStatus(root, dep);
    if (status === undefined) fail(`dependency ${dep} not found`);
    else if (status !== "done") fail(`dependency ${dep} not done (${status})`);
  }

  // 7. Track is a known risk class.
  if (!fm.track) fail("missing `track`");
  else if (!TRACKS.has(fm.track)) fail(`invalid track '${fm.track}'`);

  // 8. Delta-specific strategy fields are typed and constrained.
  if (fm.track === "delta") {
    if (!DELTA_TYPES.has(fm.delta_type)) fail("delta `delta_type` must be behavior, fix, or refactor");
    if (typeof fm.contract_touched !== "boolean") fail("delta `contract_touched` must be boolean");
  }

  return { errors, frontmatter: fm };
}

function findStatus(root, depId) {
  const id = String(depId).replace(/^(stories|deltas)\//, "");
  for (const dir of [".iuvareai/stories", ".iuvareai/deltas"]) {
    const absoluteDir = resolve(root, dir);
    if (!existsSync(absoluteDir)) continue;
    const hit = readdirSync(absoluteDir).find((file) => file.startsWith(`${id}.`) && file.endsWith(".md"));
    if (hit) return parseFrontmatter(readFileSync(join(absoluteDir, hit), "utf8"))?.status;
  }
  return undefined;
}
