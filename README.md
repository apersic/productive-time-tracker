# Productive Time Tracker

A React app that runs in the browser. You manage time entries for one day.

Each entry stores who worked, the duration, the day, and a multiline description of the work. You can create an entry, list the entries for the selected day, edit an entry, and delete an entry.

Frontend architecture, UI components, Productive API usage, and documented assumptions are in [specification.md](specification.md).

## Run locally

Use Node 24.

1. Copy `env-example` to `.env`.
2. Set `BASE_URL`, `ORGANIZATION_ID`, and `VITE_ACCESS_TOKEN`. Keep the real token in `.env` only. Do not commit it.
3. Install dependencies and start the dev server.

```bash
npm install
npm run dev
```

Open http://localhost:5173.

The running scaffold still renders the text `Home`. Time entry screens are specified in `specification.md` and are not built yet.

## Checks

Run these from the repo root:

- `npm run assert-spa` fails if `next` is a dependency or the package name is not `productive-time-tracker`.
- `npm run typecheck` type-checks the app, Vite config, and QUnit tests.
- `npm run lint` lints with oxlint.
- `npm run test` runs the QUnit unit tests.
- `npm run build` type-checks and writes `dist/`.
- `npm run test:e2e` installs Playwright's Chromium browsers if they are missing, then runs Playwright against `/`.

On your machine, Playwright starts `npm run dev`. In CI it starts `npm run preview` after `npm run build`. The first local `npm run test:e2e` downloads browser binaries.
