# Jakob Langtry's Personal Website

Terminal-style personal website with command-driven navigation.

## Tech Stack

- Astro
- Vanilla JavaScript (terminal runtime)
- CSS

## Local Development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Add an OpenWeatherMap key (optional for weather command):
   - Copy `.env.example` to `.env`
   - Set `OPENWEATHERMAP_API_KEY=...`
3. Run dev server:
   ```bash
   pnpm dev
   ```

## Editable Content

- Resume path: `public/data/site-config.json`
- Project/domain list: `public/data/projects.json`
- Canonical resume file location: `public/resume.pdf`

## Terminal Repository Browser

The `repo` command turns the site into a GitHub repository browser:

```bash
repo                  # list indexed repositories
repo --systems        # highlight systems-programming work
repo --lang C         # filter by language
repo --search unix    # search names/descriptions/URLs
repo NES-Pong         # show details
repo open 4           # open a repository
repo clone wordlehelper
```

Repository metadata lives in `public/data/projects.json` and is embedded into
the terminal at build time.

## Build

```bash
pnpm build
pnpm preview
```

## Quality Checks

Run the full local quality suite:

```bash
pnpm check
```

Individual commands:

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
```

## Git Hooks

This repository uses Husky + lint-staged:

- `pre-commit`: runs `lint-staged` on changed files
- `pre-push`: runs `pnpm check`

If hooks are not active locally, run:

```bash
pnpm prepare
```

## CI on Push

GitHub Actions runs on every push and executes jobs in parallel:

- Lint + format check
- Unit tests with coverage thresholds
- Production build

Railway auto-deploy remains independent and unchanged.
