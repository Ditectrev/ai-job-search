import "server-only";
import path from "node:path";
import { createAdapter, type JobAdapter } from "@ai-job-search/adapter";

/**
 * One adapter per call. Runs are stored in a JSON file, not in the core checkout.
 * Swap `storePath` for a database when more than one server needs to share the queue.
 */
export function getAdapter(): JobAdapter {
  return createAdapter({
    coreRoot: process.env.CORE_ROOT?.trim() || path.resolve(process.cwd(), ".."),
    storePath: storePath(),
  });
}

function storePath(): string {
  if (process.env.RUN_STORE_PATH?.trim()) return process.env.RUN_STORE_PATH.trim();
  if (process.env.VERCEL) return path.join("/tmp", "ai-job-search-store.json");
  return path.join(process.cwd(), ".data", "store.json");
}
