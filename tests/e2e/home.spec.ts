import { expect, test } from "@playwright/test";

test("home page renders Home", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Home", { exact: true })).toBeVisible();
});
