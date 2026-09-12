import { expect, test, type Page } from "@playwright/test";
import {
  jsonApiService,
  jsonApiTask,
  jsonApiTimeEntry,
  mockProductiveIdentity,
  mockServices,
  mockTimeEntries,
  mockTimers,
  openHome,
} from "./productive-mock";

function collectPageFaults(page: Page) {
  const faults: string[] = [];
  page.on("pageerror", (error) => {
    faults.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      faults.push(`console.error: ${message.text()}`);
    }
  });
  return faults;
}

test("login does not throw or console.error", async ({ page }) => {
  const faults = collectPageFaults(page);
  const response = await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(faults).toEqual([]);
});

test("home, service picker, and edit do not throw or console.error", async ({
  page,
}) => {
  const faults = collectPageFaults(page);
  await mockProductiveIdentity(page);
  await mockServices(page, [
    jsonApiService(),
    jsonApiService("svc-2", "Design"),
  ]);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [
      jsonApiTimeEntry("entry-1", { task: { id: "task-1", title: "Ship" } }),
    ],
    included: [jsonApiService(), jsonApiTask("task-1", "Ship")],
  }));
  await openHome(page);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.getByRole("combobox", { name: "Service" }).click();
  await expect(page.getByRole("option", { name: "Design" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveURL(/\/edit\/entry-1/);
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  expect(faults).toEqual([]);
});
