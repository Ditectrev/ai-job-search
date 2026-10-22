import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdapterError } from "./errors.js";

/**
 * Default CORE_ROOT is the repository root: the parent of both `app/` and `adapter/`.
 * The core is this checkout. Do not look for a nested submodule.
 */
export function resolveCoreRoot(explicit?: string): string {
  if (explicit?.trim()) return path.resolve(explicit);
  const fromEnv = process.env.CORE_ROOT?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return findCoreRoot(path.dirname(fileURLToPath(import.meta.url)));
}

function findCoreRoot(start: string): string {
  let dir = start;
  for (let hop = 0; hop < 8; hop += 1) {
    const adapterPackage = path.join(dir, "adapter", "package.json");
    const skills = path.join(dir, ".claude", "skills");
    if (fs.existsSync(adapterPackage) && fs.existsSync(skills)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new AdapterError(
    "CORE_ROOT is not set, and the job-search checkout was not found beside adapter/. Set CORE_ROOT to the repository root.",
    500,
  );
}
