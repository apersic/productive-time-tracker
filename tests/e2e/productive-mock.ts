import { expect, type Page } from "@playwright/test";
import { isRecord } from "../../src/lib/helpers/is-record";

export const STORAGE_KEY = "productive-time-tracker.credentials";

export function jsonApiHeaders() {
  return { status: 200, contentType: "application/vnd.api+json" };
}

function jsonApiUser() {
  return {
    data: {
      id: "9",
      type: "users",
      attributes: { email: "ada@example.com" },
    },
  };
}

function jsonApiPerson() {
  return {
    data: {
      id: "1439113",
      type: "people",
      attributes: { first_name: "Ada", last_name: "Lovelace" },
    },
  };
}

export function jsonApiEmptyList() {
  return { data: [] };
}

export function jsonApiService(id = "svc-1", name = "Development") {
  return {
    id,
    type: "services",
    attributes: { name },
  };
}

export function localYmd(date: Date): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function jsonApiTimeEntry() {
  return {
    id: "entry-1",
    type: "time_entries",
    attributes: {
      note: "<ul><li><p>Wrote tests</p></li></ul>",
      date: localYmd(new Date()),
      time: 90,
    },
    relationships: {
      service: { data: { type: "services", id: "svc-1" } },
    },
  };
}

export function jsonApiAttribute(body: unknown, key: string): unknown {
  if (
    !isRecord(body) ||
    !isRecord(body.data) ||
    !isRecord(body.data.attributes)
  ) {
    return undefined;
  }
  return body.data.attributes[key];
}

export function jsonApiRelationshipId(
  body: unknown,
  name: string,
): string | undefined {
  if (
    !isRecord(body) ||
    !isRecord(body.data) ||
    !isRecord(body.data.relationships)
  ) {
    return undefined;
  }
  const rel = body.data.relationships[name];
  if (
    !isRecord(rel) ||
    !isRecord(rel.data) ||
    typeof rel.data.id !== "string"
  ) {
    return undefined;
  }
  return rel.data.id;
}

export function createdEntryResponse(body: unknown) {
  const note = jsonApiAttribute(body, "note");
  const date = jsonApiAttribute(body, "date");
  const time = jsonApiAttribute(body, "time");
  const serviceId = jsonApiRelationshipId(body, "service") ?? "svc-1";
  return {
    data: {
      id: "entry-created",
      type: "time_entries",
      attributes: {
        note: typeof note === "string" ? note : "",
        date: typeof date === "string" ? date : localYmd(new Date()),
        time: typeof time === "number" ? time : 0,
      },
      relationships: {
        service: { data: { type: "services", id: serviceId } },
      },
    },
    included: [jsonApiService(serviceId)],
  };
}

export async function mockProductiveIdentity(page: Page) {
  await page.route("**/api/v2/users**", async (route) => {
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify(jsonApiUser()),
    });
  });
  await page.route("**/api/v2/people**", async (route) => {
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify(jsonApiPerson()),
    });
  });
}

export async function mockServices(
  page: Page,
  data: unknown[] = [jsonApiService()],
) {
  await page.route("**/api/v2/services**", async (route) => {
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify({ data }),
    });
  });
}

export async function mockTimers(
  page: Page,
  options?: {
    onStart?: (entryId: string) => void;
    onStop?: (timerId: string) => void;
  },
) {
  await page.route("**/api/v2/timers**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const entryId = jsonApiRelationshipId(
        request.postDataJSON(),
        "time_entry",
      );
      options?.onStart?.(entryId ?? "entry-1");
      await route.fulfill({
        ...jsonApiHeaders(),
        body: JSON.stringify({
          data: {
            id: "timer-1",
            type: "timers",
            attributes: {
              started_at: new Date().toISOString(),
              stopped_at: null,
            },
            relationships: {
              time_entry: {
                data: { type: "time_entries", id: entryId ?? "entry-1" },
              },
            },
          },
        }),
      });
      return;
    }
    if (request.method() === "PATCH") {
      const timerId = timerIdFromStopUrl(request.url());
      options?.onStop?.(timerId ?? "timer-1");
      await route.fulfill({
        ...jsonApiHeaders(),
        body: JSON.stringify({
          data: {
            id: timerId ?? "timer-1",
            type: "timers",
          },
        }),
      });
      return;
    }
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify(jsonApiEmptyList()),
    });
  });
}

function timerIdFromStopUrl(url: string): string | undefined {
  try {
    const match = new URL(url).pathname.match(/\/timers\/([^/]+)\/stop$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

export async function mockTimeEntries(
  page: Page,
  handler: (url: string) => unknown,
) {
  await page.route("**/api/v2/time_entries**", async (route) => {
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify(handler(route.request().url())),
    });
  });
}

export async function mockHomeApis(page: Page) {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => jsonApiEmptyList());
}

export async function seedStoredCredentials(page: Page) {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          organizationId: "61648",
          accessToken: "token-value",
        }),
      );
    },
    { key: STORAGE_KEY },
  );
}

export async function openHome(page: Page) {
  await seedStoredCredentials(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}
