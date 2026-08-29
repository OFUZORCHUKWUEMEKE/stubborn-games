# Deploying to Railway

Railway was chosen specifically because this app needs two things most serverless hosts (Vercel, Netlify) can't give it: a persistent disk (SQLite lives in a file, not a hosted database) and a long-running process that can shell out to a local CLI binary for live match data. Railway gives you both without any architecture changes.

## 1. Create the project

1. [railway.app](https://railway.app) → New Project → **Deploy from GitHub repo** → select `stubborn-games`.
2. Once the service is created, open its **Settings** tab and set **Root Directory** to `app` — the Next.js app lives in a subdirectory of this repo, not at the repo root. Without this, Railway will fail to find `package.json`.

`app/railway.json` (already in the repo) tells Railway how to build and start the app once the root directory is set correctly — you shouldn't need to touch build/start commands manually.

## 2. Attach a persistent volume (required — do this before the first real deploy)

SQLite writes to a single file. Railway's container filesystem is ephemeral — wiped on every redeploy or restart — so without a volume, every room ever created disappears the next time you ship a change.

1. In the service → **Volumes** → **New Volume**.
2. Mount path: `/data`.
3. Add an environment variable (next step) pointing the app at a file inside that mount.

## 3. Environment variables

Service → **Variables** → add:

| Variable | Value | Why |
|---|---|---|
| `DB_PATH` | `/data/squad-picks.db` | Points the app's SQLite file at the mounted volume instead of the ephemeral container disk |
| `LIVESCORE_CLI_PATH` | `/root/.local/bin/livescore-pp-cli` | Where the build step installs the live-score CLI (see below) — **verify this path on the first deploy**; if the app logs "score unavailable" for every match, check the build logs for where the installer actually placed the binary and update this variable to match |
| `API_FOOTBALL_URL` | `https://v3.football.api-sports.io` | Second-source confirmation — settlement won't complete without this configured (see main chat for current status) |
| `API_FOOTBALL_KEY` | *(your API-Football key)* | Same |

## 4. First deploy

Push to `main` (or click Deploy in the Railway dashboard) and watch the build logs. Two things specifically worth checking on the very first deploy, since neither has been verified against a real Railway container yet:

- **The live-score CLI install step** (`npx -y @mvanhorn/printing-press-library install livescore --cli-only`, in `railway.json`'s build command) — confirm it completes without error, and note the path it prints the binary to. If it doesn't match `LIVESCORE_CLI_PATH` above, update the variable and redeploy.
- **`better-sqlite3`'s native build step** — it compiles a C++ addon during install. Railway's Nixpacks Node image should have the necessary build tools already, but if the build fails here, that's the first place to look.

## 5. After it's live

Open the deployed URL, open a bet, confirm the room link it generates uses the real deployed domain (not `localhost`) — it's built from the incoming request's own host header, so this should just work, but worth a look on the first real bet.
