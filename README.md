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

## Terminal Aliases

The browser terminal supports persistent shell-style aliases stored in
`localStorage`:

```bash
alias                     # list aliases
alias ll='ls'             # create an alias
alias systems='repo --systems'
alias findrepo='repo | grep terminal'
which systems             # show whether a name is an alias or built-in
unalias ll                # remove one alias
unalias -a                # remove all aliases
```

Aliases expand before command execution, preserve extra arguments, and include
loop protection for recursive definitions.

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
