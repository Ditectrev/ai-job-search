import { EMPTY_PROFILE, isProfileView, isRunView, type ProfileView, type RunView } from "./types";

const RUNS_KEY = "ai-job-search-runs";
const PROFILE_KEY = "ai-job-search-profile";

export function readCachedRuns(): RunView[] {
  return readJson(RUNS_KEY, isRunList) ?? [];
}

export function saveCachedRun(run: RunView): void {
  const runs = readCachedRuns().filter((item) => item.id !== run.id);
  runs.push(run);
  writeJson(RUNS_KEY, runs);
}

export function readCachedRun(id: string): RunView | null {
  return readCachedRuns().find((run) => run.id === id) ?? null;
}

export function mergeRuns(server: RunView[], cached: RunView[]): RunView[] {
  const byId = new Map<string, RunView>();
  for (const run of cached) byId.set(run.id, run);
  for (const run of server) byId.set(run.id, run);
  return [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function readCachedProfile(): ProfileView {
  return readJson(PROFILE_KEY, isProfileView) ?? EMPTY_PROFILE;
}

export function saveCachedProfile(profile: ProfileView): void {
  writeJson(PROFILE_KEY, profile);
}

function readJson<T>(key: string, guard: (value: unknown) => value is T): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isRunList(value: unknown): value is RunView[] {
  return Array.isArray(value) && value.every(isRunView);
}

function writeJson(key: string, value: unknown): void {
  window.sessionStorage.setItem(key, JSON.stringify(value));
}
