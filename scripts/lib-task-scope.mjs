import {
  isExternalReadPath, isForbiddenExternalReadPath, isSensitivePath, validateReadPath, validateRepoPath,
} from "./lib-permissions.mjs";

export const LANES = new Set(["direct", "standard", "controlled"]);
export const RISKS = ["low", "medium", "high", "critical"];
export const COMMAND_CLASSES = new Set([
  "inspect", "quality", "build", "container", "container-runtime", "cloud", "git", "image", "filesystem", "dependency", "database", "network", "release", "destructive",
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
  inspect: "low", quality: "low", build: "low", container: "critical", "container-runtime": "medium", cloud: "critical", git: "medium", image: "low", filesystem: "medium", dependency: "medium", network: "medium",
  database: "high", release: "critical", destructive: "critical",
};
const SUPPORTED_IMAGE_RE = /\.(?:jpe?g|png|gif|webp|bmp)$/i;
export const CLOUD_PROVIDERS = new Set([
  "digitalocean", "zeabur", "aws", "azure", "gcp", "terraform", "pulumi", "flyio", "railway", "vercel",
]);
const CLOUD_CREDENTIAL_ARG_RE = /(?:^|[-_])(token|api[-_]?key|password|passphrase|credential|client[-_]?secret|access[-_]?key|private[-_]?key)(?:$|[=_-])/i;
const CLOUD_SECRET_VALUE_RE = /(?:^|=)(?:dop_v1_|sk-|ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_\-]+$/;
const CLOUD_OPAQUE_VALUE_RE = /^[A-Za-z0-9+/_=-]{40,}$/;
const CLOUD_FORBIDDEN_ACTION_RE = /(^|\s)(auth|login|logout|configure|credentials?|secrets?|secretsmanager|iam)(\s|$)|\b(get-access-token|get-secret-value|show-secrets|service-accounts?\s+keys?|role-assignment|keyvault\s+secret|variables?\s+(?:list|get)|env\s+(?:pull|list|ls))\b/i;

export function isSupportedImagePath(path) {
  return typeof path === "string" && SUPPORTED_IMAGE_RE.test(path);
}

export function validateCloudOperation(provider, args) {
  const errors = [];
  if (!CLOUD_PROVIDERS.has(provider)) errors.push(`unsupported cloud provider: ${provider}`);
  if (!Array.isArray(args) || args.length === 0) return [...errors, "cloud args must contain an action"];
  if (args.length > 64) errors.push("cloud args may contain at most 64 entries");
  for (const arg of args) {
    if (typeof arg !== "string" || arg.length === 0) errors.push("every cloud arg must be a non-empty string");
    else if (arg.length > 1000) errors.push("cloud args may not exceed 1000 characters");
    else if (/[\0\r\n]/.test(arg)) errors.push("cloud args may not contain NUL or newline characters");
    else if (CLOUD_CREDENTIAL_ARG_RE.test(arg) || CLOUD_SECRET_VALUE_RE.test(arg) || CLOUD_OPAQUE_VALUE_RE.test(arg))
      errors.push("cloud args may not contain credential flags or secret values");
  }
  if (Array.isArray(args) && CLOUD_FORBIDDEN_ACTION_RE.test(args.join(" ")))
    errors.push("authentication, secret retrieval, and privilege-management cloud actions are forbidden");
  return [...new Set(errors)];
}

export function redactCloudOutput(value) {
  return String(value ?? "")
    .replace(/-----BEGIN [^-\r\n]*PRIVATE KEY-----[\s\S]*?-----END [^-\r\n]*PRIVATE KEY-----/gi, "[REDACTED PRIVATE KEY]")
    .replace(/\bBearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/(["']?(?:token|password|passphrase|secret|api[-_ ]?key|client[-_ ]?secret|access[-_ ]?key|private[-_ ]?key)["']?\s*[:=]\s*)(["'])[^"']*\2/gi, "$1$2[REDACTED]$2")
    .replace(/(["']?(?:token|password|passphrase|secret|api[-_ ]?key|client[-_ ]?secret|access[-_ ]?key|private[-_ ]?key)["']?\s*[:=]\s*)[^\s,}]+/gi, "$1[REDACTED]")
    .replace(/\b(?:dop_v1_|sk-|ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_\-]+\b/g, "[REDACTED]")
    .replace(/[A-Za-z0-9+/_=-]{40,}/g, "[REDACTED OPAQUE VALUE]");
}

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

export function classifyReadRisk(path) {
  if (isForbiddenExternalReadPath(path)) return "critical";
  return isExternalReadPath(path) ? "medium" : "low";
}

export function requiredScopeRisk({ lane, reads = [], writes = [], writeTrees = [], deletes = [], commands = [] }) {
  const laneRisk = lane === "controlled" ? "high" : "low";
  return maxRisk(
    laneRisk,
    ...reads.map(classifyReadRisk),
    ...writes.map(classifyPathRisk),
    ...writeTrees.map((path) => maxRisk("medium", classifyPathRisk(path))),
    ...deletes.map((path) => maxRisk("medium", classifyPathRisk(path))),
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
  for (const field of ["writeTrees", "deletes"]) {
    if (scope[field] !== undefined && !Array.isArray(scope[field])) errors.push(`${field} must be a list when present`);
  }
  for (const path of Array.isArray(scope.reads) ? scope.reads : []) {
    const reason = validateReadPath(path);
    if (reason) errors.push(`invalid reads path '${String(path)}': ${reason}`);
    else if (isExternalReadPath(path) && isForbiddenExternalReadPath(path))
      errors.push(`forbidden external read path: ${path}`);
    else if (!isExternalReadPath(path) && isForbiddenRepoPath(path)) errors.push(`forbidden reads path: ${path}`);
  }
  for (const field of ["writes", "writeTrees", "deletes"]) {
    for (const path of Array.isArray(scope[field]) ? scope[field] : []) {
      const reason = validateRepoPath(path);
      if (reason) errors.push(`invalid ${field} path '${String(path)}': ${reason}`);
      else if (isForbiddenRepoPath(path)) errors.push(`forbidden ${field} path: ${path}`);
      else if (field === "writes" && path.endsWith("/")) errors.push(`write scope must name exact files, not a directory: ${path}`);
      else if (field === "writeTrees" && !path.endsWith("/")) errors.push(`writeTrees entries must be directory prefixes ending in '/': ${path}`);
    }
  }
  for (const commandClass of Array.isArray(scope.commands) ? scope.commands : []) {
    if (!COMMAND_CLASSES.has(commandClass)) errors.push(`unknown command class: ${commandClass}`);
  }
  const hasExternalReads = Array.isArray(scope.reads) && scope.reads.some(isExternalReadPath);
  const hasOperationalActivity = Array.isArray(scope.commands)
    && scope.commands.some((command) => ["cloud", "container", "container-runtime"].includes(command));
  if ((!Array.isArray(scope.writes) || scope.writes.length === 0)
    && (!Array.isArray(scope.writeTrees) || scope.writeTrees.length === 0)
    && !hasExternalReads && !hasOperationalActivity)
    errors.push("writes, writeTrees, an external read, or container/cloud activity must authorize the task");
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
  return entries.some((entry) => {
    const ignoreCase = process.platform === "win32" && isExternalReadPath(path) && isExternalReadPath(entry);
    const candidate = ignoreCase ? path.toLowerCase() : path;
    const scopeEntry = ignoreCase ? entry.toLowerCase() : entry;
    return scopeEntry.endsWith("/")
      ? candidate === scopeEntry.slice(0, -1) || candidate.startsWith(scopeEntry)
      : candidate === scopeEntry;
  });
}

export function classifyCommand(command) {
  const value = command.trim();
  if (/^(pwd|ls|find|rg|grep)(\s|$)/.test(value)) return "inspect";
  if (/^git\s+(status|diff|show|log)(\s|$)/.test(value)) return "inspect";
  if (/^git\s+branch(?:\s+(?:--show-current|--list)(?:\s.*)?)?$/.test(value)) return "inspect";
  if (/^git\s+(?:reset\s+--hard(?:\s|$)|clean\b.*\s-[a-z]*f[a-z]*(?:\s|$)|push\b.*\s(?:-f|--force(?:-with-lease)?|--delete|\+[^ ]+)(?:\s|$)|branch\s+-D(?:\s|$))/i.test(value)) return "destructive";
  if (/^git(?:\s+(?:-C|--git-dir|--work-tree)(?:\s|=)|\s+config\b.*\s--(?:global|system)(?:\s|$))/i.test(value)) return null;
  if (/^git\s+(clone|fetch|pull|push|ls-remote)(\s|$)/.test(value)) return "network";
  if (/^git(\s|$)/.test(value)) return "git";
  if (/^(npm|pnpm|yarn|bun)\s+(test|run\s+(test[^ ]*|lint|typecheck|check))(\s|$)/.test(value)) return "quality";
  if (/^node\s+(--test\b|scripts\/(task-check|dor-check|contract-guard|okf-conformance)\.mjs\b)/.test(value)) return "quality";
  if (/^(npm|pnpm|yarn|bun)\s+run\s+build(\s|$)/.test(value)) return "build";
  if (/^(doctl|zeabur|aws|az|gcloud|terraform|pulumi|flyctl|railway|vercel)(\s|$)/i.test(value)) return "cloud";
  if (/^docker(?:\s|$)|^docker-compose(?:\s|$)/i.test(value)) return classifyDockerCommand(value);
  if (/^(cp|mv|rsync|mkdir|copy|move|xcopy|robocopy)(\s|$)/i.test(value)) return "filesystem";
  if (/^(magick|convert|mogrify)(\s|$)/i.test(value)) return "image";
  if (/^(npm|pnpm|yarn|bun)\s+(install|add|remove|update)(\s|$)/.test(value)) return "dependency";
  if (/^(npm|pnpm|yarn|bun)\s+run\s+db:(generate|push|migrate)(\s|$)/.test(value)) return "database";
  if (/^(curl|wget|gh\s+api)(\s|$)/.test(value)) return "network";
  if (/\b(deploy|release|kubectl|terraform\s+apply)\b/.test(value)) return "release";
  if (/\b(rm|rmdir|del|drop|truncate|reset\s+--hard|force)\b/i.test(value)) return "destructive";
  return null;
}

function classifyDockerCommand(value) {
  const tokens = tokenizeCommand(value);
  if (tokens.length === 0) return null;
  let compose = false;
  let args;
  if (tokens[0].toLowerCase() === "docker-compose") {
    compose = true;
    args = tokens.slice(1);
  } else if (tokens[0].toLowerCase() === "docker" && tokens[1]?.toLowerCase() === "compose") {
    compose = true;
    args = tokens.slice(2);
  } else if (tokens[0].toLowerCase() === "docker") {
    args = tokens.slice(1);
  } else return null;

  if (compose) {
    const parsed = composeCommand(args);
    if (!parsed) return null;
    const { action, rest } = parsed;
    if (["ps", "ls", "images", "version", "port"].includes(action)) return "inspect";
    if (action === "top") return "container-runtime";
    if (["push", "publish"].includes(action)) return "release";
    if (action === "build") return dockerBuildClass(rest);
    if (["run", "exec"].includes(action)) return "container";
    if (action === "rm") return "destructive";
    if (action === "down")
      return hasAnyFlag(rest, ["-v", "--volumes", "--rmi"]) ? "destructive" : "container-runtime";
    if (action === "up") {
      if (hasAnyFlag(rest, ["-V", "--renew-anon-volumes"])) return "destructive";
      if (hasAnyFlag(rest, ["--build"])) return "container";
      return "container-runtime";
    }
    if ([
      "create", "start", "stop", "restart", "pause", "unpause", "kill", "logs",
      "pull", "wait", "events", "attach",
    ].includes(action)) return "container-runtime";
    return null;
  }

  const action = args[0]?.toLowerCase();
  const subaction = args[1]?.toLowerCase();
  if (!action) return null;
  if (["ps", "images", "version", "info"].includes(action)) return "inspect";
  if (["diff", "port"].includes(action)) return "inspect";
  if (action === "top") return "container-runtime";
  if (["start", "stop", "restart", "pause", "unpause", "kill", "logs", "pull", "wait", "stats", "update", "rename", "tag"].includes(action))
    return "container-runtime";
  if (["run", "exec", "create", "commit"].includes(action)) return "container";
  if (action === "build") return dockerBuildClass(args.slice(1));
  if (action === "push") return "release";
  if (["rm", "rmi", "prune"].includes(action)) return "destructive";

  if (action === "buildx") {
    if (subaction === "build") return dockerBuildClass(args.slice(2));
    if (subaction === "prune") return "destructive";
    return null;
  }
  if (action === "builder") return subaction === "prune" ? "destructive" : null;
  if (["container", "image", "network", "volume", "system"].includes(action)) {
    if (subaction === "ls" || (action === "system" && subaction === "df")) return "inspect";
    if (["rm", "prune"].includes(subaction)) return "destructive";
    if (action === "image" && subaction === "build") return dockerBuildClass(args.slice(2));
    if (action === "image" && subaction === "push") return "release";
    if (action === "image" && ["pull", "tag"].includes(subaction)) return "container-runtime";
    if (action === "container" && ["run", "exec", "create", "commit"].includes(subaction)) return "container";
    if (action === "container" && ["start", "stop", "restart", "pause", "unpause", "kill", "logs", "wait", "top", "stats", "update", "rename"].includes(subaction))
      return "container-runtime";
    if (["network", "volume"].includes(action) && subaction === "create") return "container";
  }
  return null;
}

function composeCommand(args) {
  const valueFlags = new Set(["-f", "--file", "--profile", "-p", "--project-name", "--project-directory", "--env-file", "--parallel", "--progress", "--ansi"]);
  const standaloneFlags = new Set(["--all-resources", "--compatibility", "--dry-run"]);
  let index = 0;
  while (index < args.length && args[index].startsWith("-")) {
    const flag = args[index];
    if (flag.includes("=") || standaloneFlags.has(flag)) index += 1;
    else if (valueFlags.has(flag) && args[index + 1] !== undefined) index += 2;
    else return null;
  }
  if (index >= args.length) return null;
  return { action: args[index].toLowerCase(), rest: args.slice(index + 1) };
}

function dockerBuildClass(args) {
  const value = args.join(" ");
  if (hasAnyFlag(args, ["--push", "--push=true"])
    || /(?:^|\s)(?:--output|-o|--cache-to)(?:=|\s+)[^\s]*(?:type=registry|push=true)(?:,|\s|$)/i.test(value))
    return "release";
  return "container";
}

function hasAnyFlag(args, flags) {
  return args.some((arg) => flags.includes(arg) || flags.some((flag) => flag.startsWith("--") && arg.startsWith(`${flag}=`)));
}

function tokenizeCommand(value) {
  return (value.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((token) => {
    const quoted = (token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"));
    return quoted ? token.slice(1, -1) : token;
  });
}
