# Job search website

A Next.js front door for people who should not have to edit the [ai-job-search](https://github.com/MadsLorentzen/ai-job-search) core. The Vercel project root is this `app/` directory.

The repository root **is** the core. There is no nested git submodule. `CORE_ROOT` defaults to the parent of `app/`.

## What a visitor can do

- Home — what this site is, and where the long work runs
- Profile — empty fields, saved for this site only
- Find jobs — queue a search; job boards are not contacted
- Start an application — paste a URL or the posting text; the URL is not opened
- Run status — see queued work

Sign-in and payments are not connected. `src/lib/extensions.ts` is the place to add them later. It does not charge anyone.

## Boundary

| Piece | Where it runs |
| --- | --- |
| This website | Vercel, root directory `app` |
| Skill markdown (`/scrape`, `/apply`, portal notes) | Read from `CORE_ROOT` at runtime. Not copied into this app. |
| Model, portal CLIs, LaTeX | A worker you control. Call `runQueued` from `adapter/`. The stub shipped here never spawns a process and never opens the network. |

Pulling maintainer updates is a normal `git pull` of this repository. Product code lives only under `app/` and `adapter/`, so it does not collide with the core files.

On Vercel the queue file is `/tmp`, which is not shared across instances. The browser also keeps the run it just created. A shared database replaces `RUN_STORE_PATH` when you need a durable queue.

## Scripts

npm is pinned with `packageManager` in `package.json`.

```bash
cd app
npm install
npm run build
npm start
```

`npm run build` compiles `adapter/` with this app's TypeScript, then runs `next build`.

Optional environment variables:

- `CORE_ROOT` — absolute path of the core checkout. Default: parent of `app/`.
- `RUN_STORE_PATH` — JSON file for the profile and the queue.

Do not put model API keys on this deployment. The website does not call a model.

## License notice

The core is MIT, copyright (c) 2026 Mads Lorentzen. See `NOTICE`.
