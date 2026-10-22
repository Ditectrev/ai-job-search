import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  APPLY_COMMAND_PATH,
  ASSISTANT_SKILL_PATH,
  SCRAPE_SKILL_PATH,
  listPortalSkills,
  readPortalCliContracts,
  readSkillFile,
} from "../src/index.js";
import { coreRoot } from "./helpers.js";

test("scrape and application skills name the tools the loop has to recognize", async () => {
  const scrape = await readSkillFile(coreRoot, SCRAPE_SKILL_PATH);
  for (const tool of ["Read", "Write", "Edit", "Glob", "Grep", "Bash", "WebFetch", "WebSearch", "Agent", "AskUserQuestion"]) {
    assert.ok(scrape.allowedTools.includes(tool), `scrape skill missing ${tool}`);
  }
  assert.equal(scrape.name, "scrape");

  const assistant = await readSkillFile(coreRoot, ASSISTANT_SKILL_PATH);
  for (const tool of ["Read", "Write", "Edit", "Glob", "Grep", "WebFetch", "WebSearch", "AskUserQuestion"]) {
    assert.ok(assistant.allowedTools.includes(tool), `assistant skill missing ${tool}`);
  }

  const applyText = fs.readFileSync(path.join(coreRoot, APPLY_COMMAND_PATH), "utf8");
  assert.ok(applyText.length > 500);
  assert.match(applyText, /tools\/posting_guard\.py/);
});

test("every portal skill documents search, detail, and JSON, and the CLI source emits results", async () => {
  const portals = await listPortalSkills(coreRoot);
  assert.ok(portals.length >= 1);
  for (const portal of portals) {
    assert.equal(portal.documentsSearch, true, portal.directoryName);
    assert.equal(portal.documentsDetail, true, portal.directoryName);
    assert.equal(portal.documentsFormatJson, true, portal.directoryName);
    const raw = fs.readFileSync(path.join(coreRoot, portal.skillPath), "utf8");
    const turnedOff = /enabled:\s*false\b/.test(raw);
    assert.equal(portal.enabled, !turnedOff, portal.directoryName);
    assert.equal(portal.personalUseOnly, /personal use only/i.test(raw));
  }
  const contracts = await readPortalCliContracts(coreRoot);
  assert.equal(contracts.length, portals.length);
  for (const contract of contracts) {
    assert.equal(contract.searchSourceFound, true, contract.directoryName);
    assert.equal(contract.emitsResultsArray, true, contract.directoryName);
  }
});

test("linkedin is marked personal use only in the core skill, which the adapter only reads", async () => {
  const portals = await listPortalSkills(coreRoot);
  const linkedin = portals.find((portal) => portal.directoryName === "linkedin-search");
  assert.ok(linkedin);
  assert.equal(linkedin.personalUseOnly, true);
  assert.equal(linkedin.enabled, true);
});

test("adapter source does not copy the apply workflow or open the network", () => {
  const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src");
  const applyText = fs.readFileSync(path.join(coreRoot, APPLY_COMMAND_PATH), "utf8");
  const marker = "Standing rule — write new facts back to the profile.";
  assert.ok(applyText.includes(marker));
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith(".ts"));
  const forbidden = ["node:child_process", "node:http", "node:https", "node:net", "undici"];
  for (const file of files) {
    const source = fs.readFileSync(path.join(sourceDir, file), "utf8");
    assert.equal(source.includes(marker), false, file);
    for (const token of forbidden) {
      assert.equal(source.includes(token), false, `${file} mentions ${token}`);
    }
    assert.equal(/\bfetch\s*\(/.test(source), false, `${file} calls fetch`);
  }
});
