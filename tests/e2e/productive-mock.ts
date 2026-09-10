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

export function jsonApiTimeEntry(
  id = "entry-1",
  extras?: {
    date?: string;
    time?: number;
    note?: string;
    task?: { id: string; title: string };
  },
) {
  return {
    id,
    type: "time_entries",
    attributes: {
      note: extras?.note ?? "<ul><li><p>Wrote tests</p></li></ul>",
      date: extras?.date ?? localYmd(new Date()),
      time: extras?.time ?? 90,
    },
    relationships: {
      service: { data: { type: "services", id: "svc-1" } },
      ...(extras?.task
        ? { task: { data: { type: "tasks", id: extras.task.id } } }
        : {}),
    },
  };
}

export function jsonApiTask(id = "task-1", title = "Ship edit") {
  return {
    id,
    type: "tasks",
    attributes: { title },
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

export function updatedEntryResponse(id: string, body: unknown) {
  const note = jsonApiAttribute(body, "note");
  const date = jsonApiAttribute(body, "date");
  const time = jsonApiAttribute(body, "time");
  const serviceId = jsonApiRelationshipId(body, "service") ?? "svc-1";
  const taskId = jsonApiRelationshipId(body, "task");
  return {
    data: {
      id,
      type: "time_entries",
      attributes: {
        note: typeof note === "string" ? note : "",
        date: typeof date === "string" ? date : localYmd(new Date()),
        time: typeof time === "number" ? time : 0,
      },
      relationships: {
        service: { data: { type: "services", id: serviceId } },
        ...(taskId ? { task: { data: { type: "tasks", id: taskId } } } : {}),
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
    failStart?: boolean;
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
      if (options?.failStart) {
        await route.fulfill({
          status: 500,
          contentType: "application/vnd.api+json",
          body: "{}",
        });
        return;
      }
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
    if (
      route.request().method() !== "GET" ||
      !isTimeEntriesCollection(route.request().url())
    ) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify(handler(route.request().url())),
    });
  });
}

function isTimeEntriesCollection(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "");
    return pathname.endsWith("/time_entries");
  } catch {
    return false;
  }
}

function timeEntryIdFromMemberUrl(url: string): string | undefined {
  try {
    const match = new URL(url).pathname.match(/\/time_entries\/([^/]+)$/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export async function mockTimeEntryDelete(
  page: Page,
  handler?: (id: string) => { status: number },
) {
  await page.route("**/api/v2/time_entries/**", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.fallback();
      return;
    }
    const id = timeEntryIdFromMemberUrl(route.request().url()) ?? "entry-1";
    const result = handler?.(id) ?? { status: 204 };
    await route.fulfill({
      status: result.status,
      contentType: "application/vnd.api+json",
      body: result.status === 204 ? "" : "{}",
    });
  });
}

export async function mockTimeEntryUpdate(
  page: Page,
  handler?: (id: string, body: unknown) => { status: number; body?: unknown },
) {
  await page.route("**/api/v2/time_entries/**", async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.fallback();
      return;
    }
    const id = timeEntryIdFromMemberUrl(route.request().url()) ?? "entry-1";
    const requestBody = route.request().postDataJSON();
    const result = handler?.(id, requestBody) ?? {
      status: 200,
      body: updatedEntryResponse(id, requestBody),
    };
    await route.fulfill({
      status: result.status,
      contentType: "application/vnd.api+json",
      body:
        result.body !== undefined
          ? JSON.stringify(result.body)
          : result.status === 204
            ? ""
            : "{}",
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
