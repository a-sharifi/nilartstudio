import { expect, test } from "@playwright/test";

test("logout survives reload and only claims success after session verification", async ({ page }) => {
  let signedOut = false;
  await page.route("**/api/v1/auth/session", route => route.fulfill({
    status: signedOut ? 401 : 200, contentType: "application/json",
    body: JSON.stringify(signedOut ? { code: "unauthenticated" } : { account_id: "test-account" }),
  }));
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ csrf_token: "fresh-test-csrf" }),
  }));
  await page.route("**/api/v1/auth/logout", async route => {
    expect(route.request().headers()["x-csrf-token"]).toBe("fresh-test-csrf");
    signedOut = true;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/fa/auth/logout");
  await expect(page.getByRole("button", { name: "خروج از حساب", exact: true }).first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "از حساب خارج شدید", exact: true })).toBeVisible();
  await expect(page.locator(".auth-preview")).toHaveCount(0);
});

test("guest logout never sends a mutation", async ({ page }) => {
  let mutations = 0;
  await page.route("**/api/v1/auth/session", route => route.fulfill({ status: 401, body: "{}" }));
  await page.route("**/api/v1/auth/logout", route => { mutations += 1; return route.fulfill({ status: 204 }); });
  await page.goto("/en/auth/logout");
  await expect(page.getByRole("heading", { name: "You are not currently signed in", exact: true })).toBeVisible();
  expect(mutations).toBe(0);
});
