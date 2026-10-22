export interface ProfileView {
  displayName: string;
  location: string;
  languages: string;
  targetRoles: string;
  dealBreakers: string;
  notes: string;
}

export interface ToolTraceView {
  tool: string;
  ok: boolean;
  executed: boolean;
  stubbed: boolean;
  detail: string;
}

export interface RunView {
  id: string;
  kind: "scrape" | "apply";
  status: "queued" | "running" | "completed" | "failed";
  execution: "not-started" | "stub";
  createdAt: string;
  updatedAt: string;
  summary: string;
  skillPaths: string[];
  request: {
    focus?: string;
    broad?: boolean;
    postingUrl?: string;
    postingText?: string;
  };
  toolTrace: ToolTraceView[];
  scratchFiles: Array<{ path: string; bytes: number }>;
  modelNote?: string;
  error?: string;
}

export interface PortalView {
  directoryName: string;
  name: string | null;
  enabled: boolean;
  personalUseOnly: boolean;
}

export const EMPTY_PROFILE: ProfileView = {
  displayName: "",
  location: "",
  languages: "",
  targetRoles: "",
  dealBreakers: "",
  notes: "",
};

export function isRunView(value: unknown): value is RunView {
  if (typeof value !== "object" || value === null) return false;
  const run = value as Partial<RunView>;
  return (
    typeof run.id === "string" &&
    (run.kind === "scrape" || run.kind === "apply") &&
    typeof run.status === "string" &&
    typeof run.createdAt === "string" &&
    typeof run.summary === "string" &&
    Array.isArray(run.skillPaths) &&
    Array.isArray(run.toolTrace) &&
    typeof run.request === "object" &&
    run.request !== null
  );
}

export function isProfileView(value: unknown): value is ProfileView {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<ProfileView>;
  return (
    typeof profile.displayName === "string" &&
    typeof profile.location === "string" &&
    typeof profile.languages === "string" &&
    typeof profile.targetRoles === "string" &&
    typeof profile.dealBreakers === "string" &&
    typeof profile.notes === "string"
  );
}
