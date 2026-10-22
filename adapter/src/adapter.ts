import { AdapterError } from "./errors.js";
import { StubModel, StubShell, executeToolLoop } from "./loop.js";
import { listPortalSkills, readSkillFile, coreFileExists } from "./skills.js";
import { FileStore, MemoryStore, type RunStore } from "./store.js";
import { resolveCoreRoot } from "./core-root.js";
import { MemoryWorkspace } from "./workspace.js";
import {
  APPLY_COMMAND_PATH,
  ASSISTANT_SKILL_PATH,
  EMPTY_PROFILE,
  MAX_FOCUS_LENGTH,
  MAX_POSTING_LENGTH,
  PROFILE_LIMITS,
  SCRAPE_SKILL_PATH,
  SEARCH_QUERIES_PATH,
  type ApplyRequest,
  type ExecutionMode,
  type ModelClient,
  type PortalSkill,
  type ProfileDraft,
  type RunKind,
  type RunRecord,
  type ScrapeRequest,
  type ShellRunner,
  type SkillFile,
} from "./types.js";

export interface CreateAdapterOptions {
  coreRoot?: string;
  storePath?: string;
  store?: RunStore;
  model?: ModelClient;
  shell?: ShellRunner;
  now?: () => Date;
  newId?: () => string;
}

export interface JobAdapter {
  readonly coreRoot: string;
  getProfile(): Promise<ProfileDraft>;
  saveProfile(input: unknown): Promise<ProfileDraft>;
  listPortals(): Promise<PortalSkill[]>;
  enqueueScrape(input: unknown): Promise<RunRecord>;
  enqueueApply(input: unknown): Promise<RunRecord>;
  listRuns(): Promise<RunRecord[]>;
  getRun(id: string): Promise<RunRecord | null>;
  /** Worker entry. The website does not call this. */
  runQueued(id: string): Promise<RunRecord>;
}

export function createAdapter(options: CreateAdapterOptions = {}): JobAdapter {
  return new CoreAdapter({
    coreRoot: resolveCoreRoot(options.coreRoot),
    store: options.store ?? (options.storePath ? new FileStore(options.storePath) : new MemoryStore()),
    model: options.model ?? new StubModel(),
    shell: options.shell ?? new StubShell(),
    now: options.now ?? (() => new Date()),
    newId: options.newId ?? (() => crypto.randomUUID()),
  });
}

class CoreAdapter implements JobAdapter {
  readonly coreRoot: string;
  private readonly store: RunStore;
  private readonly model: ModelClient;
  private readonly shell: ShellRunner;
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(options: {
    coreRoot: string;
    store: RunStore;
    model: ModelClient;
    shell: ShellRunner;
    now: () => Date;
    newId: () => string;
  }) {
    this.coreRoot = options.coreRoot;
    this.store = options.store;
    this.model = options.model;
    this.shell = options.shell;
    this.now = options.now;
    this.newId = options.newId;
  }

  async getProfile(): Promise<ProfileDraft> {
    const data = await this.store.load();
    return { ...data.profile };
  }

  async saveProfile(input: unknown): Promise<ProfileDraft> {
    const profile = parseProfile(input);
    const data = await this.store.load();
    data.profile = profile;
    await this.store.save(data);
    return { ...profile };
  }

  listPortals(): Promise<PortalSkill[]> {
    return listPortalSkills(this.coreRoot);
  }

  async enqueueScrape(input: unknown): Promise<RunRecord> {
    const request = parseScrape(input);
    const skillPaths = await this.scrapeSkillPaths();
    return this.enqueue("scrape", request, skillPaths, scrapeSummary());
  }

  async enqueueApply(input: unknown): Promise<RunRecord> {
    const request = parseApply(input);
    await this.requireSkill(APPLY_COMMAND_PATH);
    await this.requireSkill(ASSISTANT_SKILL_PATH);
    return this.enqueue("apply", request, [APPLY_COMMAND_PATH, ASSISTANT_SKILL_PATH], applySummary());
  }

