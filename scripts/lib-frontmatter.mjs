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

function unquote(s) {
  return s.replace(/^["']|["']$/g, "").trim();
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
    const rest = kv[2].replace(/\s+#.*$/, "").trim(); // strip trailing inline comment
    if (rest === "") {
      // block list?
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s+/.test(lines[j])) {
        items.push(unquote(lines[j].replace(/^\s+-\s+/, "")));
        j++;
      }
      if (items.length) { obj[key] = items; i = j; }
      else { obj[key] = null; i++; }
      continue;
    }
    if (rest.startsWith("[") && rest.endsWith("]")) {
      obj[key] = rest.slice(1, -1).split(",").map(unquote).filter(Boolean);
    } else {
      obj[key] = unquote(rest);
    }
    i++;
  }
  return obj;
}
