import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { StringEnum } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { canonicalRepoPath, isSensitivePath } from "../../scripts/lib-permissions.mjs";
import {
  classifyCommand, isPathInScope, maxRisk, requiredScopeRisk, scopeNeedsApproval, validateTaskScope,
} from "../../scripts/lib-task-scope.mjs";

type Lane = "direct" | "standard" | "controlled";
type Risk = "low" | "medium" | "high" | "critical";
type Grant = {
  goal: string; lane: Lane; risk: Risk; reads: string[]; writes: string[]; commands: string[];
  verification: string[]; approvedAt: number; expiresAt: number; approval: "automatic" | "human";
};

const TTL_MS = 60 * 60 * 1000;

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

  pi.on("before_agent_start", (event) => ({
    systemPrompt: event.systemPrompt + `\n\nIuvare task authorization:\n- Personas are optional expertise lenses, not permissions.\n- Before the first write/edit or non-inspection command, call iuvare_request_scope in a separate tool turn.\n- Request exact output files and the smallest read/command scope. Low-risk work is authorized automatically; sensitive work asks the human once.\n- If the task grows, request a replacement scope instead of writing outside it.`,
  }));

  pi.registerTool({
    name: "iuvare_request_scope",
    label: "Iuvare Task Scope",
    description: "Request a short-lived, task-scoped capability before mutating files. Call this alone before write/edit/bash mutations. Personas do not grant file access.",
    promptSnippet: "Request exact task-scoped read/write/command authorization before repository mutations",
    promptGuidelines: ["Use iuvare_request_scope before the first repository mutation and whenever the required scope changes."],
    parameters: Type.Object({
      goal: Type.String({ description: "One-sentence outcome" }),
      lane: StringEnum(["direct", "standard", "controlled"] as const),
      risk: StringEnum(["low", "medium", "high", "critical"] as const),
      reads: Type.Array(Type.String(), { description: "Exact files or directory prefixes ending in /" }),
      writes: Type.Array(Type.String(), { description: "Exact output files; directory-wide writes are rejected" }),
      commands: Type.Array(StringEnum(["inspect", "quality", "build", "dependency", "database", "network", "release", "destructive"] as const)),
      verification: Type.Array(Type.String()),
    }),
    async execute(_id, params, _signal, _update, ctx) {
      const candidate = { ...params } as Omit<Grant, "approvedAt" | "expiresAt" | "approval">;
      const errors = validateTaskScope(candidate);
      if (errors.length) throw new Error(errors.join("; "));

      const requiredRisk = requiredScopeRisk(candidate);
      let approval: Grant["approval"] = "automatic";
      if (scopeNeedsApproval(candidate)) {
        if (!ctx.hasUI) throw new Error("medium/high/critical task scope requires interactive human approval");
        const preview = [
          `Goal: ${candidate.goal}`, `Lane: ${candidate.lane}`, `Risk: ${requiredRisk}`,
          `Writes:\n${candidate.writes.map((path) => `  - ${path}`).join("\n")}`,
          `Commands: ${candidate.commands.join(", ") || "none"}`, "Approve this exact scope for 60 minutes?",
        ].join("\n\n");
        if (!(await ctx.ui.confirm("Iuvare task authorization", preview))) throw new Error("task scope declined by human");
        approval = "human";
      }
      const now = Date.now();
      grant = { ...candidate, risk: maxRisk(candidate.risk, requiredRisk) as Risk, approvedAt: now, expiresAt: now + TTL_MS, approval };
      pi.appendEntry("iuvare-task-grant", grant);
      showStatus(ctx);
      return {
        content: [{ type: "text", text: `Authorized ${grant.lane}/${grant.risk} scope for ${grant.writes.length} exact output(s). Proceed within scope.` }],
        details: { grant },
      };
    },
  });

  pi.registerCommand("iuvare-status", {
    description: "Show the active task capability",
    handler: async (_args, ctx) => showStatus(ctx, true),
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
      try { path = canonicalRepoPath(ctx.cwd, event.input.path); }
      catch (error) { return block(String((error as Error).message ?? error)); }
      if (isSensitivePath(path)) return block(`sensitive path is excluded from context: ${path}`);
      if (grant && !isPathInScope(path, [...grant.reads, ...grant.writes]))
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
      const commandClass = classifyCommand(command);
      if (commandClass === "inspect") return;
      if (!grant) return block("no active task scope; call iuvare_request_scope first");
      if (!commandClass) return block("command is not classifiable by policy; use a supported command or update the policy");
      if (!grant.commands.includes(commandClass)) return block(`command class '${commandClass}' is outside the active task scope`);
      if (commandClass === "release" || commandClass === "destructive") {
        if (!ctx.hasUI || !(await ctx.ui.confirm("Critical action", `Execute this exact command?\n\n${command}`)))
          return block("critical command was not approved");
      }
    }
  });

  function showStatus(ctx: any, notify = false) {
    const label = grant
      ? `Iuvare: ${grant.lane}/${grant.risk} · ${grant.writes.length} output(s) · ${Math.max(0, Math.ceil((grant.expiresAt - Date.now()) / 60000))}m`
      : "Iuvare: discovery/read-only · request scope before mutation";
    ctx.ui.setStatus("iuvare-sandbox", label);
    if (notify) ctx.ui.notify(label, grant ? "info" : "warning");
  }
}

function block(reason: string) {
  return { block: true as const, reason: `Iuvare policy: ${reason}` };
}
