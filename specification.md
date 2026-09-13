# About the Productive Time Tracker architecture

This specification records the frontend shape, the UI the product needs, how the browser talks to the Productive API, and the assumptions made where the assignment is silent.

## Frontend architecture

The app is a Vite 8 single-page app with React 19, TypeScript, and Chakra UI. `index.html` mounts `src/main.tsx`. That file wraps Chakra, React Router, and `AuthProvider`, then renders `App`.

Routes:

- `/login` is the login form.
- `/` is home. An anonymous, expired, or unavailable session redirects to `/login`.
- `/edit/:entryId` is the edit form for one time entry. The same unauthenticated sessions redirect to `/login`.
- An authenticated session on `/login` redirects to `/`.

Auth is a discriminated `Session` in `src/lib/auth/session.ts`:

- `booting` while stored credentials are checked
- `anonymous` when there is no valid session
- `expired` after a 401 or 403 on a later request. Login shows that the session ended.
- `unavailable` when stored credentials could not be verified because Productive was unreachable or returned a non-auth error. The token stays in `sessionStorage`.
- `authenticated` with `credentials` and `person`

Credentials are `{ organizationId, accessToken }`. They persist in `sessionStorage` under `productive-time-tracker.credentials` so a refresh keeps the user logged in. Restore clears that key only on HTTP 401 or 403. Network failures and invalid API payloads keep the stored token and send the user to login with an error. Log out removes that key and returns the session to `anonymous`, or to `expired` when logout was caused by a 401 or 403. Closing the tab clears `sessionStorage`.

`src/providers/productive` is the only module that speaks JSON:API. It parses responses into domain types. UI code does not read `data.attributes`.

The current person is resolved at login. `GET /users` with a personal token returns that user. `GET /people?filter[email]=` then returns the person record used on time entries. The login form does not ask who you are.

Create and edit send `person_id` from the authenticated person. The user does not pick a person.

## Main UI components

Chakra UI owns the visible controls. A skip link is the first focusable control and points at `main#main`.

- **Login form.** Organization ID and API token. Submit authenticates against Productive. Failure shows an error. Success stores credentials and opens home.
- **Home.** The person name is a menu that contains **Log out**. A day control defaults to today in the browser timezone. Wide layouts show the create form beside the list. Narrow layouts hide that form behind a **New time entry** button that opens a full-screen dialog.
- **Entry list.** Rows for the selected day. Each row shows duration, service name, optional project, optional task title, the note, and the entry's date in muted type at the bottom right. Play and stop drive Productive timers. More actions offer edit and delete. An empty day can copy tasks from the previous day. Further pages load by scrolling `links.next`.
- **Entry form.** Date, duration, a service picker, and a ProseMirror note. No person field. Date is full width on create and edit. Create Date is the same value as home's day control. Changing either moves the listing day. Edit has Date first.
- **Service picker.** A combobox that expands into company, project, deal, and section groups. Search calls Productive with `filter[query]`. One trackable service is selected automatically. A service that is already on an entry stays visible even when it is no longer bookable that day.
- **Delete action.** A confirm step before `DELETE`.
- **Edit.** `/edit/:entryId` reuses the same form. Save `PATCH`es duration, note, service, and date. Unsaved navigation warns in the browser.

## How the app talks to the Productive API

Productive is a JSON:API on `https://api.productive.io/api/v2`. Docs for time entries are at [Time Entries](https://developer.productive.io/reference/resources/time-entries). `env-example` names `VITE_BASE_URL`. The login form collects `organizationId` and `accessToken`. Those are not read from env at runtime.

Every request sends:

- `Content-Type: application/vnd.api+json`
- `X-Organization-Id` from the stored organization ID
- `X-Auth-Token` from the stored API token

Login:

- `GET /users` must succeed and return exactly one `users` resource. A personal token returns the current user.
- `GET /people?filter[email]=` must return exactly one `people` resource for that user's email.

Time entries:

- List the day with `GET /time_entries` filtered to the current person, drafts included, and that calendar date. Include `service,task,service.deal.project`. Follow `links.next`.
- Create with `POST /time_entries`. `person_id` is the authenticated person. Duration is `time` in minutes. Day is `date` from the form Date field. Description is `note` HTML. `service_id` is required.
- Edit with `PATCH /time_entries/{id}` for `time`, `note`, `service`, and `date`. The date comes from the form Date field.
- Delete with `DELETE /time_entries/{id}`.

Services:

- `GET /services` filtered to budgets and deals, time tracking enabled, the bookable date, and the current person. Optional `filter[query]` searches. Include `deal.company,deal.project.company,section.deal.project.company`.
- Sparse fieldsets ask only for ids, names, deal suffix, and the relationships the parser walks. `sort` still uses `section_position` and `position` on the server. Time totals, avatars, and organizations are not requested.

Timers use Productive's timer resources to start, stop, and recover a running timer on a time entry.

## Implementation decisions and tradeoffs

**Browser app, no backend.** Vite plus `fetch` matches the no-server rule. The API token lives in the browser after login. Do not add a proxy or BFF.

**localStorage, not sessionStorage.** A refresh must keep the session. Log out is the clear action. Closing the tab keeps the session until log out. The token is plaintext in `localStorage` because this app has no server.

**Content security policy.** `src/lib/document/csp.ts` builds two strings. Vite's dev and preview servers send the header, which includes `frame-ancestors 'none'`. The meta tag omits that directive because browsers ignore `frame-ancestors` in `http-equiv` and log an error. A static host of `dist/` must send the same header itself. UI text is not injected as HTML.

**Login fields.** Organization ID uses `autocomplete="username"`. The API token uses `autocomplete="current-password"` so a password manager can store the pair. That is not `off`.

**Chakra for UI, not a second design system on the login path.** Login, home, and edit use Chakra components.

**JSON:API stays behind one module.** Parse once. The UI sees `Session`, `Person`, `TimeEntry`, and `ServiceCatalog`.

**Person is not a form field.** The assignment says the person relationship is the current person. A people picker would contradict that.

**Service groups are display-only.** A stored entry keeps `{ id, name }`. Company, project, deal, and section exist so the picker can nest rows. They are not written back on create or patch.

## Assumptions

1. **The given day is user-selected.** The date control defaults to today and can move. Create's Date field is the selected listing day. Edit can move the entry to another day.
2. **Description is `note`.** Productive has no separate description field on a time entry. The editor stores HTML.
3. **Duration is minutes on the wire.** The form can show hours and minutes. Storage and API use `time`.
4. **A service is required to create.** Productive requires `service_id` on `POST /time_entries`. The picker loads bookable services for the selected day.
5. **A personal API token identifies one user.** `GET /users` must return exactly one `users` resource. Two rows is an error.
6. **Current person is the people row whose email matches the current user.** `filter[email]` must return exactly one `people` resource.
7. **Pagination follows `links.next`.** The list does not show a Load more button when more pages exist. Scrolling fetches the next page.
8. **Local timezone for today.** `date` sent to Productive is a calendar day in the browser timezone, not UTC.
9. **Edit can change duration, service, description, and date.** Person stays as it was.
10. **Delete is immediate after confirm.**
