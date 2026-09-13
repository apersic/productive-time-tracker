import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  gate,
  jsonApiAttribute,
  jsonApiEmptyList,
  jsonApiRelationshipId,
  jsonApiService,
  jsonApiTask,
  jsonApiTimeEntry,
  localYmd,
  browserCalendarDayLabel,
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

async function expectDateFieldIsFullWidth(form: Locator) {
  const date = form.getByRole("textbox", { name: "Date" });
  await expect(date).toBeVisible();
  const formWidth = await form.evaluate(
    (el) => el.getBoundingClientRect().width,
  );
  const dateControlWidth = await date.evaluate((el) => {
    const control = el.closest("[data-part='control']");
    return (control ?? el).getBoundingClientRect().width;
  });
  expect(dateControlWidth).toBeGreaterThan(formWidth * 0.85);
  expect(formWidth - dateControlWidth).toBeLessThan(48);
}

async function openFormCalendar(form: Locator) {
  await form.getByRole("button", { name: "Open calendar" }).click();
}

async function pickCalendarDay(page: Page, name: string | RegExp) {
  const calendar = page.getByRole("application", { name: "calendar" });
  await expect(calendar).toBeVisible();
  await calendar.getByRole("button", { name }).click();
}

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
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  const duration = page.locator('input[name="duration"]');
  await expect(duration).toHaveValue("01:30");
  await duration.fill("2:00");
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
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(page.getByText("Couldn't update the time entry")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  expect(await storedCredentials(page)).not.toBeNull();
});

test("cold edit loads by id and unknown ids are not found", async ({
  page,
}) => {
  const listingGate = gate();
  let fetchedUrl = "";
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(
    page,
    (url) => {
      if (url.includes("filter[id]=entry-1")) {
        fetchedUrl = url;
        return {
          data: [jsonApiTimeEntry("entry-1")],
          included: [jsonApiService()],
        };
      }
      return jsonApiEmptyList();
    },
    { gate: listingGate },
  );
  await seedStoredCredentials(page);
  await page.goto("/edit/entry-1");
  await expect(
    page.getByRole("status", { name: "Loading time entry" }),
  ).toBeVisible();
  listingGate.open();
  await expect(page.locator('input[name="duration"]')).toHaveValue("01:30");
  expect(fetchedUrl).toContain("filter[id]=entry-1");
  await page.goto("/edit/nope");
  await expect(page.getByText("This time entry was not found.")).toBeVisible();
});

test("create form has a Date field", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({ data: [] }));
  await openHome(page);
  const createForm = page.locator("form");
  await expect(createForm.getByRole("textbox", { name: "Date" })).toBeVisible();
  await expectDateFieldIsFullWidth(createForm);
  const dayWidth = await page
    .getByRole("textbox", { name: "Day" })
    .evaluate((el) => {
      const control = el.closest("[data-part='control']");
      return (control ?? el).getBoundingClientRect().width;
    });
  const dateWidth = await createForm
    .getByRole("textbox", { name: "Date" })
    .evaluate((el) => {
      const control = el.closest("[data-part='control']");
      return (control ?? el).getBoundingClientRect().width;
    });
  expect(dayWidth).toBeLessThan(dateWidth);
});

test("saving a moved date patches that day and returns home", async ({
  page,
}) => {
  let patched: unknown;
  let listing = {
    data: [jsonApiTimeEntry("entry-1", { date: "2026-03-10", task })],
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
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  const firstLabel = page.locator("form label").first();
  await expect(firstLabel).toHaveText("Date");
  await openFormCalendar(page.locator("form"));
  await pickCalendarDay(
    page,
    await browserCalendarDayLabel(page, "2026-03-15"),
  );
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/");
  expect(jsonApiAttribute(patched, "date")).toBe("2026-03-15");
});

test("changing service then date keeps the picked service", async ({
  page,
}) => {
  let patched: unknown;
  let listing = {
    data: [jsonApiTimeEntry("entry-1", { date: "2026-03-10", task })],
    included: [jsonApiService(), jsonApiTask()],
  };
  await mockProductiveIdentity(page);
  await mockServices(page, [
    jsonApiService(),
    jsonApiService("svc-2", "Design"),
  ]);
  await mockTimers(page);
  await mockTimeEntries(page, () => listing);
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
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  const service = page.getByRole("combobox", { name: "Service" });
  await expect(service).toBeEnabled();
  await service.click();
  await page.getByRole("option", { name: "Design" }).click();
  await expect(page.getByRole("combobox", { name: "Service" })).toHaveText(
    "Design",
  );
  const movedDay = await browserCalendarDayLabel(page, "2026-03-15");
  await openFormCalendar(page.locator("form"));
  await pickCalendarDay(page, movedDay);
  await expect(page.getByRole("textbox", { name: "Date" })).toHaveValue(
    movedDay,
  );
  await expect(
    page.getByRole("button", { name: "Save changes" }),
  ).toBeEnabled();
  await expect(page.getByRole("combobox", { name: "Service" })).toHaveText(
    "Design",
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/");
  expect(jsonApiAttribute(patched, "date")).toBe("2026-03-15");
  expect(jsonApiRelationshipId(patched, "service")).toBe("svc-2");
});

test("changing only the date asks before discarding", async ({ page }) => {
  await mockEditListing(page, () => ({
    data: [jsonApiTimeEntry("entry-1", { date: "2026-03-10" })],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(page.getByRole("textbox", { name: "Date" })).toHaveValue(
    await browserCalendarDayLabel(page, "2026-03-10"),
  );
  await openFormCalendar(page.locator("form"));
  await pickCalendarDay(
    page,
    await browserCalendarDayLabel(page, "2026-03-15"),
  );
  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Discard unsaved changes?" }),
  ).toBeVisible();
});

test("Back to home asks before discarding edits", async ({ page }) => {
  await mockEditListing(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  const duration = page.locator('input[name="duration"]');
  await expect(duration).toHaveValue("01:30");
  await duration.fill("2:00");
  await page.getByRole("link", { name: "Back to home" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "Discard unsaved changes?",
  });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await page.getByRole("link", { name: "Back to home" }).click();
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page).toHaveURL("/");
});
