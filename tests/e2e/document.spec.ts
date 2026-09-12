import { expect, test } from "@playwright/test";
import {
  jsonApiService,
  jsonApiTimeEntry,
  mockProductiveIdentity,
  mockServices,
  mockTimeEntries,
  mockTimers,
  openHome,
} from "./productive-mock";

test.describe("crawler shell", () => {
  test.use({ javaScriptEnabled: false });

  test("ships privacy-safe head tags without JS", async ({ page, request }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Productive Time Tracker");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Private browser app for logging time in Productive. Sign in with an API token.",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Productive Time Tracker",
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
      "content",
      "en",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary",
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      "href",
      "/favicon.svg",
    );

    expect((await request.get("/favicon.svg")).status()).toBe(200);
    expect(await (await request.get("/robots.txt")).text()).toBe(
      "User-agent: *\nDisallow: /\n",
    );

    const html = await page.content();
    expect(html).toMatch(/img-src 'self' data:/);
    expect(html).not.toContain("frame-ancestors");
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("og:url");
    expect(html).not.toContain("application/ld+json");
  });
});

test("edit title stays generic and hides entry copy", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry("entry-1")],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await page.getByRole("button", { name: /More actions for/ }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveTitle("Edit time entry · Productive Time Tracker");
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
});
