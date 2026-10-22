"use client";

import { useEffect, useState, type FormEvent } from "react";
import { readCachedProfile, saveCachedProfile } from "@/lib/browser-cache";
import { EMPTY_PROFILE, isProfileView, type ProfileView } from "@/lib/types";

const fields: Array<{ key: keyof ProfileView; label: string; hint: string; long?: boolean }> = [
  { key: "displayName", label: "Name", hint: "Leave blank if you prefer" },
  { key: "location", label: "Location", hint: "City and country" },
  { key: "languages", label: "Languages", hint: "Language and level" },
  { key: "targetRoles", label: "Roles you want", hint: "A few titles or areas", long: true },
  { key: "dealBreakers", label: "Limits", hint: "Anything a worker should not ignore", long: true },
  { key: "notes", label: "Notes", hint: "Anything else you want remembered", long: true },
];

export function ProfileForm() {
  const [profile, setProfile] = useState<ProfileView>(EMPTY_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const cached = readCachedProfile();
      try {
        const response = await fetch("/api/profile");
        const body: unknown = await response.json();
        const server = isProfileRecord(body) ? body.profile : EMPTY_PROFILE;
        if (cancelled) return;
        const serverEmpty = Object.values(server).every((value) => value.trim() === "");
        const cachedEmpty = Object.values(cached).every((value) => value.trim() === "");
        setProfile(!serverEmpty || cachedEmpty ? server : cached);
      } catch {
        if (!cancelled) setProfile(cached);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const body: unknown = await response.json();
      if (!response.ok || !isProfileRecord(body)) {
        setError(readError(body, "The profile could not be saved."));
        return;
      }
      setProfile(body.profile);
      saveCachedProfile(body.profile);
      setSaved(true);
    } catch {
      setError("Could not reach the site. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {fields.map((field) => (
        <div key={field.key}>
          <label htmlFor={field.key}>{field.label}</label>
          {field.long ? (
            <textarea
              id={field.key}
              name={field.key}
              value={profile[field.key]}
              placeholder={field.hint}
              onChange={(event) => setProfile({ ...profile, [field.key]: event.target.value })}
            />
          ) : (
            <input
              id={field.key}
              name={field.key}
              type="text"
              value={profile[field.key]}
              placeholder={field.hint}
              autoComplete="off"
              onChange={(event) => setProfile({ ...profile, [field.key]: event.target.value })}
            />
          )}
        </div>
      ))}
      <button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save on this site"}
      </button>
      {saved ? <p className="ok">Saved here. The core project files were not changed.</p> : null}
      {error ? <p className="alert" role="alert">{error}</p> : null}
    </form>
  );
}

function isProfileRecord(value: unknown): value is { profile: ProfileView } {
  return typeof value === "object" && value !== null && isProfileView((value as { profile?: unknown }).profile);
}

function readError(value: unknown, fallback: string): string {
  if (typeof value === "object" && value !== null && typeof (value as { error?: unknown }).error === "string") {
    return (value as { error: string }).error;
  }
  return fallback;
}
