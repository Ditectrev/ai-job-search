import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Home" };

const actions = [
  {
    href: "/profile",
    title: "Profile",
    text: "Optional notes for a worker. Every field starts empty.",
  },
  {
    href: "/jobs",
    title: "Find jobs",
    text: "Queue a search. This page does not contact a job board.",
  },
  {
    href: "/apply",
    title: "Start an application",
    text: "Paste a link, the posting text, or both.",
  },
  {
    href: "/runs",
    title: "Run status",
    text: "See what is waiting. A worker picks it up later.",
  },
];

export default function HomePage() {
  return (
    <>
      <h1>A plain front door for your job search</h1>
      <p className="lede">
        Use this site to keep a few notes, ask for a search, or hand over a job posting. The
        instructions for finding roles and writing an application stay in the original project. A
        worker reads those files when it is time to do the long work.
      </p>
      <div className="cards">
        {actions.map((action) => (
          <Link className="card" href={action.href} key={action.href}>
            <strong>{action.title}</strong>
            <span>{action.text}</span>
          </Link>
        ))}
      </div>
      <section className="panel">
        <h2>Where the work runs</h2>
        <p>
          Vercel can host this website. It queues a request and stops there. Searching job boards,
          calling a model, and compiling a CV need a worker you control, pointed at the same
          project. Updating that project later does not require a change here.
        </p>
      </section>
    </>
  );
}