  async listRuns(): Promise<RunRecord[]> {
    const data = await this.store.load();
    return [...data.runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRun(id: string): Promise<RunRecord | null> {
    const data = await this.store.load();
    return data.runs.find((run) => run.id === id) ?? null;
  }

  async runQueued(id: string): Promise<RunRecord> {
    const data = await this.store.load();
    const record = data.runs.find((run) => run.id === id);
    if (!record) throw new AdapterError("No run with that id.", 404);
    if (record.status !== "queued") {
      throw new AdapterError("That run has already left the queue.", 409);
    }
    record.status = "running";
    record.updatedAt = this.timestamp();
    await this.store.save(data);

    try {
      const documents = [];
      const allowed = new Set<string>();
      for (const skillPath of record.skillPaths) {
        const skill = await readSkillFile(this.coreRoot, skillPath);
        documents.push({ relativePath: skill.relativePath, text: skill.text });
        for (const tool of skill.allowedTools) allowed.add(tool);
      }
      const portals = record.kind === "scrape" ? await listPortalSkills(this.coreRoot) : [];
      const response = await this.model.complete({
        kind: record.kind,
        documents,
        allowedTools: [...allowed],
        portals: portals.map((portal) => ({
          directoryName: portal.directoryName,
          enabled: portal.enabled,
          personalUseOnly: portal.personalUseOnly,
        })),
        user: userFrom(record),
      });
      const workspace = new MemoryWorkspace();
      const trace = await executeToolLoop({
        response,
        coreRoot: this.coreRoot,
        shell: this.shell,
        workspace,
      });
      for (const portal of portals) {
        if (portal.enabled) continue;
        trace.push({
          tool: "portal_cli",
          ok: true,
          executed: false,
          stubbed: true,
          detail: `Skipped ${portal.directoryName} because that portal is turned off in its skill file.`,
        });
      }
      const finished = await this.store.load();
      const current = finished.runs.find((run) => run.id === id);
      if (!current) throw new AdapterError("The run disappeared while it was in progress.", 500);
      current.status = "completed";
      current.execution = "stub";
      current.updatedAt = this.timestamp();
      current.toolTrace = trace;
      current.scratchFiles = workspace.entries();
      current.modelNote = response.assistantText;
      current.summary = record.kind === "scrape" ? scrapeStubSummary() : applyStubSummary(record);
      current.error = undefined;
      await this.store.save(finished);
      return current;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const finished = await this.store.load();
      const current = finished.runs.find((run) => run.id === id);
      if (!current) throw error;
      current.status = "failed";
      current.execution = "stub" satisfies ExecutionMode;
      current.updatedAt = this.timestamp();
      current.error = message;
      current.summary = "The worker stub stopped before finishing.";
      await this.store.save(finished);
      return current;
    }
  }

  private async enqueue(
    kind: RunKind,
    request: ScrapeRequest | ApplyRequest,
    skillPaths: string[],
    summary: string,
  ): Promise<RunRecord> {
    const data = await this.store.load();
    const timestamp = this.timestamp();
    const record: RunRecord = {
      id: this.newId(),
      kind,
      status: "queued",
      execution: "not-started",
      createdAt: timestamp,
      updatedAt: timestamp,
      summary,
      skillPaths,
      profileSnapshot: { ...data.profile },
      request,
      toolTrace: [],
      scratchFiles: [],
    };
    data.runs.push(record);
    await this.store.save(data);
    return record;
  }

  private async scrapeSkillPaths(): Promise<string[]> {
    await this.requireSkill(SCRAPE_SKILL_PATH);
    const paths = [SCRAPE_SKILL_PATH];
    if (await coreFileExists(this.coreRoot, SEARCH_QUERIES_PATH)) {
      paths.push(SEARCH_QUERIES_PATH);
    }
    const portals = await listPortalSkills(this.coreRoot);
    for (const portal of portals) paths.push(portal.skillPath);
    return paths;
  }

  private async requireSkill(relativePath: string): Promise<SkillFile> {
    return readSkillFile(this.coreRoot, relativePath);
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}

function parseProfile(input: unknown): ProfileDraft {
  const source = isRecord(input) ? input : {};
  const profile = { ...EMPTY_PROFILE };
  for (const key of Object.keys(PROFILE_LIMITS) as (keyof ProfileDraft)[]) {
    const value = source[key];
    if (value === undefined) continue;
    if (typeof value !== "string") {
      throw new AdapterError(`${key} must be text.`);
    }
    const trimmed = value.trim();
    const limit = PROFILE_LIMITS[key];
    if (trimmed.length > limit) {
      throw new AdapterError(`${key} is longer than ${limit} characters.`);
    }
    profile[key] = trimmed;
  }
  return profile;
}

function parseScrape(input: unknown): ScrapeRequest {
  const source = isRecord(input) ? input : {};
  const request: ScrapeRequest = {};
  if (source.focus !== undefined) {
    if (typeof source.focus !== "string") throw new AdapterError("Focus must be text.");
    const focus = source.focus.trim();
    if (focus.length > MAX_FOCUS_LENGTH) {
      throw new AdapterError(`Focus is longer than ${MAX_FOCUS_LENGTH} characters.`);
    }
    if (focus) request.focus = focus;
  }
  if (source.broad !== undefined) {
    if (typeof source.broad !== "boolean") throw new AdapterError("Broad must be yes or no.");
    request.broad = source.broad;
  }
  return request;
}

function parseApply(input: unknown): ApplyRequest {
  const source = isRecord(input) ? input : {};
  const request: ApplyRequest = {};
  if (typeof source.postingUrl === "string" && source.postingUrl.trim()) {
    request.postingUrl = parseHttpUrl(source.postingUrl.trim());
  }
  if (typeof source.postingText === "string" && source.postingText.trim()) {
    const postingText = source.postingText.trim();
    if (postingText.length > MAX_POSTING_LENGTH) {
      throw new AdapterError(`The posting text is longer than ${MAX_POSTING_LENGTH} characters.`);
    }
    request.postingText = postingText;
  }
  if (!request.postingUrl && !request.postingText) {
    throw new AdapterError("Add a posting link, the posting text, or both.");
  }
  return request;
}

function parseHttpUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AdapterError("The posting link must be an http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AdapterError("The posting link must be an http or https URL.");
  }
  return url.toString();
}

function userFrom(record: RunRecord): {
  focus?: string;
  broad?: boolean;
  postingUrl?: string;
  postingText?: string;
  profile: ProfileDraft;
} {
  const request = record.request;
  return {
    profile: record.profileSnapshot,
    ...("focus" in request && request.focus ? { focus: request.focus } : {}),
    ...("broad" in request && request.broad !== undefined ? { broad: request.broad } : {}),
    ...("postingUrl" in request && request.postingUrl ? { postingUrl: request.postingUrl } : {}),
    ...("postingText" in request && request.postingText ? { postingText: request.postingText } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scrapeSummary(): string {
  return "Queued for a worker. This site did not search a job board. The worker reads the job-search instructions from the core checkout.";
}

function applySummary(): string {
  return "Queued for a worker. This site did not open the link or write a CV. The worker reads the application instructions from the core checkout.";
}

function scrapeStubSummary(): string {
  return "Stub worker finished. No job board was contacted and no model API was called. Enabled portals were recorded as search --format json for a real worker.";
}

function applyStubSummary(record: RunRecord): string {
  const request = record.request;
  const hasText = "postingText" in request && Boolean(request.postingText);
  const kept = hasText ? "The pasted posting is in the scratch workspace." : "No posting text was stored.";
  return `Stub worker finished. ${kept} No model API was called, the posting link was not opened, and LaTeX was not compiled.`;
}
