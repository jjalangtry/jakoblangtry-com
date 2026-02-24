# AGENTS.md

## Cursor Cloud specific instructions

This is a static Astro portfolio site with a terminal-style CLI interface. There is a single service — the Astro dev server.

### Running the application

- `pnpm dev` starts the Astro dev server on port 4321 (hot-reloading enabled).
- The `predev` script auto-generates `public/env.js` from `.env` (OpenWeatherMap API key); the site works fine without this key — only the `weather` terminal command requires it.

### Key commands

See `package.json` scripts. Quick reference:

| Task                                      | Command              |
| ----------------------------------------- | -------------------- |
| Lint                                      | `pnpm lint`          |
| Format check                              | `pnpm format:check`  |
| Tests                                     | `pnpm test`          |
| Tests + coverage                          | `pnpm test:coverage` |
| Full check (lint + format + test + build) | `pnpm check`         |
| Build                                     | `pnpm build`         |
| Dev server                                | `pnpm dev`           |

### Git hooks (Husky)

- **pre-commit**: runs `pnpm lint-staged` (ESLint + Prettier on staged files).
- **pre-push**: runs `pnpm check` (full lint + format + test:coverage + build).

### Non-obvious notes

- The `astro` dependency is pinned to `latest` in `package.json`; `pnpm install` may pull a newer version than in the lockfile if the lockfile is stale.
- No backend, database, or Docker required. Everything is client-side.
- `pnpm approve-builds` is interactive and must NOT be run in non-interactive environments. Build scripts for `esbuild` and `sharp` are skipped by default but the project builds and runs successfully without them.
