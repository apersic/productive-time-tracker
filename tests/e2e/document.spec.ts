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
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("og:url");
    expect(html).not.toContain("application/ld+json");
  });
});

test("login sets the tab title and a single h1", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle("Log in · Productive Time Tracker");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await expect(page.locator("head title")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("home sets the tab title", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await expect(page).toHaveTitle("Home · Productive Time Tracker");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
});

test("edit title stays generic and hides entry copy", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry("entry-1", { note: "SECRET-NOTE" })],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveTitle("Edit time entry · Productive Time Tracker");
  await expect(
    page.getByRole("heading", { name: "Edit time entry" }),
  ).toBeVisible();
  const title = await page.title();
  expect(title).not.toContain("SECRET-NOTE");
  expect(title).not.toContain("Ada Lovelace");
});

test("unknown route still has a page title", async ({ page }) => {
  await page.goto("/nope");
  await expect(page).toHaveTitle(/^(Log in|Home) · Productive Time Tracker$/);
});

test("client-side navigation updates the tab title", async ({ page }) => {
  await mockProductiveIdentity(page);
  await mockServices(page);
  await mockTimers(page);
  await mockTimeEntries(page, () => ({
    data: [jsonApiTimeEntry()],
    included: [jsonApiService()],
  }));
  await openHome(page);
  await expect(page).toHaveTitle("Home · Productive Time Tracker");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(page).toHaveTitle("Edit time entry · Productive Time Tracker");
  await page.getByRole("button", { name: "Back to home" }).click();
  await expect(page).toHaveTitle("Home · Productive Time Tracker");
});
