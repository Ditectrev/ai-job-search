import type { Metadata } from "next";
import { RunList } from "@/components/RunList";

export const metadata: Metadata = { title: "Run status" };

export default function RunsPage() {
  return (
    <>
      <h1>Run status</h1>
      <p className="lede">
        Runs wait here until a worker picks them up. This website does not run the writing steps,
        and it does not search job boards.
      </p>
      <section className="panel">
        <RunList />
      </section>
    </>
  );
}
