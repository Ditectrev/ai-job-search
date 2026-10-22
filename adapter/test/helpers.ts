import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdapter, type JobAdapter } from "../src/index.js";

/** Walk to the checkout that contains adapter/ and .claude/skills. Ignores CORE_ROOT. */
function repoRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let hop = 0; hop < 8; hop += 1) {
    if (
      fs.existsSync(path.join(dir, "adapter", "package.json")) &&
      fs.existsSync(path.join(dir, ".claude", "skills"))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find the job-search checkout from the adapter tests.");
}

export const coreRoot = repoRoot();

export async function tempAdapter(): Promise<{
  adapter: JobAdapter;
  storePath: string;
  cleanup: () => Promise<void>;
}> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "job-search-adapter-"));
  const storePath = path.join(dir, "store.json");
  const adapter = createAdapter({ coreRoot, storePath });
  return {
    adapter,
    storePath,
    cleanup: () => fsp.rm(dir, { recursive: true, force: true }),
  };
}
