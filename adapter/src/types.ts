export type RunKind = "scrape" | "apply";

export type RunStatus = "queued" | "running" | "completed" | "failed";

/** `stub` means the in-process stand-in finished. It did not call a model or a shell. */
export type ExecutionMode = "not-started" | "stub";

export interface ProfileDraft {
  displayName: string;
  location: string;
  languages: string;
  targetRoles: string;
  dealBreakers: string;
  notes: string;
}

export interface ScrapeRequest {
  focus?: string;
  broad?: boolean;
}

export interface ApplyRequest {
  postingUrl?: string;
  postingText?: string;
}

export interface ToolTraceEntry {
  tool: string;
  ok: boolean;
  executed: boolean;
  stubbed: boolean;
  detail: string;
}

export interface ScratchFile {
  path: string;
  bytes: number;
}

export interface RunRecord {
  id: string;
  kind: RunKind;
  status: RunStatus;
  execution: ExecutionMode;
  createdAt: string;
  updatedAt: string;
  summary: string;
  skillPaths: string[];
  profileSnapshot: ProfileDraft;
  request: ScrapeRequest | ApplyRequest;
  toolTrace: ToolTraceEntry[];
  scratchFiles: ScratchFile[];
  modelNote?: string;
  error?: string;
}

export interface SkillFile {
  relativePath: string;
  name: string | null;
  description: string;
  allowedTools: string[];
  /** Null when the file has no `enabled` key. Portal callers treat null as enabled. */
  enabled: boolean | null;
  text: string;
  body: string;
}

export interface PortalSkill {
  directoryName: string;
  skillPath: string;
  name: string | null;
  enabled: boolean;
  personalUseOnly: boolean;
  documentsSearch: boolean;
  documentsDetail: boolean;
  documentsFormatJson: boolean;
}

export interface PortalCliContract {
  directoryName: string;
  searchSourcePath: string;
  searchSourceFound: boolean;
  /** Search JSON from this portal includes a results array. Checked from source, not by running it. */
  emitsResultsArray: boolean;
}

export interface SkillDocument {
  relativePath: string;
  text: string;
}

export interface ModelPortal {
  directoryName: string;
  enabled: boolean;
  personalUseOnly: boolean;
}

export interface ModelRequest {
  kind: RunKind;
  documents: SkillDocument[];
  allowedTools: string[];
  portals: ModelPortal[];
  user: {
    focus?: string;
    broad?: boolean;
    postingUrl?: string;
    postingText?: string;
    profile: ProfileDraft;
  };
}

export interface ToolCall {
  tool: "read_file" | "write_file" | "portal_cli" | "bash" | "compile_latex" | "web_fetch" | "web_search";
  input: Record<string, unknown>;
}

export interface ModelResponse {
  assistantText: string;
  toolCalls: ToolCall[];
}

/**
 * Replace this with a client that sends `documents` to a model.
 * The skill markdown is the workflow. Do not reimplement it here.
 */
export interface ModelClient {
  complete(request: ModelRequest): Promise<ModelResponse>;
}

export interface ShellRequest {
  kind: "bash" | "portal_cli" | "latex" | "network";
  argv: string[];
  allowSpawn: boolean;
}

export interface ShellResult {
  ok: boolean;
  executed: boolean;
  stubbed: boolean;
  output: string;
}

/**
 * A worker can supply a runner that spawns Bun and LaTeX.
 * The stub in this package never spawns and never opens a socket.
 */
export interface ShellRunner {
  run(request: ShellRequest): Promise<ShellResult>;
}

export const EMPTY_PROFILE: ProfileDraft = {
  displayName: "",
  location: "",
  languages: "",
  targetRoles: "",
  dealBreakers: "",
  notes: "",
};

export const SCRAPE_SKILL_PATH = ".claude/skills/job-scraper/SKILL.md";
export const SEARCH_QUERIES_PATH = ".claude/skills/job-scraper/search-queries.md";
export const APPLY_COMMAND_PATH = ".claude/commands/apply.md";
export const ASSISTANT_SKILL_PATH = ".claude/skills/job-application-assistant/SKILL.md";

export const PROFILE_LIMITS: Record<keyof ProfileDraft, number> = {
  displayName: 200,
  location: 200,
  languages: 500,
  targetRoles: 1000,
  dealBreakers: 1000,
  notes: 4000,
};

export const MAX_FOCUS_LENGTH = 200;
export const MAX_POSTING_LENGTH = 200_000;
