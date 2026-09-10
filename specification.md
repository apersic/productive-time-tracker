# About the Productive Time Tracker architecture

This specification records the frontend shape, the UI the product needs, how the browser talks to the Productive API, and the assumptions made where the assignment is silent. The running app still renders `Home` in `src/App.tsx`. The decisions below are the ones the time-entry UI should follow.

## Frontend architecture

The app is a Vite 8 single-page app with React 19 and TypeScript. There is no Next.js server, no App Router, and no API route in this repo. `index.html` mounts `src/main.tsx`, which renders `App`.

Code is grouped by ownership, not by load-validate-save steps:

- `src/lib/templates` holds layout shells such as `Container`.
- `src/lib/helpers` holds pure helpers (`cn`, `debounce`, `throttle`).
- `src/lib/hooks` holds DOM hooks.
- A future `src/lib/productive` module is the only place that speaks JSON:API. It parses responses into a domain `TimeEntry` at that boundary. UI code does not read `data.attributes`.

The domain type the UI owns is one record, not a bag of optional fields:

- `id` after the API has created the row
- `personId` and a display name for who worked
- `date` as an ISO calendar day (`YYYY-MM-DD`)
- `durationMinutes` as a positive integer
- `description` as the multiline note

Create uses the same fields without `id`. Edit and delete require `id`. That keeps "not saved yet" and "saved" from looking the same to the type checker.

App state is the selected day plus the list of entries for that day. The list is refetched after a successful create, edit, or delete. The server is the source of truth. There is no local cache that can disagree with Productive after a mutation.

## Main UI components

The product is one screen. The selected day is the filter, not a route.

- **Day control.** A date input. Default is today in the browser's local timezone. Changing the day reloads the list.
- **Entry list.** Rows for the selected day. Each row shows who worked, duration, and a short preview of the description. Empty state is a sentence, not a blank table.
- **Entry form.** Used for create and edit. Fields are who worked, duration, day, and a textarea for the description. Submit creates or patches. Cancel closes the form.
- **Delete action.** A confirm step before `DELETE`. No silent row removal.

`Container` stays the page shell. The form and the list are sibling sections on the same page so create and review do not require navigation.

## How the app talks to the Productive API

Productive is a JSON:API on `https://api.productive.io/api/v2`. Docs for time entries are at [Time Entries](https://developer.productive.io/reference/resources/time-entries). `env-example` names `BASE_URL`, `ORGANIZATION_ID`, and `VITE_ACCESS_TOKEN`. Copy that file to `.env` and fill in real values. `.env` is gitignored.

Every request sends:

- `Content-Type: application/vnd.api+json`
- `X-Organization-Id` from `ORGANIZATION_ID`
- `X-Auth-Token` from `VITE_ACCESS_TOKEN`

The assignment fields map onto the API as follows:

- Who worked is the `person` relationship. Creates send `person_id`.
- Duration is the `time` attribute, in minutes.
- Day is the `date` attribute, as `YYYY-MM-DD`.
- Description is the `note` attribute.

CRUD against time entries:

- List the day with `GET /time_entries?filter[date]=YYYY-MM-DD&include=person`.
- Create with `POST /time_entries`.
- Edit with `PATCH /time_entries/{id}`.
- Delete with `DELETE /time_entries/{id}`.

People for the "who worked" control come from `GET /people`. Duration in the form is hours and minutes. The client converts that pair to minutes before `time` is sent.

`POST /time_entries` also requires `service_id`. The assignment does not mention a service. See assumptions.

Vite only exposes env vars that start with `VITE_` to browser code. `VITE_ACCESS_TOKEN` in `.env` will not reach `import.meta.env` until it is renamed or duplicated as a `VITE_` name when the API client lands. Until then `.env` stays gitignored and is not a public config format.

## Implementation decisions and tradeoffs

**Browser app, no backend.** The assignment asks for a client-side web application. Vite plus `fetch` matches that. The cost is that `VITE_ACCESS_TOKEN` exists in the browser as `X-Auth-Token`. That is acceptable for a local assignment app with a gitignored `.env`. It is not acceptable as a public deployment. Do not add a fake BFF in this repo to hide that.

**Direct Productive calls, not a mock.** Time entries must round-trip to the real API. If the browser is blocked by CORS, the fallback is a Vite dev-server proxy to `BASE_URL`, still with `VITE_ACCESS_TOKEN` on the machine that runs `npm run dev`. The proxy is a CORS workaround, not a new product server. Do not add it unless a browser call fails. The assignment forbids server-side technology.

**JSON:API stays behind one module.** Spreading `data.attributes` through components would leak Productive's document shape into the UI. Parse once. The UI sees `TimeEntry`.

**Day-scoped list, not a timesheet grid.** "The given day" is one date the user picks. The app does not show a week grid and does not implement timers, approval, or invoicing.

## Assumptions

These are the gaps in the assignment and the calls this repo makes.

1. **The given day is user-selected.** There is no implied "today only" lock. The date control defaults to today and can move.
2. **Description is `note`.** Productive has no separate description field on a time entry.
3. **Duration is minutes on the wire.** The form can show hours and minutes. Storage and API use `time`.
4. **A service is required to create.** Productive requires `service_id` on `POST /time_entries`. The assignment does not. The app will load services with `GET /services` and require the user to pick one, or it will use a single `VITE_SERVICE_ID` if that env var is set. Prefer the picker when more than one service exists. Document the chosen service in the UI so a create is not a hidden side effect.
5. **Auth is `VITE_ACCESS_TOKEN`, not a login screen.** `env-example` has a placeholder. Put the real token in `.env`. The API client sends it as `X-Auth-Token`. Do not commit `.env`.
6. **Organization is an env id, not a picker.** One org per `.env`.
7. **No pagination in the first UI.** If a day has more than one Productive page of entries, the client follows `links.next` until the day is complete. The UI still looks like one list.
8. **Local timezone for "today".** `date` sent to Productive is a calendar day in the browser timezone, not UTC.
9. **Edit can change person, duration, day, description, and service.** Moving an entry to another day removes it from the current list after save.
10. **Delete is immediate after confirm.** There is no undo beyond creating a new entry.
