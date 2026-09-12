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
  mockTimeEntryDelete,
  mockTimers,
  openHome,
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
  await expect(page.getByRole("textbox", { name: "Description" })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("button", { name: "New time entry" }),
  ).toHaveCount(0);
  await page.getByLabel("Duration").fill("1:30");
  const editor = page.getByRole("textbox", { name: "Description" });
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

test("Play posts a timer and Stop stops it", async ({ page }) => {
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
  await page.getByRole("button", { name: /Start timer for/ }).click();
  await expect(
    page.getByRole("button", { name: /Stop timer for/ }),
  ).toBeVisible();
  expect(startedEntryId).toBe("entry-1");
  await page.getByRole("button", { name: /Stop timer for/ }).click();
  await expect(
    page.getByRole("button", { name: /Start timer for/ }),
  ).toBeVisible();
  expect(stoppedTimerId).toBe("timer-1");
});

test("login 401 stays on login with invalid token copy", async ({ page }) => {
  await page.route("**/api/v2/**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/vnd.api+json",
      body: "{}",
    });
  });
  await page.goto("/login");
  await page.getByLabel("Organization ID").fill("61648");
  await page.getByLabel("API token").fill("bad-token");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveText(
    "Invalid token or organization ID.",
  );
});

async function openEntryDeleteConfirm(page: Page, entryId = "entry-1") {
  await page
    .locator(`[data-entry-id="${entryId}"]`)
    .getByRole("button", { name: /More actions for/ })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
}

test("Confirm deletes the row and shows a success toast", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page);
  await openHome(page);
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Delete entry" }).click();
  await expect(page.getByText("Time entry deleted")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development" })).toHaveCount(
    0,
  );
  await expect(page.getByText(/There's no tracked time for/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy tasks from previous day" }),
  ).toHaveCount(0);
});

test("a 500 delete keeps the row and shows an error toast", async ({
  page,
}) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page, () => ({ status: 500 }));
  await openHome(page);
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Delete entry" }).click();
  await expect(page.getByText("Couldn't delete the time entry")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
});

test("opening the service list does not show a blank warning", async ({
  page,
}) => {
  await mockProductiveIdentity(page);
  await mockServices(page, [
    jsonApiService(),
    jsonApiService("svc-2", "Design"),
  ]);
  await mockTimers(page);
  await mockTimeEntries(page, () => jsonApiEmptyList());
  await openHome(page);
  const combobox = page.getByRole("combobox", { name: "Service" });
  await combobox.click();
  await expect(page.getByRole("option", { name: "Design" })).toBeVisible();
  await expect(page.getByText("Can't be blank")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.locator('input[name="duration"]').fill("1:30");
  await page.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByText("Can't be blank")).toBeVisible();
});
