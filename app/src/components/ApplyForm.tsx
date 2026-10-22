"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveCachedRun } from "@/lib/browser-cache";
import { isRunView } from "@/lib/types";

export function ApplyForm() {
  const router = useRouter();
  const [postingUrl, setPostingUrl] = useState("");
  const [postingText, setPostingText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/runs/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postingUrl, postingText }),
      });
      const body: unknown = await response.json();
      const run = readRun(body);
      if (!response.ok || !run) {
        setError(readError(body, "The application could not be queued."));
        return;
      }
      saveCachedRun(run);
      router.push(`/runs/${run.id}`);
    } catch {
      setError("Could not reach the site. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="postingUrl">Posting link</label>
      <input
        id="postingUrl"
        name="postingUrl"
        type="text"
        inputMode="url"
        value={postingUrl}
        placeholder="https://"
        autoComplete="off"
        onChange={(event) => setPostingUrl(event.target.value)}
      />
      <label htmlFor="postingText">Posting text</label>
      <textarea
        id="postingText"
        name="postingText"
        value={postingText}
        placeholder="Paste the posting here if you already have it"
        onChange={(event) => setPostingText(event.target.value)}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Queuing…" : "Queue this application"}
      </button>
      {error ? <p className="alert" role="alert">{error}</p> : null}
    </form>
  );
}

function readRun(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const run = (value as { run?: unknown }).run;
  return isRunView(run) ? run : null;
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string") {
    return (value as { error: string }).error;
  }
  return fallback;
}
