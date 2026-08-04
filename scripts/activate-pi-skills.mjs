// Generate optional Pi expertise skills and install the v4 task-capability gate.
import { copyFileSync, readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SRC = ".iuvareai/agents";
const OUT = ".pi/skills";
const EXTENSION_SRC = "integrations/pi/iuvareai-sandbox.ts";
const EXTENSION_OUT = ".pi/extensions/iuvareai-sandbox.ts";
if (!existsSync(SRC)) fail(`no persona source at ${SRC}`);
if (!existsSync(EXTENSION_SRC)) fail(`missing Pi integration at ${EXTENSION_SRC}`);
mkdirSync(OUT, { recursive: true });

const entries = [];
for (const file of readdirSync(SRC)) {
  if (!file.endsWith(".md") || file === "index.md") continue;
  const text = readFileSync(join(SRC, file), "utf8");
  const slug = text.match(/^persona:\s*(\S+)/m)?.[1] ?? file.replace(/\.md$/, "");
  const output = /^name:/m.test(text) ? text : text.replace(/^---\r?\n/, `---\nname: ${slug}\n`);
  entries.push({ slug, output });
}
for (const name of [...entries.map((entry) => entry.slug), "iuvareai-sdlc", "iuvare-sdlc"]) {
  rmSync(join(OUT, `${name}.md`), { force: true });
  rmSync(join(OUT, name), { recursive: true, force: true });
}
for (const entry of entries) writeFileSync(join(OUT, `${entry.slug}.md`), entry.output);

writeFileSync(join(OUT, "iuvareai-sdlc.md"), `---
name: iuvareai-sdlc
description: "Iuvare v4 Lean orientation: task-scoped authorization, three delivery lanes, and optional expertise lenses."
---
# Iuvare v4 Lean

Read .iuvareai/IUVARE_AI_SDLC_v4.md for normative rules.

- Direct: bounded low-risk work; session task grant only.
- Standard: normal features/fixes; compact WorkItem + CI + independent review.
- Controlled: high-impact work; explicit approval and evidence.

Do not ask the operator to select a persona. Before mutation or an external
read, call \`iuvare_request_scope\` alone with exact writes, minimal reads, command
classes, and verification. Low-risk work auto-authorizes; sensitive scope asks
once. Personas are optional expertise lenses and never grant permissions.
External source files or trailing-\`/\` directory prefixes may use absolute paths
in \`reads\`; they are always human-previewed and read-only. Outputs and moves
remain repository-relative, and secret-like files/VCS metadata remain blocked.
For visual work, include design image files/directories in task reads, run
\`/iuvare-vision\`, and inspect supported images with \`read\` before coding.
For crop/resize/rotate/convert/adjust operations, request the image class and use
\`iuvare_image_operation\`, then inspect the output with \`read\`.
For copy/move/mkdir, request the filesystem class with scoped destinations and
use \`iuvare_file_operation\`, never raw shell transfer commands. Cloud server
setup uses \`iuvare_cloud_operation\` with Controlled/critical \`cloud\` scope and
exact-action confirmation. Credentials must be injected outside agent context;
never request or pass API keys, passwords, tokens, private keys, login commands,
or secret-retrieval arguments. Every expertise lens may execute repository-local
Git commands: read-only operations are
inspection; request \`git\` for local mutations, \`network\` for remote operations,
or \`destructive\` for destructive operations.
`);
mkdirSync(join(".pi", "extensions"), { recursive: true });
copyFileSync(EXTENSION_SRC, EXTENSION_OUT);
console.log(`Activated ${entries.length + 1} optional skill(s) into ${OUT}/.`);
console.log(`✓ installed ${EXTENSION_OUT} (task-scoped, risk-based permission gate)`);
if (!hasPillow()) console.warn("! image editing requires Python 3 + Pillow: python -m pip install Pillow");
console.log("Cloud operations require a preinstalled allowlisted CLI and credentials configured outside Pi.");
console.log("Ask for work normally; the agent requests scope automatically. No persona/story command is required.");

function hasPillow() {
  const candidates = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  return candidates.some(([command, args]) => spawnSync(command, [...args, "-c", "import PIL"], { stdio: "ignore" }).status === 0);
}

function fail(message) { console.error(`✗ ${message}`); process.exit(1); }
