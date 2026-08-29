# Explicit Dockerfile instead of relying on Railway's auto-detection
# (Railpack/Nixpacks) finding the app in the app/ subdirectory — that
# depends on a "Root Directory" dashboard setting that wasn't taking
# effect reliably. This sidesteps directory-detection entirely: it's
# handed the whole repo and told exactly where the app lives and how
# to build it, no heuristics involved.

FROM node:22-bookworm

# better-sqlite3 compiles a native addon at install time and needs a
# C++ toolchain to do it — not present in the base Node image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10.17.1

WORKDIR /app

COPY app/package.json app/pnpm-lock.yaml app/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY app/ ./

# Live-score CLI: vendored directly (app/bin/livescore-pp-cli) rather
# than installed at build time. The obvious "official" path —
# `npx -y @mvanhorn/printing-press-library install livescore` — turned
# out not to work: this CLI was never actually published to that
# catalog, it's a private local build (verified by running the exact
# install command directly and getting "No Printing Press CLI found
# for livescore"). The binary itself is a plain Linux x86_64 static
# Go build, so vendoring it is simple and reliable — no toolchain,
# no network dependency, no unpublished-package surprise at deploy time.
RUN cp bin/livescore-pp-cli /usr/local/bin/livescore-pp-cli \
    && chmod +x /usr/local/bin/livescore-pp-cli \
    && /usr/local/bin/livescore-pp-cli doctor --dry-run

RUN pnpm build

ENV NODE_ENV=production
# On PATH at a standard location — LIVESCORE_CLI_PATH doesn't need to be
# set at all, but the code respects it if you want to point elsewhere.
EXPOSE 3000
CMD ["pnpm", "start"]
