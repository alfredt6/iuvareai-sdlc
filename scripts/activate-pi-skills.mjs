// Generate optional Pi expertise skills and install the v4 task-capability gate.
import { copyFileSync, readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

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

Do not ask the operator to select a persona. Before mutation, call
\`iuvare_request_scope\` alone with exact writes, minimal reads, command classes,
and verification. Low-risk work auto-authorizes; sensitive scope asks once.
Personas are optional expertise lenses and never grant permissions.
For visual work, include design image files/directories in task reads, run
\`/iuvare-vision\`, and inspect supported images with \`read\` before coding.
`);
mkdirSync(join(".pi", "extensions"), { recursive: true });
copyFileSync(EXTENSION_SRC, EXTENSION_OUT);
console.log(`Activated ${entries.length + 1} optional skill(s) into ${OUT}/.`);
console.log(`✓ installed ${EXTENSION_OUT} (task-scoped, risk-based permission gate)`);
console.log("Ask for work normally; the agent requests scope automatically. No persona/story command is required.");

function fail(message) { console.error(`✗ ${message}`); process.exit(1); }
