import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Job search", template: "%s · Job search" },
  description: "A simple website for queueing a job search or an application. The writing steps stay in the core project.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap">
          <header className="site-header">
            <Link className="brand" href="/">
              Job search
            </Link>
            <nav aria-label="Main">
              <Link href="/profile">Profile</Link>
              <Link href="/jobs">Find jobs</Link>
              <Link href="/apply">Start an application</Link>
              <Link href="/runs">Run status</Link>
            </nav>
          </header>
          <main>{children}</main>
          <footer className="site-footer">
            Sign-in and payments are not connected. This site does not write into the core project files.
          </footer>
        </div>
      </body>
    </html>
  );
}
