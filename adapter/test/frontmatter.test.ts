import assert from "node:assert/strict";
import test from "node:test";
import { parseFrontmatter, toolNames } from "../src/index.js";

test("parses folded descriptions, tool lists, and inline comments", () => {
  const parsed = parseFrontmatter(`---
name: scrape
description: >
  Finds roles
  across boards
enabled: false  # sit this one out
allowed-tools: Read, Bash(bun --version), WebFetch, WebSearch
---
# Body heading

Keep this.
`);
  assert.equal(parsed.data.name, "scrape");
  assert.equal(parsed.data.description, "Finds roles across boards");
  assert.equal(parsed.data.enabled, "false");
  assert.deepEqual(toolNames(parsed.data["allowed-tools"]), ["Read", "Bash", "WebFetch", "WebSearch"]);
  assert.match(parsed.body, /^# Body heading/);
});

test("returns the whole text when there is no frontmatter", () => {
  const text = "# /apply\n\nFollow the steps.\n";
  const parsed = parseFrontmatter(text);
  assert.deepEqual(parsed.data, {});
  assert.equal(parsed.body, text);
});
