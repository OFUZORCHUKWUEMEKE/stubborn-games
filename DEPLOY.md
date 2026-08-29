# Deploying to Railway

Railway was chosen because this app needs two things most serverless hosts (Vercel, Netlify) can't give it: a persistent disk (SQLite lives in a file, not a hosted database) and a long-running process that can shell out to a local CLI binary for live match data. Railway gives you both without any architecture changes.

Builds from the `Dockerfile` at the repo root — Railway auto-detects it and uses it directly, no build/start command configuration needed. This was **verified end to end on this machine**: built the image, ran the container with a mounted volume standing in for Railway's, and confirmed the home page, bet creation, room page, and the live-score CLI all work inside it before this was written.

## If you already set "Root Directory" to `app`, undo that

An earlier version of this doc had you set Root Directory to `app` (for a since-abandoned Nixpacks-based approach). The Dockerfile lives at the **repo root** and its `COPY` commands assume a repo-root build context — if Root Directory is still set to `app`, the build will fail. Service → Settings → clear Root Directory back to empty/default.

## 1. Create the project

[railway.app](https://railway.app) → New Project → **Deploy from GitHub repo** → select `stubborn-games`. Railway should detect the Dockerfile automatically and use it as the build method — nothing else to configure here.

## 2. Attach a persistent volume (required — do this before the first real deploy)

SQLite writes to a single file. Railway's container filesystem is ephemeral — wiped on every redeploy or restart — so without a volume, every room ever created disappears the next time you ship a change.

1. Service → **Volumes** → **New Volume**.
2. Mount path: `/data`.

## 3. Environment variables

Service → **Variables** → add:

| Variable | Value | Why |
|---|---|---|
| `DB_PATH` | `/data/squad-picks.db` | Points the app's SQLite file at the mounted volume instead of the ephemeral container disk |

That's the only one required to ship. Not needed:
- `LIVESCORE_CLI_PATH` — the CLI is vendored into the image at a standard location (`/usr/local/bin/livescore-pp-cli`), already on `PATH`. Only set this if you want to point at something else.
- `API_FOOTBALL_URL` / `API_FOOTBALL_KEY` — optional. Settlement works without them (settles on the primary live-score source alone). Add these later if you want the second-source confirmation safety net back.

## 4. Deploy

Push to `main` (or click Deploy in the Railway dashboard). The build runs `docker build` against the `Dockerfile` — expect a few minutes the first time (native `better-sqlite3` compile, Next.js build), faster on subsequent deploys via layer caching.

## 5. After it's live

Open the deployed URL, open a bet, confirm the room link it generates uses the real deployed domain (not `localhost`) — it's built from the incoming request's own host header, so this should just work, but worth a look on the first real bet.
