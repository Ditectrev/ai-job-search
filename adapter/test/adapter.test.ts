import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { AdapterError, StubModel, createAdapter, type ModelClient, type ShellRunner } from "../src/index.js";
import { coreRoot, tempAdapter } from "./helpers.js";

test("enqueue records a queued run and does not call the model or the shell", async () => {
  const model: ModelClient & { calls: number } = {
    calls: 0,
    async complete(request) {
      this.calls += 1;
      return new StubModel().complete(request);
    },
  };
  const shell: ShellRunner & { calls: number } = {
    calls: 0,
    async run() {
      this.calls += 1;
      return { ok: true, executed: false, stubbed: true, output: "unused" };
    },
  };
  const wired = await tempAdapter();
  try {
    const watched = createAdapter({
      coreRoot,
      storePath: wired.storePath,
      model,
      shell,
    });
    const scrape = await watched.enqueueScrape({ focus: " data roles ", broad: true });
    assert.equal(scrape.status, "queued");
    assert.equal(scrape.execution, "not-started");
    assert.equal(scrape.toolTrace.length, 0);
    assert.equal(model.calls, 0);
    assert.equal(shell.calls, 0);
    assert.equal((scrape.request as { focus?: string }).focus, "data roles");
    assert.ok(scrape.skillPaths.includes(".claude/skills/job-scraper/SKILL.md"));
    assert.ok(scrape.skillPaths.some((skillPath) => skillPath.includes("linkedin-search")));

    const apply = await watched.enqueueApply({
      postingUrl: "https://example.com/jobs/1",
      postingText: "A role that needs care with numbers.",
    });
    assert.equal(apply.kind, "apply");
    assert.deepEqual(apply.skillPaths, [
      ".claude/commands/apply.md",
      ".claude/skills/job-application-assistant/SKILL.md",
    ]);
    assert.equal(model.calls, 0);
    const listed = await watched.listRuns();
    assert.deepEqual(
      listed.map((run) => run.id),
      [apply.id, scrape.id],
    );
  } finally {
    await wired.cleanup();
  }
});

test("runQueued reads skill files from disk and does not touch the core or the network", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("network was contacted");
  };
  const { adapter, cleanup } = await tempAdapter();
  const coreRoot = adapter.coreRoot;
  const claudePath = path.join(coreRoot, "CLAUDE.md");
  const before = fs.statSync(claudePath).mtimeMs;
  try {
    await adapter.saveProfile({ displayName: "   ", notes: "Keep this empty of invented facts." });
    const profile = await adapter.getProfile();
    assert.equal(profile.displayName, "");
    assert.equal(profile.notes, "Keep this empty of invented facts.");

    const queued = await adapter.enqueueApply({ postingText: "Pasted posting body." });
    const finished = await adapter.runQueued(queued.id);
    assert.equal(finished.status, "completed");
    assert.equal(finished.execution, "stub");
    assert.match(finished.modelNote ?? "", /no API was called/);
    const readApply = finished.toolTrace.find((entry) => entry.detail.includes(".claude/commands/apply.md"));
    assert.ok(readApply);
    assert.equal(readApply.executed, true);
    const onDisk = fs.readFileSync(path.join(coreRoot, ".claude/commands/apply.md"));
    assert.match(readApply.detail, new RegExp(`${onDisk.byteLength} bytes`));
    const scratch = finished.scratchFiles.find((file) => file.path === "scratch/posting.txt");
    assert.ok(scratch);
    assert.equal(scratch.bytes, Buffer.byteLength("Pasted posting body."));
    const fetched = finished.toolTrace.find((entry) => entry.tool === "web_fetch");
    assert.equal(fetched, undefined);
    const latex = finished.toolTrace.find((entry) => entry.tool === "compile_latex");
    assert.ok(latex);
    assert.equal(latex.executed, false);
    assert.equal(fs.statSync(claudePath).mtimeMs, before);

    const search = await adapter.enqueueScrape({ focus: "bridges" });
    const searched = await adapter.runQueued(search.id);
    const portals = await adapter.listPortals();
    for (const portal of portals) {
      const entry = searched.toolTrace.find(
        (item) => item.tool === "portal_cli" && item.detail.includes(portal.directoryName),
      );
      assert.ok(entry, portal.directoryName);
      assert.equal(entry.executed, false);
      if (portal.enabled) assert.match(entry.detail, /search --format json/);
      else assert.match(entry.detail, /turned off/);
    }
    await assert.rejects(() => adapter.runQueued(search.id), /already left the queue/);
  } finally {
    globalThis.fetch = previousFetch;
    await cleanup();
  }
});

test("rejects a bad link, an empty application, and reads outside the core", async () => {
  const { adapter, cleanup } = await tempAdapter();
  try {
    await assert.rejects(() => adapter.enqueueApply({}), /posting link/);
    await assert.rejects(() => adapter.enqueueApply({ postingUrl: "javascript:alert(1)" }), AdapterError);
    await assert.rejects(() => adapter.enqueueApply({ postingUrl: "not a url" }), AdapterError);
    await assert.rejects(() => adapter.enqueueScrape({ focus: "x".repeat(201) }), /Focus/);
    await assert.rejects(() => adapter.saveProfile({ displayName: 4 }), /displayName/);
    const { readCoreText } = await import("../src/index.js");
    await assert.rejects(() => readCoreText(adapter.coreRoot, "../CLAUDE.md"), /outside CORE_ROOT/);
    await assert.rejects(() => readCoreText(adapter.coreRoot, "/etc/passwd"), /outside CORE_ROOT/);
  } finally {
    await cleanup();
  }
});
