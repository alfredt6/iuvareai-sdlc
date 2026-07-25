// scripts/lib-frontmatter.mjs
// Minimal, dependency-free YAML-frontmatter parser for the Iuvare shard schema.
// Handles: `key: value` scalars, inline lists `[a, b]`, block lists (`  - item`),
// and `#` comments. Sufficient for DoR / contract-guard checks; not a full YAML parser.
import { readFileSync } from "node:fs";

export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? parseYamlLite(m[1]) : null;
}

export function parseFrontmatterFile(file) {
  return parseFrontmatter(readFileSync(file, "utf8"));
}

function parseScalar(source) {
  const s = source.trim();
  const quoted = (s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"));
  if (quoted) return s.slice(1, -1);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  return s;
}

function stripInlineComment(source) {
  let quote = null;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if ((ch === '"' || ch === "'") && source[i - 1] !== "\\")
      quote = quote === ch ? null : quote ?? ch;
    if (ch === "#" && quote === null && (i === 0 || /\s/.test(source[i - 1])))
      return source.slice(0, i);
  }
  return source;
}

export function parseYamlLite(src) {
  const obj = {};
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) { i++; continue; }
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) { i++; continue; }
    const key = kv[1];
    const rest = stripInlineComment(kv[2]).trim();
    if (rest === "") {
      // block list?
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(parseScalar(stripInlineComment(lines[j].replace(/^\s+-\s+/, ""))));
        j++;
      }
      if (items.length) { obj[key] = items; i = j; }
      else { obj[key] = null; i++; }
      continue;
    }
    if (rest.startsWith("[") && rest.endsWith("]")) {
      obj[key] = rest.slice(1, -1).split(",").map(parseScalar).filter((v) => v !== "");
    } else {
      obj[key] = parseScalar(rest);
    }
    i++;
  }
  return obj;
}
