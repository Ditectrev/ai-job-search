import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { resolveCoreRoot } from "../src/index.js";

describe("core root resolution", { concurrency: 1 }, () => {
test("the default core root is the parent of adapter and of app", () => {
  const previous = process.env.CORE_ROOT;
  delete process.env.CORE_ROOT;
  try {
    const root = resolveCoreRoot();
    assert.equal(fs.existsSync(path.join(root, ".claude", "skills", "job-scraper", "SKILL.md")), true);
    assert.equal(fs.existsSync(path.join(root, "adapter", "package.json")), true);
    assert.equal(path.resolve(root, "adapter", ".."), root);
    assert.equal(path.resolve(root, "app", ".."), root);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "adapter", "package.json"), "utf8")) as {
      name: string;
    };
    assert.equal(pkg.name, "@ai-job-search/adapter");
  } finally {
    if (previous === undefined) delete process.env.CORE_ROOT;
    else process.env.CORE_ROOT = previous;
  }
});

test("CORE_ROOT and an explicit argument win over the default", () => {
  const previous = process.env.CORE_ROOT;
  process.env.CORE_ROOT = "/tmp/from-env";
  try {
    assert.equal(resolveCoreRoot(), path.resolve("/tmp/from-env"));
    assert.equal(resolveCoreRoot("/tmp/explicit"), path.resolve("/tmp/explicit"));
  } finally {
    if (previous === undefined) delete process.env.CORE_ROOT;
    else process.env.CORE_ROOT = previous;
  }
});
});
