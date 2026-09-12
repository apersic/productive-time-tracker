import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  jsonApiService,
  jsonApiTimeEntry,
  mockProductiveIdentity,
  mockServices,
  mockTimeEntries,
  mockTimeEntryDelete,
  mockTimers,
  openHome,
} from "./productive-mock";

test("login has no axe violations", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("reduced motion turns off smooth scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("home names the description field and row actions", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [
      jsonApiTimeEntry("entry-1"),
      jsonApiTimeEntry("entry-2", { serviceId: "svc-2" }),
    ],
    included: [jsonApiService(), jsonApiService("svc-2", "Design")],
  }));
  await openHome(page);
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("textbox", { name: "Description" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "More", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start timer for Development" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Start timer for Design" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "More actions for Development" }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "More actions for Design" }),
  ).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("invalid submit announces the error and moves focus", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page, [
    jsonApiService(),
    jsonApiService("svc-2", "Design"),
  ]);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({ data: [] }));
  await openHome(page);
  await page.getByRole("button", { name: "Add entry" }).click();
  await expect(page.getByText("Can't be blank").first()).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Fix the highlighted fields.",
  );
  await expect(page.getByRole("combobox", { name: "Service" })).toBeFocused();
});

test("edit has no axe violations", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveCount(1);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("login blank submit focuses the first invalid field", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Can't be blank").first()).toBeVisible();
  await expect(page.getByLabel("Organization ID")).toBeFocused();
});

test("keyboard can pick a service from the listbox", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page, [
    jsonApiService(),
    jsonApiService("svc-2", "Design"),
  ]);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({ data: [] }));
  await openHome(page);
  await page.getByRole("combobox", { name: "Service" }).focus();
  await page.keyboard.press("Enter");
  const search = page.getByRole("textbox", { name: "Search services" });
  await expect(search).toBeFocused();
  await page.keyboard.type("Des");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(page.getByRole("option", { name: "Design" })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Design" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("combobox", { name: "Service" })).toHaveText(
    "Design",
  );
});

test("delete dialog names the entry and returns focus", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry("entry-1")],
    included: [jsonApiService()],
  }));
  await mockTimeEntryDelete(page);
  await openHome(page);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "Delete this time entry?",
  });
  await expect(dialog).toContainText("Development");
  await page.getByRole("button", { name: "Delete entry" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByText("There's no tracked time", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Time entries" }),
  ).toBeFocused();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home sheet has no axe violations", async ({ page }) => {
    await mockProductiveIdentity(page);
    await mockServices(page, [
      jsonApiService(),
      jsonApiService("svc-2", "Design"),
    ]);
    await mockTimers(page);
    await mockTimeEntries(page, () => ({ data: [] }));
    await openHome(page);
    await page.getByRole("button", { name: "New time entry" }).click();
    await expect(
      page.getByRole("dialog", { name: "New time entry" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
