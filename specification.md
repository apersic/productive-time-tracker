# About the Productive Time Tracker architecture

This specification records the frontend shape, the UI the product needs, how the browser talks to the Productive API, and the assumptions made where the assignment is silent.

## Frontend architecture

The app is a Vite 8 single-page app with React 19, TypeScript, and Chakra UI. There is no Next.js server and no API route in this repo. `index.html` mounts `src/main.tsx`. That file wraps Chakra, React Router, and `AuthProvider`, then renders `App`.

Routes:

- `/login` is the login form.
- `/` is home. An anonymous session redirects to `/login`.
- An authenticated session on `/login` redirects to `/`.

Auth is a discriminated `Session` in `src/lib/auth/session.ts`:

- `booting` while stored credentials are checked
- `anonymous` when there is no valid session
- `unavailable` when stored credentials could not be verified because Productive was unreachable or returned a non-auth error. The token stays in `localStorage`.
- `authenticated` with `credentials` and `person`

Credentials are `{ organizationId, accessToken }`. They persist in `localStorage` under `productive-time-tracker.credentials` so a refresh keeps the user logged in. Restore clears that key only on HTTP 401 or 403. Network failures and invalid API payloads keep the stored token and send the user to login with an error. Log out removes that key and returns the session to `anonymous`.

`src/lib/productive` is the only module that speaks JSON:API. It parses responses into domain types. UI code does not read `data.attributes`.

The current person is resolved at login. `GET /users` with a personal token returns that user. `GET /people?filter[email]=` then returns the person record used on time entries. The login form does not ask who you are.

Time entry create in the UI has duration, date, and description only. Creates send `person_id` from the authenticated person. The user does not pick a person.

## Main UI components

Chakra UI owns the visible controls.

- **Login form.** Organization ID and API token. Submit authenticates against Productive. Failure shows an error. Success stores credentials and opens home.
- **Home.** Shows that the user is signed in, the current person name, and **Log out**.
- **Day control.** A date input. Default is today in the browser's local timezone. Planned for the time-entry screen.
- **Entry list.** Rows for the selected day. Duration and description. Who worked is the current person, not a column the user edits.
- **Entry form.** Duration, date, and a textarea for description. No person field.
- **Delete action.** A confirm step before `DELETE`.

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

- List the day with `GET /time_entries?filter[date]=YYYY-MM-DD`.
- Create with `POST /time_entries`. `person_id` is the authenticated person. Duration is `time` in minutes. Day is `date`. Description is `note`.
- Edit with `PATCH /time_entries/{id}`.
- Delete with `DELETE /time_entries/{id}`.

`POST /time_entries` also requires `service_id`. The assignment does not mention a service. See assumptions.

## Implementation decisions and tradeoffs

**Browser app, no backend.** Vite plus `fetch` matches the no-server rule. The API token lives in the browser after login. Do not add a proxy or BFF.

**localStorage, not sessionStorage.** A refresh must keep the session. Log out is the clear action. Closing the tab keeps the session until log out. The token is plaintext in `localStorage` because this app has no server. A content security policy limits scripts, connections, and framing. UI text is not injected as HTML.

**Login fields are not a password-manager account.** Organization ID and API token use `autocomplete="off"` so the browser does not treat the token as the Productive website password.

**Chakra for UI, not a second design system on the login path.** Login and home use Chakra components.

**JSON:API stays behind one module.** Parse once. The UI sees `Session` and `Person`.

**Person is not a form field.** The assignment says the person relationship is the current person. A people picker would contradict that.

## Assumptions

1. **The given day is user-selected.** The date control defaults to today and can move.
2. **Description is `note`.** Productive has no separate description field on a time entry.
3. **Duration is minutes on the wire.** The form can show hours and minutes. Storage and API use `time`.
4. **A service is required to create.** Productive requires `service_id` on `POST /time_entries`. The app will load services or use a configured default when time-entry create is built.
5. **A personal API token identifies one user.** `GET /users` must return exactly one `users` resource. Two rows is an error.
6. **Current person is the people row whose email matches the current user.** `filter[email]` must return exactly one `people` resource.
7. **No pagination in the first UI.** If a day has more than one Productive page of entries, the client follows `links.next`.
8. **Local timezone for today.** `date` sent to Productive is a calendar day in the browser timezone, not UTC.
9. **Edit can change duration, date, and description.** Person stays the current person.
10. **Delete is immediate after confirm.**
