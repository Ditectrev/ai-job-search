"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { mergeRuns, readCachedRuns } from "@/lib/browser-cache";
import { formatWhen, kindLabel, statusLabel } from "@/lib/labels";
import { isRunView, type RunView } from "@/lib/types";

export function RunList() {
  const [runs, setRuns] = useState<RunView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = readCachedRuns();
      try {
        const response = await fetch("/api/runs");
        const body: unknown = await response.json();
        const server = readRuns(body);
        if (cancelled) return;
        if (!response.ok || !server) {
          setRuns(cached);
          setError("The server list could not be loaded. Showing runs saved in this browser.");
          return;
        }
        setRuns(mergeRuns(server, cached));
      } catch {
        if (!cancelled) {
          setRuns(cached);
          setError("The server list could not be loaded. Showing runs saved in this browser.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (runs === null) return <p className="muted">Loading runs…</p>;
  return (
    <>
      {error ? <p className="callout">{error}</p> : null}
      {runs.length === 0 ? (
        <p>No runs yet. Find jobs or start an application, and the request will show up here.</p>
      ) : (
        <ul className="runs">
          {runs.map((run) => (
            <li key={run.id}>
              <Link href={`/runs/${run.id}`}>{kindLabel(run.kind)}</Link>
              <div className="meta">
                <span className="pill">{statusLabel(run.status)}</span>
                <span>{formatWhen(run.createdAt)}</span>
              </div>
              <p>{run.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function readRuns(value: unknown): RunView[] | null {
  if (typeof value !== "object" || value === null) return null;
  const runs = (value as { runs?: unknown }).runs;
  if (!Array.isArray(runs) || !runs.every(isRunView)) return null;
  return runs;
}
