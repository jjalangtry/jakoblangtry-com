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

## Build

```bash
pnpm build
pnpm preview
```