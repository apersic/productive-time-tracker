import { expect, test, type Page } from "@playwright/test";
import {
  createdEntryResponse,
  jsonApiAttribute,
  jsonApiHeaders,
  jsonApiEmptyList,
  jsonApiRelationshipId,
  jsonApiService,
  jsonApiTimeEntry,
  localYmd,
  mockHomeApis,
  mockProductiveIdentity,
  mockServices,
  mockTimeEntries,
  mockTimers,
  openHome,
  seedStoredCredentials,
  STORAGE_KEY,
} from "./productive-mock";

async function storedCredentials(page: Page) {
  return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

test("guest visiting home is sent to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("login opens home, survives refresh, and logout clears it", async ({
  page,
}) => {
  await mockHomeApis(page);
  await page.goto("/login");
  await page.getByLabel("Organization ID").fill("61648");
  await page.getByLabel("API token").fill("token-value");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.getByRole("button", { name: "Ada Lovelace" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  expect(await storedCredentials(page)).toBeNull();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("a time entry shows the note, duration, and Play", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
  await expect(page.getByText("Wrote tests")).toBeVisible();
  await expect(page.locator(".entry-note li")).toHaveCount(1);
  await expect(page.getByText("01:30")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
});

test("creating an entry posts the form and shows the row", async ({ page }) => {
  let posted: unknown;
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await page.route("**/api/v2/time_entries**", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      posted = request.postDataJSON();
      await route.fulfill({
        ...jsonApiHeaders(),
        status: 201,
        body: JSON.stringify(createdEntryResponse(posted)),
      });
      return;
    }
    await route.fulfill({
      ...jsonApiHeaders(),
      body: JSON.stringify(jsonApiEmptyList()),
    });
  });
  await openHome(page);
  await page.locator('input[name="duration"]').fill("1:30");
  const editor = page.locator(".note-editor .ProseMirror");
  await editor.click();
  await editor.pressSequentially("Wrote tests");
  await expect(editor).toContainText("Wrote tests");
  await page.getByRole("button", { name: "Add entry" }).click();
  expect(jsonApiAttribute(posted, "note")).toBe("<p>Wrote tests</p>");
  expect(jsonApiAttribute(posted, "time")).toBe(90);
  expect(jsonApiAttribute(posted, "date")).toBe(localYmd(new Date()));
  expect(jsonApiRelationshipId(posted, "service")).toBe("svc-1");
  expect(jsonApiRelationshipId(posted, "person")).toBe("1439113");
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
  await expect(page.locator(".entry-note")).toContainText("Wrote tests");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("Time entry added")).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Time entry added" }),
  ).toBeVisible();
  await expect(page.locator('input[name="duration"]')).toHaveValue("");
  await expect(editor).toHaveClass(/is-empty/);
});

test("Play posts a timer and Pause stops it", async ({ page }) => {
  let startedEntryId: string | undefined;
  let stoppedTimerId: string | undefined;
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page, {
    onStart: (entryId) => {
      startedEntryId = entryId;
    },
    onStop: (timerId) => {
      stoppedTimerId = timerId;
    },
  });
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  expect(startedEntryId).toBe("entry-1");
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  expect(stoppedTimerId).toBe("timer-1");
});

test("restore keeps credentials when Productive is unreachable", async ({
  page,
}) => {
  await seedStoredCredentials(page);
  await page.route("**/api/v2/**", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "Could not reach Productive.",
  );
  expect(await storedCredentials(page)).not.toBeNull();
});

test("restore clears credentials on 401", async ({ page }) => {
  await seedStoredCredentials(page);
  await page.route("**/api/v2/**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/vnd.api+json",
      body: "{}",
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  expect(await storedCredentials(page)).toBeNull();
});
