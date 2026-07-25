// Shared permission-fit helpers for DoR and harness integrations.
// Persona write sets are read from .iuvareai/agents/*.md; no duplicated matrix.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, posix, relative, resolve, sep } from "node:path";
import { parseFrontmatter } from "./lib-frontmatter.mjs";

export const CONDUCTOR = "conductor";

export function validateRepoPath(value) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0)
    return "must be a non-empty, trimmed string";
  if (value.includes("\\")) return "must use POSIX '/' separators";
  if (value.includes("\0")) return "must not contain a NUL byte";
  if (isAbsolute(value) || /^[A-Za-z]:/.test(value)) return "must be repository-relative";
  const normalized = posix.normalize(value);
  if (normalized === "." || normalized === ".." || normalized.startsWith("../"))
    return "must stay inside the repository";
  if (normalized !== value) return `must be normalized (use '${normalized}')`;
  return null;
}

export function matchesWritePattern(repoPath, pattern) {
  if (validateRepoPath(repoPath) || validateRepoPath(pattern)) return false;
  if (pattern.endsWith("/")) return repoPath.startsWith(pattern) && repoPath.length > pattern.length;
  if (!pattern.includes("*")) return repoPath === pattern;

  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const glob = escaped.replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*");
  return new RegExp(`^${glob}$`).test(repoPath);
}

export function loadPersonaWriteSets(agentsDir = ".iuvareai/agents") {
  const sets = new Map();
  if (!existsSync(agentsDir)) return sets;
  for (const file of readdirSync(agentsDir).sort()) {
    if (!file.endsWith(".md") || file === "index.md") continue;
    const fm = parseFrontmatter(readFileSync(resolve(agentsDir, file), "utf8"));
    if (!fm?.persona) continue;
    sets.set(String(fm.persona), Array.isArray(fm.writes_to) ? fm.writes_to : []);
  }
  return sets;
}

export function checkWriteSetFit({
  expectedOutputs,
  implementer,
  track,
  bootstrap,
  conductorReason,
  agentsDir = ".iuvareai/agents",
}) {
  const errors = [];
  if (!Array.isArray(expectedOutputs) || expectedOutputs.length === 0)
    return ["`expected_outputs` must be a non-empty list"];

  for (const output of expectedOutputs) {
    const reason = validateRepoPath(output);
    if (reason) errors.push(`invalid expected_output '${String(output)}': ${reason}`);
  }
  if (errors.length) return errors;

  if (!implementer) return ["missing `implementer`"];
  const hasRootOutput = expectedOutputs.some((path) => !path.includes("/"));
  if (implementer === CONDUCTOR) {
    if (typeof conductorReason !== "string" || !conductorReason.trim())
      errors.push("conductor implementation requires a non-empty `conductor_reason`");
    if (hasRootOutput && typeof bootstrap !== "boolean")
      errors.push("repository-root Conductor outputs require an explicit boolean `bootstrap`");
    if (bootstrap === true && track !== "genesis")
      errors.push("`bootstrap: true` is valid only on the Genesis track");
    return errors;
  }

  if (hasRootOutput)
    errors.push("repository-root outputs require `implementer: conductor`");
  if (bootstrap === true)
    errors.push("`bootstrap: true` requires `implementer: conductor`");

  const writeSets = loadPersonaWriteSets(agentsDir);
  if (!writeSets.has(implementer)) {
    errors.push(`unknown implementer '${implementer}' (no matching persona in ${agentsDir})`);
    return errors;
  }
  const allowed = writeSets.get(implementer);
  if (!allowed.length) {
    errors.push(`implementer '${implementer}' has an empty writes_to set`);
    return errors;
  }
  for (const output of expectedOutputs) {
    if (!allowed.some((pattern) => matchesWritePattern(output, pattern)))
      errors.push(`implementer '${implementer}' may not write '${output}' (allowed: ${allowed.join(", ")})`);
  }
  return errors;
}

// Resolve a tool path and its nearest existing ancestor to prevent lexical and
// symlink escapes from the project root. Returns a repo-relative POSIX path.
export function canonicalRepoPath(root, target) {
  const rootReal = realpathSync(resolve(root));
  const absolute = resolve(rootReal, target);
  let existing = absolute;
  while (!existsSync(existing) && existing !== dirname(existing)) existing = dirname(existing);
  const existingReal = realpathSync(existing);
  const suffix = relative(existing, absolute);
  const canonical = resolve(existingReal, suffix);
  const rel = relative(rootReal, canonical);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
    throw new Error(`path escapes project root: ${target}`);
  return rel.split(sep).join("/");
}

export function isSensitivePath(repoPath) {
  const parts = repoPath.toLowerCase().split("/");
  const base = parts.at(-1) ?? "";
  if (parts.some((p) => [".ssh", ".aws", ".gnupg"].includes(p))) return true;
  if (base === ".env" || (base.startsWith(".env.") && base !== ".env.example")) return true;
  if (/\.(pem|key|p12|pfx)$/i.test(base)) return true;
  return ["credentials", "credentials.json", "secrets.json", "secrets.yaml", "secrets.yml"].includes(base);
}
