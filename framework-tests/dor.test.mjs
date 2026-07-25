import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { validateShard } from "../scripts/lib-dor.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "iuvare-dor-"));
  for (const dir of [".iuvareai/agents", ".iuvareai/specs", ".iuvareai/stories", ".iuvareai/deltas", "src", "tests"])
    mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, ".iuvareai/agents/developer.md"), `---\ntype: Persona\npersona: developer\nwrites_to:\n  - "src/"\n  - "tests/"\n---\n`);
  writeFileSync(join(root, ".iuvareai/specs/DATAMODEL_CONTRACT.md"), "# version: 1.2.0\n");
  writeFileSync(join(root, ".iuvareai/specs/PRD.md"), "PRD\n");
  return root;
}

function writeShard(root, name, frontmatter) {
  const path = `.iuvareai/stories/${name}.md`;
  writeFileSync(join(root, path), `---\n${frontmatter}\n---\n\n# Story\n`);
  return path;
}

const base = `type: Story
title: valid-story
description: Valid fixture.
resource: src/feature.ts
tags: [test]
timestamp: 2026-07-25
epic_id: 001
story_id: 001
track: genesis
contract_version: "1.2.0"
status: draft
owner: product-owner
implementer: developer
depends_on: []
inputs:
  - ".iuvareai/specs/PRD.md"
expected_outputs:
  - "src/feature.ts"
  - "tests/feature.test.ts"
test_criteria:
  - "returns 200 for a valid request"
max_self_heal_attempts: 3`;

test("valid Developer story passes all structural DoR rules", () => {
  const root = fixture();
  const path = writeShard(root, "001.001.valid", base);
  assert.deepEqual(validateShard(path, { root }).errors, []);
});

test("DoR catches the greenfield root-config permission gap", () => {
  const root = fixture();
  const path = writeShard(root, "001.001.root", base.replace('  - "src/feature.ts"\n  - "tests/feature.test.ts"', '  - "package.json"'));
  assert.match(validateShard(path, { root }).errors.join("\n"), /repository-root outputs require `implementer: conductor`/);
});

test("sanctioned Conductor bootstrap passes with explicit intent", () => {
  const root = fixture();
  const conductor = base
    .replace("implementer: developer", "implementer: conductor\nbootstrap: true\nconductor_reason: One-time package and compiler bootstrap")
    .replace('  - "src/feature.ts"\n  - "tests/feature.test.ts"', '  - "package.json"\n  - "tsconfig.json"');
  const path = writeShard(root, "001.001.bootstrap", conductor);
  assert.deepEqual(validateShard(path, { root }).errors, []);
});

test("DoR validates enums, booleans, semver, and list shapes", () => {
  const root = fixture();
  const broken = base
    .replace("track: genesis", "track: risky")
    .replace('contract_version: "1.2.0"', "contract_version: 1")
    .replace("status: draft", "status: invented")
    .replace("depends_on: []", "depends_on: none");
  const path = writeShard(root, "001.001.shape", broken);
  const errors = validateShard(path, { root }).errors.join("\n");
  assert.match(errors, /invalid status/);
  assert.match(errors, /MAJOR.MINOR.PATCH/);
  assert.match(errors, /depends_on.*list/);
  assert.match(errors, /invalid track/);
});

test("Delta stories list every modified existing source file as an input", () => {
  const root = fixture();
  writeFileSync(join(root, "src/existing.ts"), "export {};\n");
  const delta = base
    .replace("type: Story", "type: Delta")
    .replace("track: genesis", "track: delta\ndelta_type: fix\ncontract_touched: false")
    .replace('  - "src/feature.ts"\n  - "tests/feature.test.ts"', '  - "src/existing.ts"')
    .replace("story_id: 001", "story_id: 002");
  const path = writeShard(root, "001.002.delta", delta);
  assert.match(validateShard(path, { root }).errors.join("\n"), /modified file must also appear in inputs/);
});

test("DoR rejects secret context paths even when the file exists", () => {
  const root = fixture();
  writeFileSync(join(root, ".env"), "TOKEN=do-not-read\n");
  const path = writeShard(root, "001.001.secret", base.replace('  - ".iuvareai/specs/PRD.md"', '  - ".env"'));
  assert.match(validateShard(path, { root }).errors.join("\n"), /sensitive input/);
});

test("DoR aggregates independent failures", () => {
  const root = fixture();
  const path = writeShard(root, "001.001.aggregate", base.replace("implementer: developer", "").replace("test_criteria:\n  - \"returns 200 for a valid request\"", "test_criteria: []"));
  const { errors } = validateShard(path, { root });
  assert.ok(errors.some((error) => error.includes("implementer")));
  assert.ok(errors.some((error) => error.includes("test_criteria")));
  assert.ok(errors.length >= 2);
});
