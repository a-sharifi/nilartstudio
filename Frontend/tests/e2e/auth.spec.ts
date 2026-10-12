import { expect, test } from "@playwright/test";

test("live auth preserves design form and cannot simulate success", async ({ page }) => {
  await page.route("**/api/v1/auth/login/password", route => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ code: "invalid_credentials" }),
  }));
  await page.goto("/fa/auth/login");
  await page.getByRole("link", { name: /ورود با رمز عبور/ }).click();
  await expect(page.locator("#login-phone")).toBeVisible();
  await expect(page.locator(".auth-preview")).toHaveCount(0);
  await page.locator("#login-phone").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page.locator("#login-password").fill("wrong password");
  await page.getByRole("button", { name: "ورود به حساب" }).click();
  await expect(page.getByText("شماره تلفن یا رمز عبور درست نیست.")).toBeVisible();
  await expect(page.locator("#login-password")).toHaveValue("");
  await page.reload();
  await expect(page.locator("#login-phone")).toBeVisible();
  await page.getByRole("link", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Sign in with password" })).toBeVisible();
  await expect(page.locator(".auth-shell")).toHaveAttribute("dir", "ltr");
  await page.setViewportSize({ width: 390, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("link", { name: "فارسی" }).click();
  await expect(page.locator(".auth-shell")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
