const LABELS: Record<string, string> = {
  ".claude/skills/job-scraper/SKILL.md": "How to find jobs",
  ".claude/skills/job-scraper/search-queries.md": "Search terms",
  ".claude/commands/apply.md": "How to prepare an application",
  ".claude/skills/job-application-assistant/SKILL.md": "Application writing guide",
};

export function skillLabel(relativePath: string): string {
  const known = LABELS[relativePath];
  if (known) return known;
  const portal = /^\.agents\/skills\/([^/]+)\/SKILL\.md$/.exec(relativePath);
  if (portal?.[1]) {
    const name = portal[1].replace(/-search$/, "").replaceAll("-", " ");
    return `Job board notes: ${name}`;
  }
  return relativePath;
}

export function kindLabel(kind: "scrape" | "apply"): string {
  return kind === "scrape" ? "Find jobs" : "Application";
}

export function statusLabel(status: string): string {
  if (status === "queued") return "Waiting for a worker";
  if (status === "running") return "Running";
  if (status === "completed") return "Finished";
  if (status === "failed") return "Stopped";
  return status;
}

export function portalTitle(directoryName: string, name: string | null): string {
  const source = name && name.length > 0 ? name : directoryName;
  return source.replace(/-search$/, "").replaceAll("-", " ");
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}
