import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType, truncateTail, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { access, cp, lstat, mkdir, readdir, realpath, rename, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { delimiter, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import {
  canonicalReadPath, canonicalRepoPath, canonicalScopeReadPath, isExternalReadPath,
  isForbiddenExternalReadPath, isSensitivePath,
} from "../../scripts/lib-permissions.mjs";
import {
  classifyCommand, isPathInScope, isSupportedImagePath, maxRisk, redactCloudOutput, requiredScopeRisk,
  scopeNeedsApproval, validateCloudOperation, validateTaskScope,
} from "../../scripts/lib-task-scope.mjs";

type Lane = "direct" | "standard" | "controlled";
type Risk = "low" | "medium" | "high" | "critical";
type Grant = {
  goal: string; lane: Lane; risk: Risk; reads: string[]; writes: string[]; writeTrees: string[];
  deletes: string[]; commands: string[]; verification: string[]; approvedAt: number;
  expiresAt: number; approval: "automatic" | "human";
};

const TTL_MS = 60 * 60 * 1000;
const CLOUD_EXECUTABLES = {
  digitalocean: "doctl", zeabur: "zeabur", aws: "aws", azure: "az", gcp: "gcloud",
  terraform: "terraform", pulumi: "pulumi", flyio: "flyctl", railway: "railway", vercel: "vercel",
} as const;

export default function (pi: ExtensionAPI) {
  let grant: Grant | undefined;

  pi.on("session_start", (_event, ctx) => {
    grant = undefined;
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === "iuvare-task-grant") grant = entry.data as Grant;
    }
    if (grant && grant.expiresAt <= Date.now()) grant = undefined;
    showStatus(ctx);
  });

  pi.on("before_agent_start", (event, ctx) => {
    const vision = ctx.model?.input.includes("image")
      ? "The current model supports image input."
      : "WARNING: the current model does not advertise image input; switch to a vision-capable model before implementing from visual references.";
    return {
      systemPrompt: event.systemPrompt + `\n\nIuvare task authorization:\n- Personas are optional expertise lenses, not permissions.\n- Before the first external read, write/edit, or non-inspection command, call iuvare_request_scope in a separate tool turn.\n- Request exact output files and the smallest read/command scope. Low-risk work is authorized automatically; sensitive work asks the human once.\n- Repository-local reads use relative paths. External source directories or repositories use explicit absolute paths in reads and always receive human preview; external access is read-only.\n- If the task grows, request a replacement scope instead of writing outside it.\n- Design images are valid task inputs. Include their exact files or containing directory in reads, then use the built-in read tool on jpg/jpeg/png/gif/webp/bmp files before UI implementation. Images are sent to the model as attachments.\n- To crop, resize, rotate, flip, convert, or adjust an image, request the image command class with the source in reads and exact target in writes, then use iuvare_image_operation and inspect the result with read.\n- For copy, move, or directory creation, request the filesystem command class plus exact writes or approved write_trees/deletes, then use iuvare_file_operation. Do not use raw cp/mv/rsync/mkdir.\n- Every expertise lens may run Git commands: read-only Git is inspection; request git for local mutations, network for remote operations, or destructive for destructive operations.\n- Common local Docker/Compose lifecycle and log commands use medium-risk container-runtime scope with one scope approval and no per-command confirmation. Status/list commands are inspection. Build, run, exec, and commit use Controlled/critical container scope with exact-command confirmation; push is release; rm/prune/volume deletion is destructive.\n- Cloud server operations use iuvare_cloud_operation with a Controlled/critical cloud capability and exact-action confirmation. Credentials are injected outside agent context; never request or pass API keys in chat, files, or tool arguments.\n- ${vision}`,
    };
  });

  pi.registerTool({
    name: "iuvare_request_scope",
    label: "Iuvare Task Scope",
    description: "Request a short-lived, task-scoped capability for external reads or repository mutations. Call this alone before the first external read or mutation. Personas do not grant file access.",
    promptSnippet: "Request exact task-scoped read/write/command authorization before repository mutations",
    promptGuidelines: ["Use iuvare_request_scope before the first external read or repository mutation and whenever the required scope changes."],
    parameters: Type.Object({
      goal: Type.String({ description: "One-sentence outcome" }),
      lane: StringEnum(["direct", "standard", "controlled"] as const),
      risk: StringEnum(["low", "medium", "high", "critical"] as const),
      reads: Type.Array(Type.String(), { description: "Exact repository-relative or external absolute files; directory prefixes end in /. External reads are read-only and human-previewed." }),
      writes: Type.Array(Type.String(), { description: "Exact output files for write/edit and file operations" }),
      write_trees: Type.Array(Type.String(), { description: "Directory prefixes ending in /, usable only by iuvare_file_operation; always human-previewed" }),
      deletes: Type.Array(Type.String(), { description: "Exact source files/directories authorized to be removed by a move" }),
      commands: Type.Array(StringEnum(["inspect", "quality", "build", "container", "container-runtime", "cloud", "git", "image", "filesystem", "dependency", "database", "network", "release", "destructive"] as const)),
      verification: Type.Array(Type.String()),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      const candidate = {
        ...params,
        reads: params.reads.map((path) => canonicalScopeReadPath(ctx.cwd, path)),
        writeTrees: params.write_trees,
      } as Omit<Grant, "approvedAt" | "expiresAt" | "approval">;
      const errors = validateTaskScope(candidate);
      if (errors.length) throw new Error(errors.join("; "));

      const requiredRisk = requiredScopeRisk(candidate);
      let approval: Grant["approval"] = "automatic";
      if (scopeNeedsApproval(candidate)) {
        if (!ctx.hasUI) throw new Error("medium/high/critical task scope requires interactive human approval");
        const preview = [
          `Goal: ${candidate.goal}`, `Lane: ${candidate.lane}`, `Risk: ${requiredRisk}`,
          `External reads (read-only):\n${candidate.reads.filter(isExternalReadPath).map((path) => `  - ${path}`).join("\n") || "  - none"}`,
          `Writes:\n${candidate.writes.map((path) => `  - ${path}`).join("\n") || "  - none"}`,
          `Write trees:\n${candidate.writeTrees.map((path) => `  - ${path}`).join("\n") || "  - none"}`,
          `Move deletions:\n${candidate.deletes.map((path) => `  - ${path}`).join("\n") || "  - none"}`,
          `Commands: ${candidate.commands.join(", ") || "none"}`, "Approve this exact scope for 60 minutes?",
        ].join("\n\n");
        if (!(await ctx.ui.confirm("Iuvare task authorization", preview))) throw new Error("task scope declined by human");
        approval = "human";
      }
      const now = Date.now();
      grant = { ...candidate, risk: maxRisk(candidate.risk, requiredRisk) as Risk, approvedAt: now, expiresAt: now + TTL_MS, approval };
      pi.appendEntry("iuvare-task-grant", grant);
      showStatus(ctx);
      const imageInputs = candidate.reads.filter(isSupportedImagePath);
      const visionWarning = imageInputs.length > 0 && !ctx.model?.input.includes("image")
        ? " WARNING: image inputs were authorized, but the current model is not vision-capable. Switch models before implementation."
        : "";
      if (visionWarning && ctx.hasUI) ctx.ui.notify(visionWarning.trim(), "warning");
      return {
        content: [{ type: "text", text: `Authorized ${grant.lane}/${grant.risk} scope for ${grant.reads.filter(isExternalReadPath).length} external read(s), ${grant.writes.length} exact output(s), and ${grant.writeTrees.length} write tree(s). Proceed within scope.${visionWarning}` }],
        details: { grant, imageInputs, visionCapable: ctx.model?.input.includes("image") ?? false },
      };
    },
  });

  pi.registerTool({
    name: "iuvare_cloud_operation",
    label: "Iuvare Cloud Operation",
    description: "Run one approved cloud-provider CLI action without a shell. Requires a Controlled/critical cloud grant and exact-action confirmation. Credentials must already exist in a protected profile, workload identity, secret manager, or inherited environment; never pass credentials as arguments. Output is redacted and limited to 20KB/500 lines.",
    promptSnippet: "Configure approved cloud infrastructure through a credential-safe, confirmation-gated provider CLI",
    promptGuidelines: [
      "Use iuvare_cloud_operation for DigitalOcean, Zeabur, AWS, Azure, GCP, Terraform, Pulumi, Fly.io, Railway, or Vercel operations instead of bash.",
      "Never ask for or place API keys, passwords, tokens, private keys, secret values, or credential flags in iuvare_cloud_operation arguments.",
    ],
    parameters: Type.Object({
      provider: StringEnum(["digitalocean", "zeabur", "aws", "azure", "gcp", "terraform", "pulumi", "flyio", "railway", "vercel"] as const),
      args: Type.Array(Type.String({ minLength: 1, maxLength: 1000 }), { minItems: 1, maxItems: 64, description: "CLI arguments only; credentials and authentication/secret-management actions are forbidden" }),
      timeout_seconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 1800, description: "Execution timeout; default 600 seconds" })),
    }),
    async execute(_id, params, signal, _update, ctx) {
      if (!grant || grant.expiresAt <= Date.now()) throw new Error("no active task scope; call iuvare_request_scope first");
      if (grant.lane !== "controlled" || grant.risk !== "critical" || !grant.commands.includes("cloud"))
        throw new Error("cloud operations require an active Controlled/critical scope with the cloud command class");
      const errors = validateCloudOperation(params.provider, params.args);
      if (errors.length) throw new Error(errors.join("; "));
      if (!ctx.hasUI) throw new Error("cloud operations require interactive exact-action approval");

      const executable = await resolveCloudExecutable(CLOUD_EXECUTABLES[params.provider], ctx.cwd);
      const display = [executable, ...params.args].map(formatCommandArgument).join(" ");
      const approved = await ctx.ui.confirm(
        "Critical cloud action",
        `Provider: ${params.provider}\n\nCommand (credentials injected externally):\n${display}\n\nExecute this exact cloud operation?`,
      );
      if (!approved) throw new Error("cloud operation was not approved");

      const result = await runCloudCli(
        executable, params.args, ctx.cwd, (params.timeout_seconds ?? 600) * 1000, signal,
      );
      const safeOutput = redactCloudOutput([result.stdout, result.stderr].filter(Boolean).join("\n"));
      const truncated = truncateTail(safeOutput || `(no provider output; exit ${result.code})`, {
        maxBytes: 20 * 1024,
        maxLines: 500,
      });
      const audit = {
        provider: params.provider, args: params.args, exitCode: result.code,
        killed: result.killed, outputTruncated: truncated.truncated, timestamp: Date.now(),
      };
      pi.appendEntry("iuvare-cloud-operation", audit);
      if (result.code !== 0)
        throw new Error(`${params.provider} cloud operation failed with exit ${result.code}. Redacted output:\n${truncated.content}`);
      return {
        content: [{ type: "text", text: `${params.provider} cloud operation completed. Redacted output:\n${truncated.content}` }],
        details: audit,
      };
    },
  });

  pi.registerTool({
    name: "iuvare_file_operation",
    label: "Iuvare File Operation",
    description: "Safely copy or move a file/directory, or create a directory, within the active task scope. Copies may use an authorized external read source; writes and moves remain repository-local.",
    promptSnippet: "Copy/move files and directories using task-scoped filesystem authorization",
    promptGuidelines: ["Use iuvare_file_operation—not bash cp/mv/rsync/mkdir—for repository file transfers and directory creation."],
    parameters: Type.Object({
      action: StringEnum(["copy", "move", "mkdir"] as const),
      source: Type.Optional(Type.String({ description: "Scoped source for copy/move; an external absolute source is allowed only for copy" })),
      target: Type.String({ description: "Repository-relative destination" }),
      overwrite: Type.Optional(Type.Boolean({ description: "Allow replacement/merge when target exists; default false" })),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      if (!grant || grant.expiresAt <= Date.now()) throw new Error("no active task scope; call iuvare_request_scope first");
      if (!grant.commands.includes("filesystem")) throw new Error("active task scope does not authorize the filesystem command class");

      const target = canonicalRepoPath(ctx.cwd, params.target);
      const writeTrees = grant.writeTrees ?? [];
      if (!grant.writes.includes(target) && !isPathInScope(target, writeTrees))
        throw new Error(`target '${target}' is not authorized by exact writes or write_trees`);
      const targetAbsolute = resolve(ctx.cwd, target);

      if (params.action === "mkdir") {
        await withFileMutationQueue(targetAbsolute, async () => mkdir(targetAbsolute, { recursive: true }));
        return { content: [{ type: "text", text: `Created directory: ${target}` }], details: { action: params.action, target } };
      }

      if (!params.source) throw new Error(`${params.action} requires source`);
      const source = params.action === "copy"
        ? canonicalReadPath(ctx.cwd, params.source)
        : canonicalRepoPath(ctx.cwd, params.source);
      if (isSensitivePath(source) || isForbiddenExternalReadPath(source))
        throw new Error(`source is excluded from task context: ${source}`);
      if (!isPathInScope(source, [...grant.reads, ...grant.writes, ...writeTrees]))
        throw new Error(`source '${source}' is outside the active task read scope`);
      if (params.action === "move" && !isPathInScope(source, grant.deletes ?? []))
        throw new Error(`move requires source '${source}' in the task deletes list`);
      if (source === target || target.startsWith(`${source}/`))
        throw new Error("source and target must be distinct; a directory cannot be transferred into itself");

      const sourceAbsolute = resolve(ctx.cwd, source);
      await assertSafeTransferSource(sourceAbsolute);
      const targetExists = await pathExists(targetAbsolute);
      if (targetExists && !params.overwrite) throw new Error(`target already exists: ${target}; set overwrite only when replacement was intended`);

      await withFileMutationQueue(targetAbsolute, async () => {
        await mkdir(dirname(targetAbsolute), { recursive: true });
        if (params.action === "copy") {
          await cp(sourceAbsolute, targetAbsolute, { recursive: true, force: Boolean(params.overwrite), errorOnExist: !params.overwrite });
          return;
        }
        if (targetExists && params.overwrite) await rm(targetAbsolute, { recursive: true, force: true });
        try {
          await rename(sourceAbsolute, targetAbsolute);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
          await cp(sourceAbsolute, targetAbsolute, { recursive: true, force: Boolean(params.overwrite), errorOnExist: !params.overwrite });
          await rm(sourceAbsolute, { recursive: true, force: true });
        }
      });
      return {
        content: [{ type: "text", text: `${params.action === "copy" ? "Copied" : "Moved"} ${source} → ${target}` }],
        details: { action: params.action, source, target, overwrite: Boolean(params.overwrite) },
      };
    },
  });

  pi.registerTool({
    name: "iuvare_image_operation",
    label: "Iuvare Image Operation",
    description: "Inspect image dimensions or safely crop, resize, rotate, flip, convert, and adjust a scoped image. Editing requires Pillow on the local Python runtime.",
    promptSnippet: "Inspect and edit repository images with exact source and output authorization",
    promptGuidelines: [
      "Use iuvare_image_operation for image metadata and edits; inspect the source and edited output with read when visual fidelity matters.",
      "Image transforms run in this order: crop, resize, rotate, flip, color/sharpness adjustments, blur, grayscale.",
    ],
    parameters: Type.Object({
      action: StringEnum(["inspect", "edit", "convert"] as const),
      source: Type.String({ description: "Scoped repository-relative or external absolute jpg/jpeg/png/gif/webp/bmp source" }),
      target: Type.Optional(Type.String({ description: "Exact repository-relative output path; required for edit or convert" })),
      overwrite: Type.Optional(Type.Boolean({ description: "Allow replacing an existing exact target; default false" })),
      crop: Type.Optional(Type.Object({
        x: Type.Integer({ minimum: 0 }), y: Type.Integer({ minimum: 0 }),
        width: Type.Integer({ minimum: 1 }), height: Type.Integer({ minimum: 1 }),
      })),
      resize: Type.Optional(Type.Object({
        width: Type.Optional(Type.Integer({ minimum: 1 })),
        height: Type.Optional(Type.Integer({ minimum: 1 })),
        fit: Type.Optional(StringEnum(["stretch", "contain", "cover"] as const)),
      })),
      rotate: Type.Optional(Type.Number({ description: "Clockwise degrees; canvas expands" })),
      flip: Type.Optional(StringEnum(["horizontal", "vertical", "both"] as const)),
      brightness: Type.Optional(Type.Number({ minimum: 0, description: "1 is unchanged" })),
      contrast: Type.Optional(Type.Number({ minimum: 0, description: "1 is unchanged" })),
      saturation: Type.Optional(Type.Number({ minimum: 0, description: "1 is unchanged" })),
      sharpness: Type.Optional(Type.Number({ minimum: 0, description: "1 is unchanged" })),
      blur: Type.Optional(Type.Number({ minimum: 0, description: "Gaussian blur radius" })),
      grayscale: Type.Optional(Type.Boolean()),
      quality: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
      background: Type.Optional(Type.String({ description: "Color used when flattening transparency to JPEG; default #ffffff" })),
    }),
    async execute(_id, params, signal, _update, ctx) {
      const source = canonicalReadPath(ctx.cwd, params.source);
      if (isSensitivePath(source) || isForbiddenExternalReadPath(source))
        throw new Error(`sensitive or repository-metadata path is excluded from context: ${source}`);
      if (!isSupportedImagePath(source)) throw new Error("source must be jpg, jpeg, png, gif, webp, or bmp");
      if (isExternalReadPath(source) && !grant)
        throw new Error("external image inspection requires an active task scope with the absolute source in reads");
      if (grant && !isPathInScope(source, [...grant.reads, ...grant.writes, ...(grant.writeTrees ?? [])]))
        throw new Error(`source '${source}' is outside the active task read scope`);
      const sourceAbsolute = resolve(ctx.cwd, source);

      if (params.action === "inspect") {
        const result = await runImageHelper(ctx.cwd, { action: "inspect", source: sourceAbsolute }, signal);
        return {
          content: [{ type: "text", text: `${source}: ${result.width}×${result.height} ${result.format} (${result.frames} frame(s), ${result.mode})` }],
          details: { ...result, source },
        };
      }

      if (!grant || grant.expiresAt <= Date.now()) throw new Error("no active task scope; call iuvare_request_scope first");
      if (!grant.commands.includes("image")) throw new Error("active task scope does not authorize the image command class");
      if (!params.target) throw new Error(`${params.action} requires target`);
      const target = canonicalRepoPath(ctx.cwd, params.target);
      if (!isSupportedImagePath(target)) throw new Error("target must be jpg, jpeg, png, gif, webp, or bmp");
      if (!grant.writes.includes(target)) throw new Error(`target '${target}' is not an exact output in the active task writes`);
      const targetAbsolute = resolve(ctx.cwd, target);
      if (await pathExists(targetAbsolute) && !params.overwrite)
        throw new Error(`target already exists: ${target}; set overwrite only when replacement was intended`);

      const request = { ...params, source: sourceAbsolute, target: targetAbsolute };
      const result = await withFileMutationQueue(targetAbsolute, async () => {
        await mkdir(dirname(targetAbsolute), { recursive: true });
        return runImageHelper(ctx.cwd, request, signal);
      });
      return {
        content: [{ type: "text", text: `${params.action === "convert" ? "Converted" : "Edited"} ${source} → ${target} (${result.width}×${result.height} ${result.format}). Inspect the output with read.` }],
        details: { ...result, source, target },
      };
    },
  });

  pi.registerCommand("iuvare-status", {
    description: "Show the active task capability",
    handler: async (_args, ctx) => showStatus(ctx, true),
  });
  pi.registerCommand("iuvare-vision", {
    description: "Report whether the current model can inspect design images",
    handler: async (_args, ctx) => {
      const supported = ctx.model?.input.includes("image") ?? false;
      ctx.ui.notify(
        supported
          ? `Vision ready: ${ctx.model?.provider}/${ctx.model?.id} can inspect jpg/jpeg/png/gif/webp/bmp files with read.`
          : `Vision unavailable: ${ctx.model?.provider}/${ctx.model?.id} does not advertise image input. Use /model to select a vision-capable model.`,
        supported ? "info" : "warning",
      );
    },
  });
  pi.registerCommand("iuvare-clear", {
    description: "Revoke the active task capability",
    handler: async (_args, ctx) => {
      grant = undefined;
      pi.appendEntry("iuvare-task-grant", null);
      showStatus(ctx, true);
    },
  });

  pi.on("tool_call", async (event, ctx) => {
    if (grant && grant.expiresAt <= Date.now()) grant = undefined;

    if (isToolCallEventType("read", event)) {
      let path: string;
      try { path = canonicalReadPath(ctx.cwd, event.input.path); }
      catch (error) { return block(String((error as Error).message ?? error)); }
      if (isSensitivePath(path) || isForbiddenExternalReadPath(path))
        return block(`sensitive or repository-metadata path is excluded from context: ${path}`);
      if (isExternalReadPath(path) && !grant)
        return block("external reads require an active task scope with the absolute input in reads");
      if (grant && !isPathInScope(path, [...grant.reads, ...grant.writes, ...(grant.writeTrees ?? [])]))
        return block(`${path} is outside the active task read scope; request a replacement scope`);
      return;
    }

    if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
      if (!grant) return block("no active task scope; call iuvare_request_scope first");
      let path: string;
      try { path = canonicalRepoPath(ctx.cwd, event.input.path); }
      catch (error) { return block(String((error as Error).message ?? error)); }
      if (isSensitivePath(path)) return block(`sensitive path may not be written: ${path}`);
      if (!grant.writes.includes(path)) return block(`${path} is not an exact output in the active task scope`);
      return;
    }

    if (isToolCallEventType("bash", event)) {
      const command = event.input.command.trim();
      if (/[\n;&|><`$(){}]/.test(command))
        return block("shell operators, redirection, and substitution are not allowed; use direct tools or one simple command");
      const commandClass = classifyCommand(command);
      if (commandClass === "inspect") return;
      if (commandClass === "filesystem")
        return block("raw cp/mv/rsync/mkdir is disabled; use iuvare_file_operation with task-scoped sources and targets");
      if (commandClass === "cloud")
        return block("raw cloud CLI commands are disabled; use iuvare_cloud_operation for shell-free exact-action approval");
      if (commandClass === "image")
        return block("raw image shell utilities are disabled; use iuvare_image_operation with an exact scoped output");
      if (!grant) return block("no active task scope; call iuvare_request_scope first");
      if (!commandClass) return block("command is not classifiable by policy; use a supported command or update the policy");
      if (!grant.commands.includes(commandClass)) return block(`command class '${commandClass}' is outside the active task scope`);
      if (commandClass === "container" || commandClass === "release" || commandClass === "destructive") {
        if (!ctx.hasUI || !(await ctx.ui.confirm("Critical action", `Execute this exact command?\n\n${command}`)))
          return block("critical command was not approved");
      }
    }
  });

  function showStatus(ctx: any, notify = false) {
    const label = grant
      ? `Iuvare: ${grant.lane}/${grant.risk} · ${grant.reads.filter(isExternalReadPath).length} external read(s) · ${grant.writes.length} file(s)/${grant.writeTrees?.length ?? 0} tree(s) · ${Math.max(0, Math.ceil((grant.expiresAt - Date.now()) / 60000))}m`
      : "Iuvare: local discovery · request scope before external reads or mutation";
    ctx.ui.setStatus("iuvare-sandbox", label);
    if (notify) ctx.ui.notify(label, grant ? "info" : "warning");
  }
}

async function resolveCloudExecutable(name: string, cwd: string) {
  const suffixes = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const directory of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    for (const suffix of suffixes) {
      const candidate = resolve(directory, `${name}${suffix}`);
      try { await access(candidate); }
      catch { continue; }
      const canonical = await realpath(candidate);
      const fromProject = relative(resolve(cwd), canonical);
      const insideProject = fromProject === ""
        || (fromProject !== ".." && !fromProject.startsWith(`..${sep}`) && !isAbsolute(fromProject));
      if (insideProject) continue;
      if (process.platform === "win32" && /\.(?:cmd|bat)$/i.test(canonical))
        throw new Error(`${name} resolves to a shell wrapper; install a native executable or run the cloud task in an isolated Linux environment`);
      return canonical;
    }
  }
  throw new Error(`approved cloud CLI '${name}' was not found outside the project on PATH`);
}

async function runCloudCli(
  executable: string, args: string[], cwd: string, timeoutMs: number, signal?: AbortSignal,
): Promise<{ stdout: string; stderr: string; code: number | null; killed: boolean }> {
  return new Promise((accept, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true, shell: false, signal });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const retainTail = (current: string, chunk: unknown) => `${current}${String(chunk)}`.slice(-256 * 1024);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout = retainTail(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = retainTail(stderr, chunk); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      accept({ stdout, stderr, code, killed: timedOut || child.killed });
    });
  });
}

async function runImageHelper(cwd: string, request: Record<string, unknown>, signal?: AbortSignal): Promise<any> {
  const helper = resolve(cwd, "scripts/image-operation.py");
  const candidates: Array<[string, string[]]> = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  let missing = 0;
  let pillowMissing = 0;
  for (const [executable, prefix] of candidates) {
    try {
      return await new Promise((accept, reject) => {
        const child = spawn(executable, [...prefix, helper], { cwd, windowsHide: true, signal });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => { stdout += chunk; });
        child.stderr.on("data", (chunk) => { stderr += chunk; });
        child.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0) {
            const failure = new Error(stderr.trim() || `image helper exited with code ${code}`) as NodeJS.ErrnoException;
            if (code === 3) failure.code = "IUVARE_PILLOW_MISSING";
            return reject(failure);
          }
          try { accept(JSON.parse(stdout)); }
          catch { reject(new Error(`image helper returned invalid output: ${stdout.slice(0, 500)}`)); }
        });
        child.stdin.end(JSON.stringify(request));
      });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ENOENT") { missing += 1; continue; }
      if (code === "IUVARE_PILLOW_MISSING") { pillowMissing += 1; continue; }
      throw error;
    }
  }
  if (missing + pillowMissing === candidates.length)
    throw new Error("Python 3 with Pillow is required for image editing; install it with `python -m pip install Pillow`");
  throw new Error("unable to start the image helper");
}

async function pathExists(path: string) {
  try { await lstat(path); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function assertSafeTransferSource(path: string): Promise<void> {
  const portable = path.replace(/\\/g, "/");
  if (isSensitivePath(portable) || isForbiddenExternalReadPath(portable))
    throw new Error(`transfer source contains a forbidden path: ${path}`);
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) throw new Error(`symbolic-link transfers are not allowed: ${path}`);
  if (!stat.isDirectory()) return;
  for (const entry of await readdir(path)) await assertSafeTransferSource(resolve(path, entry));
}

function formatCommandArgument(value: string) {
  return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : JSON.stringify(value);
}

function block(reason: string) {
  return { block: true as const, reason: `Iuvare policy: ${reason}` };
}
