// scripts/okf-conformance.mjs
// Validates the .iuvareai/ knowledge bundle against OKF v0.1 conformance:
//   1. Every non-reserved .md has a parseable YAML frontmatter block.
//   2. Every frontmatter block has a non-empty `type` field.
// Reserved filenames (index.md, log.md) are skipped — they carry no `type`.
// The data layer (sessions/*.jsonl, metrics/*.jsonl) contains no .md, so it is
// naturally excluded. No dependencies; stdlib only.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const ROOT = ".iuvareai";
const RESERVED = new Set(["index.md", "log.md"]);
let failures = 0;
let checked = 0;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (extname(p) === ".md") out.push(p);
  }
  return out;
}

function fail(file, reason) {
  console.error(`✗ ${file}: ${reason}`);
  failures++;
}

function check(file) {
  if (RESERVED.has(basename(file))) return; // reserved: no `type` required
  checked++;
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return fail(file, "no YAML frontmatter block");
  if (!/^type:\s*\S/m.test(m[1])) return fail(file, "missing required `type` field");
}

for (const f of walk(ROOT)) check(f);

console.log(`Checked ${checked} OKF concept(s) under ${ROOT}/.`);
if (failures) {
  console.error(`✗ ${failures} conformance failure(s).`);
  process.exit(1);
}
console.log("✓ OKF v0.1 conformance passed.");
