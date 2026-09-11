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
  await expect(page.locator('input[name="duration"]')).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "New time entry" }),
  ).toHaveCount(0);
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
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  expect(startedEntryId).toBe("entry-1");
  await page.getByRole("button", { name: "Stop" }).click();
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

async function openEntryDeleteConfirm(page: Page, entryId = "entry-1") {
  await page
    .locator(`[data-entry-id="${entryId}"]`)
    .getByRole("button", { name: "More" })
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
}

test("More Edit opens the prefilled form and Cancel leaves the row", async ({
  page,
}) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page);
  await openHome(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(page.locator('input[name="duration"]')).toHaveValue("01:30");
  await expect(page.locator(".note-editor .ProseMirror")).toContainText(
    "Wrote tests",
  );
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
});

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
  await page.getByRole("button", { name: "Confirm" }).click();
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
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Couldn't delete the time entry")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
});

test("a 403 delete keeps the session and the row", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page, () => ({ status: 403 }));
  await openHome(page);
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Couldn't delete the time entry")).toBeVisible();
  await expect(
    page.getByText("This time entry can't be deleted."),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Development" }),
  ).toBeVisible();
  expect(await storedCredentials(page)).not.toBeNull();
});

test("a 404 delete still removes the row", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page, () => ({ status: 404 }));
  await openHome(page);
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Time entry deleted")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Development" })).toHaveCount(
    0,
  );
});

test("deleting a running entry idles the timer", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page);
  await openHome(page);
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Time entry deleted")).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
});

test("deleting the last loaded row with more pages refills page 1", async ({
  page,
}) => {
  let deleted = false;
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => {
    if (deleted) {
      return {
        data: [jsonApiTimeEntry("entry-2")],
        included: [jsonApiService()],
      };
    }
    return {
      data: [jsonApiTimeEntry()],
      included: [jsonApiService()],
      links: {
        next: "https://api.productive.io/api/v2/time_entries?page=2",
      },
    };
  });
  await mockTimeEntryDelete(page, () => {
    deleted = true;
    return { status: 204 };
  });
  await page.route("**/api/v2/time_entries**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fallback();
      return;
    }
    const pageParam = new URL(route.request().url()).searchParams.get("page");
    if (pageParam !== "2") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 500,
      contentType: "application/vnd.api+json",
      body: "{}",
    });
  });
  await openHome(page);
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(page.locator('[data-entry-id="entry-1"]')).toHaveCount(1);
  await openEntryDeleteConfirm(page);
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Time entry deleted")).toBeVisible();
  await expect(page.locator('[data-entry-id="entry-1"]')).toHaveCount(0);
  await expect(page.locator('[data-entry-id="entry-2"]')).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the FAB opens a full-screen create modal", async ({ page }) => {
    let posted: unknown;
    await mockProductiveIdentity(page);
    await mockServices(page, [
      jsonApiService(),
      jsonApiService("svc-2", "Design"),
    ]);
    await mockTimers(page);
    await page.route("**/api/v2/time_entries**", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        posted = request.postDataJSON();
        await route.fulfill({
          ...jsonApiHeaders(),
          status: 201,
          body: JSON.stringify({
            ...createdEntryResponse(posted),
            included: [jsonApiService("svc-2", "Design")],
          }),
        });
        return;
      }
      await route.fulfill({
        ...jsonApiHeaders(),
        body: JSON.stringify(jsonApiEmptyList()),
      });
    });
    await openHome(page);
    const fab = page.getByRole("button", { name: "New time entry" });
    await expect(page.locator('input[name="duration"]')).toHaveCount(0);
    await expect(fab).toBeInViewport();
    await fab.click();
    const dialog = page.getByRole("dialog", { name: "New time entry" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
    await dialog.getByRole("combobox", { name: "Service" }).click();
    await page.getByRole("option", { name: "Design" }).click();
    await dialog.locator('input[name="duration"]').fill("1:30");
    const editor = dialog.locator(".note-editor .ProseMirror");
    await editor.click();
    await editor.pressSequentially("Wrote tests");
    await dialog.getByRole("button", { name: "Add entry" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Time entry added")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Design" })).toBeVisible();
    await expect(page.locator('input[name="duration"]')).toHaveCount(0);
    expect(jsonApiAttribute(posted, "time")).toBe(90);
    expect(jsonApiRelationshipId(posted, "service")).toBe("svc-2");
  });
});
