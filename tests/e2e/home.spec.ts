import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const STORAGE_KEY = "productive-time-tracker.credentials";

function readLocalEnv(): Record<string, string> {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    return Object.fromEntries(
      text
        .split(/\r?\n/)
        .filter((line) => line.includes("="))
        .map((line) => {
          const eq = line.indexOf("=");
          return [line.slice(0, eq).trim(), line.slice(eq + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

function jsonApiUser() {
  return {
    data: {
      id: "9",
      type: "users",
      attributes: { email: "ada@example.com" },
    },
  };
}

function jsonApiPerson() {
  return {
    data: {
      id: "1439113",
      type: "people",
      attributes: { first_name: "Ada", last_name: "Lovelace" },
    },
  };
}

async function mockProductiveIdentity(page: Page) {
  await page.route("**/api/v2/users**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.api+json",
      body: JSON.stringify(jsonApiUser()),
    });
  });
  await page.route("**/api/v2/people**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.api+json",
      body: JSON.stringify(jsonApiPerson()),
    });
  });
}

async function seedStoredCredentials(page: Page) {
  await page.addInitScript(
    ({ key }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          organizationId: "61648",
          accessToken: "token-value",
        }),
      );
    },
    { key: STORAGE_KEY },
  );
}

test("guest visiting home is sent to login", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});

test("mocked login opens home", async ({ page }) => {
  await mockProductiveIdentity(page);
  await page.goto("/login");
  await page.getByLabel("Organization ID").fill("61648");
  await page.getByLabel("API token").fill("token-value");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await expect(page.getByText("Ada Lovelace")).toBeVisible();
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
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(stored).not.toBeNull();
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
  const stored = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(stored).toBeNull();
});

test("login persists across refresh and logout clears it", async ({ page }) => {
  const env = readLocalEnv();
  const organizationId = env.ORGANIZATION_ID ?? env.VITE_ORGANIZATION_ID;
  const accessToken = env.ACCESS_TOKEN ?? env.VITE_ACCESS_TOKEN;
  test.skip(
    !organizationId || !accessToken,
    "needs ORGANIZATION_ID and token in .env",
  );

  await page.goto("/login");
  await page.getByLabel("Organization ID").fill(organizationId);
  await page.getByLabel("API token").fill(accessToken);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
});
