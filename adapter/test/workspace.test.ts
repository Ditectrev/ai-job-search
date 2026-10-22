import assert from "node:assert/strict";
import test from "node:test";
import { AdapterError, MemoryWorkspace, assertScratchPath } from "../src/index.js";

test("scratch paths stay inside scratch/", () => {
  assert.equal(assertScratchPath("scratch/posting.txt"), "scratch/posting.txt");
  assert.equal(assertScratchPath("scratch/nested/note.txt"), "scratch/nested/note.txt");
  for (const bad of ["../CLAUDE.md", "CLAUDE.md", "scratch/../../CLAUDE.md", "/etc/passwd", "scratch"]) {
    assert.throws(() => assertScratchPath(bad), AdapterError);
  }
});

test("the memory workspace does not retain an escaped path", () => {
  const workspace = new MemoryWorkspace();
  workspace.write("scratch/posting.txt", "hello");
  assert.equal(workspace.read("scratch/posting.txt"), "hello");
  assert.throws(() => workspace.write("cv/main_example.tex", "nope"), AdapterError);
  assert.deepEqual(workspace.entries(), [{ path: "scratch/posting.txt", bytes: 5 }]);
});
