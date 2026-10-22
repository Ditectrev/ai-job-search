# Adapter

TypeScript package that sits beside the [ai-job-search](https://github.com/MadsLorentzen/ai-job-search) core.

The repository root **is** the core. This package does not vendor a second copy and it does not add a git submodule. Set `CORE_ROOT` to that checkout. When `CORE_ROOT` is unset, the default is the parent of `adapter/` and of `app/` (the repository root).

## What it does

- Reads skill and command markdown from `CORE_ROOT` at runtime. The `/apply` and `/scrape` instructions stay in those files.
- Queues a scrape or an application (`enqueueScrape`, `enqueueApply`).
- Exposes `runQueued` for a worker process. The included model and shell are stubs: they typecheck and unit-test with no API key and no network. The stub records `search --format json` for enabled portals and does not spawn `bun`, fetch a URL, or compile LaTeX.

A real worker replaces `ModelClient` and `ShellRunner`. It should hand the skill text to the model with tools. It should not reimplement the methodology in TypeScript.

## Tests

```bash
cd adapter
npm install
npm test
```

The tests read this checkout. They do not contact job boards.

## License notice

The core is MIT, copyright (c) 2026 Mads Lorentzen. See `NOTICE`.
