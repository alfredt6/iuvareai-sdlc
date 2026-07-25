import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { parseFrontmatter } from "../../scripts/lib-frontmatter.mjs";
import { validateShard } from "../../scripts/lib-dor.mjs";
import {
  canonicalRepoPath,
  isSensitivePath,
  loadPersonaWriteSets,
  matchesWritePattern,
} from "../../scripts/lib-permissions.mjs";

type WorkState = { persona?: string; shard?: string; outputs: string[] };
const SHARD_BOUND_PERSONAS = new Set(["developer"]);
const READ_ONLY_COMMAND = /^(pwd|ls(?:\s+[-\w./]+)*|rg(?:\s+[-\w./:'"=]+)*|git\s+(status|diff|show|log)(?:\s+[-\w./:'"=]+)*)$/;
const DEV_COMMAND = /^(npm|pnpm|yarn|bun)\s+(test|run\s+(build|lint|typecheck|test(?::[\w-]+)?))(?:\s+[-\w./:'"=]+)*$/;
const TEST_COMMAND = /^(npm|pnpm|yarn|bun)\s+(test|run\s+test(?::[\w-]+)?)(?:\s+[-\w./:'"=]+)*$/;
const GOVERNANCE_COMMAND = /^node\s+scripts\/(dor-check|contract-guard|okf-conformance)\.mjs(?:\s+[-\w./]+)?$/;

export default function (pi: ExtensionAPI) {
  let state: WorkState = { outputs: [] };

  pi.on("session_start", (_event, ctx) => {
    state = { outputs: [] };
    for (const entry of ctx.sessionManager.getBranch()) {
      if (entry.type === "custom" && entry.customType === "iuvare-work-state")
        state = entry.data as WorkState;
    }
    showStatus(ctx);
  });

  pi.registerCommand("iuvare-persona", {
    description: "Select the active Iuvare persona (fail-closed write permissions)",
    handler: async (args, ctx) => {
      const persona = args.trim();
      const sets = loadPersonaWriteSets(resolve(ctx.cwd, ".iuvareai/agents"));
      if (!sets.has(persona)) {
        ctx.ui.notify(`Unknown Iuvare persona: ${persona || "(empty)"}`, "error");
        return;
      }
      state = { persona, outputs: [] };
      pi.appendEntry("iuvare-work-state", state);
      showStatus(ctx);
    },
  });

  pi.registerCommand("iuvare-story", {
    description: "Bind the active persona to a DoR-checked shard's declared outputs",
    handler: async (args, ctx) => {
      if (!state.persona) {
        ctx.ui.notify("Select /iuvare-persona first", "error");
        return;
      }
      let shard: string;
      try { shard = canonicalRepoPath(ctx.cwd, args.trim()); }
      catch (error) {
        ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
        return;
      }
      const absolute = resolve(ctx.cwd, shard);
      if (!existsSync(absolute)) {
        ctx.ui.notify(`Shard not found: ${shard}`, "error");
        return;
      }
      const result = validateShard(shard, { root: ctx.cwd });
      if (result.errors.length) {
        ctx.ui.notify(`Shard failed DoR: ${result.errors.join("; ")}`, "error");
        return;
      }
      const fm = parseFrontmatter(readFileSync(absolute, "utf8"));
      if (!fm || fm.implementer !== state.persona || !Array.isArray(fm.expected_outputs)) {
        ctx.ui.notify(`Shard implementer/outputs do not authorize persona '${state.persona}'`, "error");
        return;
      }
      state = { persona: state.persona, shard, outputs: fm.expected_outputs };
      pi.appendEntry("iuvare-work-state", state);
      showStatus(ctx);
    },
  });

  pi.registerCommand("iuvare-status", {
    description: "Show the active Iuvare permission context",
    handler: async (_args, ctx) => showStatus(ctx, true),
  });

  pi.on("tool_call", async (event, ctx) => {
    if (isToolCallEventType("read", event)) {
      try {
        const path = canonicalRepoPath(ctx.cwd, event.input.path);
        if (isSensitivePath(path)) return block(`sensitive path is excluded from context: ${path}`);
      } catch (error) { return block(error instanceof Error ? error.message : String(error)); }
      return;
    }

    if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
      if (!state.persona) return block("no active persona; run /iuvare-persona <name>");
      let path: string;
      try { path = canonicalRepoPath(ctx.cwd, event.input.path); }
      catch (error) { return block(error instanceof Error ? error.message : String(error)); }
      if (isSensitivePath(path)) return block(`sensitive path may not be written: ${path}`);

      const allowed = loadPersonaWriteSets(resolve(ctx.cwd, ".iuvareai/agents")).get(state.persona) ?? [];
      if (!allowed.some((pattern) => matchesWritePattern(path, pattern)))
        return block(`${state.persona} may not write ${path}`);
      if (state.persona === "orchestrator" && /\/[0-9].*\.md$/.test(path)) {
        if (isToolCallEventType("write", event))
          return block("Orchestrator may edit shard state fields, not rewrite shard files");
        const edits = event.input.edits ?? [];
        if (!edits.length || !edits.every((edit) => isStateField(edit.oldText) && isStateField(edit.newText)))
          return block("Orchestrator shard edits are limited to status, owner, and dor_checked_at lines");
      }
      if (SHARD_BOUND_PERSONAS.has(state.persona) && !state.outputs.includes(path))
        return block(`${path} is not declared in the active shard's expected_outputs`);
      return;
    }

    if (isToolCallEventType("bash", event)) {
      if (!state.persona) return block("no active persona; run /iuvare-persona <name>");
      const command = event.input.command.trim();
      if (/[\n;&|><`$(){}]/.test(command)) return block("shell operators/substitution are not allow-listed");
      const allowed = READ_ONLY_COMMAND.test(command)
        || (state.persona === "developer" && DEV_COMMAND.test(command))
        || (state.persona === "qa" && TEST_COMMAND.test(command))
        || (state.persona === "orchestrator" && GOVERNANCE_COMMAND.test(command));
      if (!allowed) return block(`bash command is not allow-listed for ${state.persona}`);
    }
  });

  function showStatus(ctx: any, notify = false) {
    const label = state.persona
      ? `Iuvare: ${state.persona}${state.shard ? ` · ${state.shard}` : ""}`
      : "Iuvare: LOCKED (select persona)";
    ctx.ui.setStatus("iuvare-sandbox", label);
    if (notify) ctx.ui.notify(label, state.persona ? "info" : "warning");
  }
}

function isStateField(text: string) {
  return /^(status|owner|dor_checked_at):[^\r\n]*$/.test(text);
}

function block(reason: string) {
  return { block: true as const, reason: `Iuvare sandbox: ${reason}` };
}
