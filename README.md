# Productive Time Tracker

A React SPA. `/` renders the text `Home`. There is no Next.js.

## Run locally

Use Node 24. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:5173. You should see `Home`.

## Checks

Run these from the repo root:

- `npm run assert-spa` fails if `next` is a dependency or the package name is not `productive-time-tracker`.
- `npm run typecheck` type-checks the app, Vite config, and QUnit tests.
- `npm run lint` lints with oxlint.
- `npm run test` runs the QUnit unit tests.
- `npm run build` type-checks and writes `dist/`.
- `npm run test:e2e` runs Playwright against `/`.

On your machine, Playwright starts `npm run dev`. In CI it starts `npm run preview` after `npm run build`.
