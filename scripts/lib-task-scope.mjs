import { isSensitivePath, validateRepoPath } from "./lib-permissions.mjs";

export const LANES = new Set(["direct", "standard", "controlled"]);
export const RISKS = ["low", "medium", "high", "critical"];
export const COMMAND_CLASSES = new Set([
  "inspect", "quality", "build", "dependency", "database", "network", "release", "destructive",
]);

const RISK_INDEX = new Map(RISKS.map((risk, index) => [risk, index]));
const HIGH_PATHS = [
  /^\.github\//, /^\.gitlab-ci/, /^\.pi\//, /^infra\//, /^terraform\//, /^k8s\//,
  /^deploy\//, /^migrations\//, /^scripts\/deploy/, /^integrations\//,
  /^\.iuvareai\/(agents|policies|docs)\//, /^\.iuvareai\/IUVARE_AI_SDLC_/, /^AGENTS\.md$/,
];
const MEDIUM_PATHS = [
  /(^|\/)(package|composer)\.json$/, /(^|\/)(package-lock|pnpm-lock|yarn\.lock|bun\.lockb)\b/,
  /(^|\/)Dockerfile$/, /(^|\/)docker-compose[^/]*$/, /(^|\/)(tsconfig|vite\.config|next\.config)[^/]*$/,
  /^\.iuvareai\/(specs|tasks|stories|deltas)\//,
];
const COMMAND_RISK = {
  inspect: "low", quality: "low", build: "low", dependency: "medium", network: "medium",
  database: "high", release: "critical", destructive: "critical",
};

export function compareRisk(left, right) {
  return (RISK_INDEX.get(left) ?? -1) - (RISK_INDEX.get(right) ?? -1);
}

export function maxRisk(...risks) {
  return risks.filter((risk) => RISK_INDEX.has(risk)).sort(compareRisk).at(-1) ?? "low";
}

export function isForbiddenRepoPath(path) {
  return isSensitivePath(path) || path === ".git" || path.startsWith(".git/")
    || path === "node_modules" || path.startsWith("node_modules/") || path.includes("/node_modules/");
}

export function classifyPathRisk(path) {
  if (isForbiddenRepoPath(path)) return "critical";
  if (HIGH_PATHS.some((pattern) => pattern.test(path))) return "high";
  if (MEDIUM_PATHS.some((pattern) => pattern.test(path))) return "medium";
  return "low";
}

export function requiredScopeRisk({ lane, writes = [], commands = [] }) {
  const laneRisk = lane === "controlled" ? "high" : "low";
  return maxRisk(
    laneRisk,
    ...writes.map(classifyPathRisk),
    ...commands.map((commandClass) => COMMAND_RISK[commandClass] ?? "critical"),
  );
}

export function validateTaskScope(scope) {
  const errors = [];
  if (!scope || typeof scope !== "object") return ["scope must be an object"];
  if (typeof scope.goal !== "string" || !scope.goal.trim()) errors.push("goal must be non-empty");
  if (!LANES.has(scope.lane)) errors.push("lane must be direct, standard, or controlled");
  if (!RISK_INDEX.has(scope.risk)) errors.push("risk must be low, medium, high, or critical");

  for (const field of ["reads", "writes", "commands", "verification"]) {
    if (!Array.isArray(scope[field])) errors.push(`${field} must be a list`);
  }
  for (const field of ["reads", "writes"]) {
    for (const path of Array.isArray(scope[field]) ? scope[field] : []) {
      const reason = validateRepoPath(path);
      if (reason) errors.push(`invalid ${field} path '${String(path)}': ${reason}`);
      else if (isForbiddenRepoPath(path)) errors.push(`forbidden ${field} path: ${path}`);
      else if (field === "writes" && path.endsWith("/")) errors.push(`write scope must name exact files, not a directory: ${path}`);
    }
  }
  for (const commandClass of Array.isArray(scope.commands) ? scope.commands : []) {
    if (!COMMAND_CLASSES.has(commandClass)) errors.push(`unknown command class: ${commandClass}`);
  }
  if (!Array.isArray(scope.writes) || scope.writes.length === 0) errors.push("writes must name at least one exact output");
  if (!Array.isArray(scope.verification) || scope.verification.length === 0)
    errors.push("verification must contain at least one completion check");

  if (LANES.has(scope.lane) && RISK_INDEX.has(scope.risk)) {
    const required = requiredScopeRisk(scope);
    if (compareRisk(scope.risk, required) < 0)
      errors.push(`declared risk '${scope.risk}' understates required risk '${required}'`);
    if (scope.lane !== "controlled" && compareRisk(required, "medium") > 0)
      errors.push(`${scope.lane} lane cannot contain ${required}-risk work; use controlled`);
  }
  return errors;
}

export function scopeNeedsApproval(scope) {
  return compareRisk(requiredScopeRisk(scope), "medium") >= 0;
}

export function isPathInScope(path, entries = []) {
  return entries.some((entry) => entry.endsWith("/") ? path.startsWith(entry) : path === entry);
}

export function classifyCommand(command) {
  const value = command.trim();
  if (/^(pwd|ls|find|rg|grep|git\s+(status|diff|show|log|branch))(\s|$)/.test(value)) return "inspect";
  if (/^(npm|pnpm|yarn|bun)\s+(test|run\s+(test[^ ]*|lint|typecheck|check))(\s|$)/.test(value)) return "quality";
  if (/^node\s+(--test\b|scripts\/(task-check|dor-check|contract-guard|okf-conformance)\.mjs\b)/.test(value)) return "quality";
  if (/^(npm|pnpm|yarn|bun)\s+run\s+build(\s|$)/.test(value)) return "build";
  if (/^(npm|pnpm|yarn|bun)\s+(install|add|remove|update)(\s|$)/.test(value)) return "dependency";
  if (/^(npm|pnpm|yarn|bun)\s+run\s+db:(generate|push|migrate)(\s|$)/.test(value)) return "database";
  if (/^(curl|wget|gh\s+api)(\s|$)/.test(value)) return "network";
  if (/\b(deploy|release|kubectl|terraform\s+apply)\b/.test(value)) return "release";
  if (/\b(rm|rmdir|del|drop|truncate|reset\s+--hard|force)\b/i.test(value)) return "destructive";
  return null;
}
