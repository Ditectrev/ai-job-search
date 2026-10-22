import type { Metadata } from "next";
import { ScrapeForm } from "@/components/ScrapeForm";
import { getAdapter } from "@/lib/adapter";
import { portalTitle } from "@/lib/labels";
import type { PortalView } from "@/lib/types";

export const metadata: Metadata = { title: "Find jobs" };
export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const loaded = await loadPortals();
  return (
    <>
      <h1>Find jobs</h1>
      <p className="lede">
        Ask for a search. Nothing on this page contacts a job board. A worker would run that search
        later, on a machine you control, by reading the core instructions.
      </p>
      {loaded.error ? <p className="alert" role="alert">{loaded.error}</p> : null}
      {loaded.portals ? <PortalList portals={loaded.portals} /> : null}
      <ScrapeForm />
    </>
  );
}

function PortalList({ portals }: { portals: PortalView[] }) {
  const personal = portals.filter((portal) => portal.personalUseOnly);
  return (
    <section className="panel">
      <h2>Job boards a worker could use</h2>
      <p className="muted">Listed from the core checkout. None of them are called from this page.</p>
      {personal.length > 0 ? (
        <p className="callout">
          {personal.map((portal) => portalTitle(portal.directoryName, portal.name)).join(", ")}{" "}
          {personal.length === 1 ? "is" : "are"} marked personal use only in the core files. This
          site does not call {personal.length === 1 ? "it" : "them"}.
        </p>
      ) : null}
      <ul className="portals">
        {portals.map((portal) => (
          <li key={portal.directoryName}>
            <strong>{portalTitle(portal.directoryName, portal.name)}</strong>
            <span className="muted"> {portal.enabled ? "Available to a worker" : "Turned off"}</span>
            {portal.personalUseOnly ? <span className="flag">Personal use only</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

async function loadPortals(): Promise<{ portals: PortalView[] | null; error: string | null }> {
  try {
    const portals = await getAdapter().listPortals();
    return {
      portals: portals.map((portal) => ({
        directoryName: portal.directoryName,
        name: portal.name,
        enabled: portal.enabled,
        personalUseOnly: portal.personalUseOnly,
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The core files could not be read.";
    return { portals: null, error: message };
  }
}
