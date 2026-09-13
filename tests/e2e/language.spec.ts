import { expect, test, type Page } from "@playwright/test";
import {
  jsonApiService,
  jsonApiTimeEntry,
  mockProductiveIdentity,
  mockServices,
  mockTimeEntries,
  mockTimers,
  openHome,
} from "./productive-mock";

const LANGUAGE_KEY = "productive-time-tracker.language";

async function pickLanguage(page: Page, option: "English" | "Hrvatski") {
  const trigger = page.getByRole("button", { name: /Language|Jezik/ });
  await trigger.click();
  await page.getByRole("menuitem", { name: option }).click();
}

test("login picker switches chrome and persists across reload", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  await pickLanguage(page, "Hrvatski");
  await expect(page.locator("html")).toHaveAttribute("lang", "hr");
  await expect(page.getByRole("heading", { name: "Prijava" })).toBeVisible();
  expect(
    await page.evaluate(
      (key) => window.localStorage.getItem(key),
      LANGUAGE_KEY,
    ),
  ).toBe("hr");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "hr");
  await expect(page.getByRole("heading", { name: "Prijava" })).toBeVisible();

  await pickLanguage(page, "English");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("home picker follows the same catalog and logout keeps it", async ({
  page,
}) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry("entry-1")],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(
    1,
  );

  await pickLanguage(page, "Hrvatski");
  await expect(page.locator("html")).toHaveAttribute("lang", "hr");
  await expect(
    page.getByRole("link", { name: "Preskoči na sadržaj" }),
  ).toHaveCount(1);

  await page.getByRole("button", { name: "Ada Lovelace" }).click();
  await page.getByRole("menuitem", { name: "Odjava" }).click();
  await expect(page.getByRole("heading", { name: "Prijava" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "hr");
});
