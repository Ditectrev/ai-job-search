"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readCachedRun, saveCachedRun } from "@/lib/browser-cache";
import { formatWhen, kindLabel, skillLabel, statusLabel } from "@/lib/labels";
import { isRunView, type RunView } from "@/lib/types";

export function RunDetail({ id }: { id: string }) {
  const [run, setRun] = useState<RunView | null | undefined>(undefined);
  const [source, setSource] = useState<"server" | "browser" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/runs/${id}`);
        if (response.ok) {
          const body: unknown = await response.json();
          const parsed = readRun(body);
          if (!cancelled && parsed) {
            saveCachedRun(parsed);
            setRun(parsed);
            setSource("server");
            return;
          }
        }
      } catch {
        // Fall through to the browser copy.
      }
      if (cancelled) return;
      const cached = readCachedRun(id);
      setRun(cached);
      setSource(cached ? "browser" : null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (run === undefined) return <p className="muted">Loading this run…</p>;
  if (run === null) {
    return (
      <>
        <h1>Run not found</h1>
        <p>This run is not on the server or in this browser.</p>
        <Link className="button" href="/runs">Back to run status</Link>
      </>
    );
  }

  const posting = run.request.postingText ?? "";
  const excerpt = posting.length > 1200 ? `${posting.slice(0, 1200)}…` : posting;

  return (
    <>
      <p className="meta">
        <Link href="/runs">All runs</Link>
      </p>
      <h1>{kindLabel(run.kind)}</h1>
      <div className="meta">
        <span className="pill">{statusLabel(run.status)}</span>
        <span>Queued {formatWhen(run.createdAt)}</span>
        {source === "browser" ? <span>Shown from this browser</span> : null}
      </div>
      <p>{run.summary}</p>
      {run.error ? <p className="alert" role="alert">{run.error}</p> : null}

      {run.kind === "scrape" ? (
        <section className="panel">
          <h2>What you asked for</h2>
          <p>{run.request.focus ? `Focus: ${run.request.focus}` : "No focus. The worker can use your saved profile."}</p>
          <p>{run.request.broad ? "You asked for a wider search." : "You asked for a shorter pass."}</p>
        </section>
      ) : (
        <section className="panel">
          <h2>What you handed over</h2>
          {run.request.postingUrl ? <p>Link, stored and not opened: {run.request.postingUrl}</p> : <p>No link.</p>}
          {posting ? (
            <>
              <p>Pasted text ({posting.length} characters).</p>
              <pre className="posting">{excerpt}</pre>
            </>
          ) : (
            <p>No pasted text. A worker would need the posting before it can write anything.</p>
          )}
        </section>
      )}

      <details>
        <summary>For a developer</summary>
        <p>
          Status value <code>{run.status}</code>, execution <code>{run.execution}</code>. The website
          queues work. It does not run the model, the shell, or a job board.
        </p>
        <h2>Instructions the worker will read</h2>
        <ul className="files">
          {run.skillPaths.map((skillPath) => (
            <li key={skillPath}>
              <strong>{skillLabel(skillPath)}</strong>
              <div className="muted"><code>{skillPath}</code></div>
            </li>
          ))}
        </ul>
        {run.toolTrace.length > 0 ? (
          <>
            <h2>Tool trace</h2>
            <ul className="trace">
              {run.toolTrace.map((entry, index) => (
                <li key={`${entry.tool}-${index}`}>{entry.detail}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>No tool has run. A worker calls the adapter when it is ready.</p>
        )}
      </details>
    </>
  );
}

function readRun(value: unknown): RunView | null {
  if (typeof value !== "object" || value === null) return null;
  const run = (value as { run?: unknown }).run;
  return isRunView(run) ? run : null;
}
