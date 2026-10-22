import path from "node:path";
import { AdapterError } from "./errors.js";
import type { ScratchFile } from "./types.js";

/** Scratch files stay in memory for one run. They are never written into the core checkout. */
export class MemoryWorkspace {
  private readonly files = new Map<string, string>();

  write(relativePath: string, content: string): string {
    const safe = assertScratchPath(relativePath);
    this.files.set(safe, content);
    return safe;
  }

  read(relativePath: string): string | undefined {
    return this.files.get(assertScratchPath(relativePath));
  }

  entries(): ScratchFile[] {
    return [...this.files.entries()].map(([filePath, content]) => ({
      path: filePath,
      bytes: Buffer.byteLength(content),
    }));
  }
}

export function assertScratchPath(relativePath: string): string {
  const normalized = path.posix.normalize(relativePath.replaceAll("\\", "/"));
  if (
    normalized.startsWith("/") ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new AdapterError("Refusing to write outside the scratch workspace.");
  }
  if (!normalized.startsWith("scratch/") || normalized === "scratch") {
    throw new AdapterError("Writes are limited to the scratch/ workspace.");
  }
  return normalized;
}
