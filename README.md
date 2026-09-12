# Productive Time Tracker

A React app that runs in the browser. You log in with a Productive API token and organization ID, then manage time entries for one day.

Each new entry has duration, a service, and a multiline note. Edit can also change the date. The person on the entry is the logged-in user. You can create an entry, list the entries for the selected day, start and stop a timer, edit an entry, delete an entry, and copy tasks from the previous day.

Frontend architecture, UI components, Productive API usage, and documented assumptions are in [specification.md](specification.md).

## Run locally

Use Node 24.

1. Copy `env-example` to `.env`.
2. Set `VITE_BASE_URL` to `https://api.productive.io/api/v2`.
3. Install dependencies and start the dev server.

```bash
npm install
npm run dev
```

Open http://localhost:5173. You should see **Log in**. Enter the organization ID and API token. A successful login opens **Home**. Refresh keeps you logged in. If Productive is down during refresh, the stored token stays and login shows an error. **Log out** clears the stored credentials.

Do not commit `.env`. Tokens belong in the login form and in the browser's local storage, not in git.

## Checks

Run these from the repo root:

- `npm run typecheck` type-checks the app, Vite config, and QUnit tests.
- `npm run lint` lints with oxlint.
- `npm run test` runs the QUnit unit tests.
- `npm run build` type-checks and writes `dist/`.
- `npm run test:e2e` installs Playwright's Chromium browsers if they are missing, then runs Playwright against `/`.

On your machine, Playwright starts `npm run dev`. In CI it starts `npm run preview` after `npm run build`. The first local `npm run test:e2e` downloads browser binaries. Guest redirect, mocked login, and restore behavior run without secrets.
