import { expect, test } from "@playwright/test";

test("guest expiry route preserves a safe profile destination across languages and reload", async ({ page }) => {
  await page.route("**/api/v1/auth/session", route => route.fulfill({ status: 401, body: "{}" }));
  await page.goto("/en/auth/session-expired?returnTo=%2Fen%2Faccount%2Fprofile");
  await expect(page.getByRole("heading", { name: "Sign in again to continue" })).toBeVisible();
  await expect(page.locator(".auth-preview")).toHaveCount(0);
  await expect(page.locator(".session-demo")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("link", { name: "Sign in again", exact: true }).first())
    .toHaveAttribute("href", "/en/auth/login?returnTo=%2Fen%2Faccount%2Fprofile");
  await page.getByRole("link", { name: "فارسی" }).click();
  await expect(page.locator(".auth-shell")).toHaveAttribute("dir", "rtl");
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("temporary failure retries and active sessions return through profile authorization", async ({ page }) => {
  let available = false;
  await page.route("**/api/v1/auth/session", route => route.fulfill({ status: available ? 200 : 503,
    contentType: "application/json", body: JSON.stringify({ account_id: "customer" }) }));
  await page.route("**/api/v1/account/profile", route => route.fulfill({ status: 403, body: "{}" }));
  await page.goto("/en/auth/session-expired?returnTo=%2Fen%2Faccount%2Fprofile");
  await expect(page.getByRole("heading", { name: "Access cannot be checked right now" })).toBeVisible();
  available = true;
  await page.getByRole("button", { name: "Try checking again" }).first().click();
  await expect(page.getByRole("heading", { name: "Your session is active" })).toBeVisible();
  await page.getByRole("link", { name: "Continue", exact: true }).first().click();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
});

test("expiry route rejects an external return destination", async ({ page }) => {
  await page.route("**/api/v1/auth/session", route => route.fulfill({ status: 401, body: "{}" }));
  await page.goto("/en/auth/session-expired?returnTo=https%3A%2F%2Fexample.com");
  await expect(page.getByRole("link", { name: "Sign in again", exact: true }).first())
    .toHaveAttribute("href", "/en/auth/login");
});
