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
- Project/domain/repository catalog: `public/data/projects.json`
- Canonical resume file location: `public/resume.pdf`

## Terminal Repository Explorer

The site includes a terminal command surface for browsing source repositories:

```bash
repo                  # list the catalog
repo --systems        # focus C/Assembly/Shell/Rust-style systems work
repo --lang C         # filter by language
repo --search term    # search names, descriptions, languages, and URLs
repo <name|number>    # show source/live/clone details
repo open <name>      # open the source repository
repo clone <name>     # print a git clone command
```

The catalog is static and sourced from `public/data/projects.json`, which keeps
the website usable without GitHub API credentials at runtime.

## Terminal Filesystem

The terminal also exposes a read-only portfolio filesystem generated from the
same JSON content:

```bash
pwd                  # print the current path
ls                   # list files in the current directory
ls --commands        # list available terminal commands
cd projects          # move through portfolio directories
cat about.txt        # read generated files
tree repos           # inspect a directory recursively
```

The filesystem starts at `/home/guest` and supports relative paths, absolute
paths, `~`, `.`, and `..`.

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
