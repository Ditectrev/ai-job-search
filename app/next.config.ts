import type { NextConfig } from "next";
import path from "node:path";

const appDir = process.cwd();
const repoRoot = path.resolve(appDir, "..");

const coreMarkdown = ["../.claude/**/*.md", "../.agents/skills/**/SKILL.md"];
// The adapter is external to the Next bundle. Trace its compiled files or a
// Vercel function will not be able to load them (they sit outside app/).
const adapterRuntime = ["../adapter/dist/**/*.js"];
const coreAndAdapter = [...coreMarkdown, ...adapterRuntime];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The Vercel project root is this directory. The core checkout is its parent.
  outputFileTracingRoot: repoRoot,
  outputFileTracingIncludes: {
    "/api/profile": adapterRuntime,
    "/api/runs": coreAndAdapter,
    "/api/runs/scrape": coreAndAdapter,
    "/api/runs/apply": coreAndAdapter,
    "/api/runs/[id]": coreAndAdapter,
    "/jobs": coreAndAdapter,
  },
  // Keep the adapter on the Node server so it can read CORE_ROOT with fs.
  serverExternalPackages: ["@ai-job-search/adapter"],
};

export default nextConfig;
