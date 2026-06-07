# Jakob Langtry's Personal Website

Terminal-style personal website with command-driven navigation.

## Terminal Virtual Filesystem

The terminal now exposes a read-only portfolio filesystem generated from the
same JSON data that powers the site:

```bash
pwd                         # print the current virtual directory
ls                          # list generated files and folders
ls -la projects             # long listing, including hidden files with -a
cd projects                 # update the prompt path
cat link-converter.txt      # read generated project details
ls --commands               # show the command catalog
```

The filesystem starts at `/home/guest` and includes generated `projects/`,
`repos/`, `skills/`, `experience/`, and `blog/` directories.

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
