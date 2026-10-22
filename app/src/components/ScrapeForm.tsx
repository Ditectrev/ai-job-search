"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { saveCachedRun } from "@/lib/browser-cache";
import { isRunView } from "@/lib/types";

export function ScrapeForm() {
  const router = useRouter();
  const [focus, setFocus] = useState("");
  const [broad, setBroad] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/runs/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ focus, broad }),
      });
      const body: unknown = await response.json();
      const run = readRun(body);
      if (!response.ok || !run) {
        setError(readError(body, "The search could not be queued."));
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
      <label htmlFor="focus">Optional focus</label>
      <input
        id="focus"
        name="focus"
        type="text"
        value={focus}
        maxLength={200}
        placeholder="A role, a skill, or a city"
        autoComplete="off"
        onChange={(event) => setFocus(event.target.value)}
      />
      <label className="check" htmlFor="broad">
        <input
          id="broad"
          name="broad"
          type="checkbox"
          checked={broad}
          onChange={(event) => setBroad(event.target.checked)}
        />
        <span>Search more widely. Leave this off for a shorter pass.</span>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Queuing…" : "Queue a search"}
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
