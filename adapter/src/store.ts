import fs from "node:fs/promises";
import path from "node:path";
import { AdapterError } from "./errors.js";
import { EMPTY_PROFILE, type ProfileDraft, type RunRecord } from "./types.js";

export interface StoreData {
  version: 1;
  profile: ProfileDraft;
  runs: RunRecord[];
}

export interface RunStore {
  load(): Promise<StoreData>;
  save(data: StoreData): Promise<void>;
}

export function emptyStore(): StoreData {
  return { version: 1, profile: { ...EMPTY_PROFILE }, runs: [] };
}

export class MemoryStore implements RunStore {
  private data: StoreData = emptyStore();

  async load(): Promise<StoreData> {
    return structuredClone(this.data);
  }

  async save(data: StoreData): Promise<void> {
    this.data = structuredClone(data);
  }
}

export class FileStore implements RunStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<StoreData> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      if (raw.trim() === "") return emptyStore();
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      if (parsed.version !== 1 || !parsed.profile || !Array.isArray(parsed.runs)) {
        throw new AdapterError("The run store file is not in a known format.", 500);
      }
      return {
        version: 1,
        profile: { ...EMPTY_PROFILE, ...parsed.profile },
        runs: parsed.runs,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
      if (error instanceof AdapterError) throw error;
      if (error instanceof SyntaxError) {
        throw new AdapterError("The run store file is not valid JSON.", 500);
      }
      throw error;
    }
  }

  async save(data: StoreData): Promise<void> {
    const directory = path.dirname(this.filePath);
    await fs.mkdir(directory, { recursive: true });
    const temporary = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(temporary, this.filePath);
  }
}
