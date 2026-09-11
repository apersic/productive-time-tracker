import { expect, test, type Page } from "@playwright/test";
import {
  gate,
  jsonApiAttribute,
  jsonApiRelationshipId,
  jsonApiService,
  jsonApiTask,
  jsonApiTimeEntry,
  jsonApiEmptyList,
  localYmd,
  mockProductiveIdentity,
  mockServices,
  mockTimers,
  mockTimeEntries,
  mockTimeEntryUpdate,
  openHome,
  seedStoredCredentials,
  STORAGE_KEY,
  updatedEntryResponse,
} from "./productive-mock";

async function storedCredentials(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

const task = { id: "task-1", title: "Ship edit" };

async function mockEditListing(page: Page, listing: () => unknown) {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => listing());
}

test("saving patches the entry and returns home with a toast", async ({
  page,
}) => {
  let patched: unknown;
  let listing = {
    data: [jsonApiTimeEntry("entry-1", { task })],
    included: [jsonApiService(), jsonApiTask()],
  };
  await mockEditListing(page, () => listing);
  await mockTimeEntryUpdate(page, (id, body) => {
    patched = body;
    const response = updatedEntryResponse(id, body);
    listing = {
      data: [response.data],
      included: response.included,
    };
    return { status: 200, body: response };
  });
  await openHome(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await page.locator('input[name="duration"]').fill("2:00");
  const editor = page.locator(".note-editor .ProseMirror");
  await editor.click();
  await editor.press("Control+A");
  await editor.pressSequentially("Updated note");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/");
  expect(jsonApiAttribute(patched, "date")).toBe(localYmd(new Date()));
  expect(jsonApiAttribute(patched, "time")).toBe(120);
  expect(jsonApiAttribute(patched, "note")).toBe("<p>Updated note</p>");
  expect(jsonApiRelationshipId(patched, "service")).toBe("svc-1");
  expect(jsonApiRelationshipId(patched, "person")).toBe("1439113");
  expect(jsonApiRelationshipId(patched, "task")).toBe("task-1");
  await expect(page.getByText("Time entry updated")).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Time entry updated" }),
  ).toBeVisible();
  await expect(page.getByText("Updated note")).toBeVisible();
  await expect(page.getByText("02:00")).toBeVisible();
});

test("PATCH 500 stays on edit and keeps the session", async ({ page }) => {
  await mockEditListing(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryUpdate(page, () => ({ status: 500 }));
  await openHome(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(page.getByText("Couldn't update the time entry")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  expect(await storedCredentials(page)).not.toBeNull();
});

test("PATCH 403 stays on edit without logging out", async ({ page }) => {
  await mockEditListing(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryUpdate(page, () => ({ status: 403 }));
  await openHome(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(page.getByText("Couldn't update the time entry")).toBeVisible();
  await expect(
    page.getByText("This time entry can't be updated."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  expect(await storedCredentials(page)).not.toBeNull();
});

test("cold /edit/entry-1 shows a skeleton until the gate opens", async ({
  page,
}) => {
  const load = gate();
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(
    page,
    () => ({
      data: [jsonApiTimeEntry()],
      included: [jsonApiService()],
    }),
    { gate: load },
  );
  await seedStoredCredentials(page);
  await page.goto("/edit/entry-1");
  await expect(
    page.getByRole("status", { name: "Loading time entry" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Back to home" }),
  ).toBeVisible();
  await expect(page.locator('input[name="duration"]')).toHaveCount(0);
  load.open();
  await expect(page.locator('input[name="duration"]')).toHaveValue("01:30");
  await expect(
    page.getByRole("status", { name: "Loading time entry" }),
  ).toHaveCount(0);
});

test("cold /edit/entry-1 prefills via GET filter", async ({ page }) => {
  let filterId: string | null = null;
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, (url) => {
    filterId = new URL(url).searchParams.get("filter[id]");
    return {
      data: [jsonApiTimeEntry()],
      included: [jsonApiService()],
    };
  });
  await seedStoredCredentials(page);
  await page.goto("/edit/entry-1");
  await expect(page.locator('input[name="duration"]')).toHaveValue("01:30");
  await expect(page.locator(".note-editor .ProseMirror")).toContainText(
    "Wrote tests",
  );
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
  expect(filterId).toBe("entry-1");
});

test("an illegal or unknown id shows not-found copy", async ({ page }) => {
  await mockEditListing(page, () => jsonApiEmptyList());
  await seedStoredCredentials(page);
  await page.goto("/edit/%20");
  await expect(page.getByText("This time entry was not found.")).toBeVisible();
  await page.goto("/edit/nope");
  await expect(page.getByText("This time entry was not found.")).toBeVisible();
});

test("saving a past-day entry returns home on that day", async ({ page }) => {
  const past = "2026-09-01";
  let listing = {
    data: [jsonApiTimeEntry("entry-1", { date: past })],
    included: [jsonApiService()],
  };
  await mockEditListing(page, () => listing);
  await mockTimeEntryUpdate(page, (id, body) => {
    const response = updatedEntryResponse(id, body);
    listing = {
      data: [response.data],
      included: response.included,
    };
    return { status: 200, body: response };
  });
  await seedStoredCredentials(page);
  await page.goto("/edit/entry-1");
  await expect(page.locator('input[name="duration"]')).toHaveValue("01:30");
  await page.locator('input[name="duration"]').fill("2:00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator('input[name="day"]')).toHaveValue(past);
  await expect(page.getByText("02:00")).toBeVisible();
});
