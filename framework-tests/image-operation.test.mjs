import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const helper = resolve("scripts/image-operation.py");

function pythonWithPillow() {
  const candidates = process.platform === "win32"
    ? [["py", ["-3"]], ["python", []], ["python3", []]]
    : [["python3", []], ["python", []]];
  return candidates.find(([command, args]) =>
    spawnSync(command, [...args, "-c", "import PIL"], { stdio: "ignore" }).status === 0);
}

function runPython(runtime, args, options = {}) {
  const [command, prefix] = runtime;
  return spawnSync(command, [...prefix, ...args], { encoding: "utf8", ...options });
}

test("image helper crops, resizes, adjusts, and converts an image", (t) => {
  const runtime = pythonWithPillow();
  if (!runtime) return t.skip("Python Pillow is unavailable");
  const directory = mkdtempSync(join(tmpdir(), "iuvare-image-"));
  const source = join(directory, "source.png");
  const target = join(directory, "target.webp");
  const create = runPython(runtime, ["-c", `from PIL import Image; Image.new('RGB',(100,80),'red').save(r'''${source}''')`]);
  assert.equal(create.status, 0, create.stderr);

  const request = {
    action: "convert", source, target,
    crop: { x: 10, y: 5, width: 40, height: 30 },
    resize: { width: 80, height: 60, fit: "cover" },
    brightness: 1.1,
  };
  const edit = runPython(runtime, [helper], { input: JSON.stringify(request) });
  assert.equal(edit.status, 0, edit.stderr);
  assert.deepEqual(JSON.parse(edit.stdout), {
    source, target, format: "WEBP", width: 80, height: 60, frames: 1,
  });

  const inspect = runPython(runtime, [helper], {
    input: JSON.stringify({ action: "inspect", source: target }),
  });
  assert.equal(inspect.status, 0, inspect.stderr);
  const metadata = JSON.parse(inspect.stdout);
  assert.equal(metadata.format, "WEBP");
  assert.equal(metadata.width, 80);
  assert.equal(metadata.height, 60);
  assert.ok(readFileSync(target).length > 0);
});

test("image helper rejects crop rectangles outside image bounds", (t) => {
  const runtime = pythonWithPillow();
  if (!runtime) return t.skip("Python Pillow is unavailable");
  const directory = mkdtempSync(join(tmpdir(), "iuvare-image-bounds-"));
  const source = join(directory, "source.png");
  const target = join(directory, "target.png");
  runPython(runtime, ["-c", `from PIL import Image; Image.new('RGB',(10,10),'red').save(r'''${source}''')`]);
  const result = runPython(runtime, [helper], {
    input: JSON.stringify({ action: "edit", source, target, crop: { x: 8, y: 8, width: 5, height: 5 } }),
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exceeds 10x10 image bounds/);
});
