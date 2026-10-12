import { expect, test } from "@playwright/test";

test("homepage and collection route survive direct reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".header")).toBeVisible();
  await expect(page.locator(".hero")).toBeVisible();
  await page.goto("/collections");
  await expect(page.locator("#collections-title")).toBeVisible();
  await page.reload();
  await expect(page.locator("#collections-title")).toBeVisible();
});

test("unconnected sensitive routes do not simulate transactions in live mode", async ({ page }) => {
  await page.goto("/fa/admin");
  await expect(page.getByRole("heading", { name: "Backend connection required" })).toBeVisible();
});

test("published API collections replace fixtures and preserve list/detail navigation", async ({ page }) => {
  const collection = { id: "00000000-0000-0000-0000-000000000001", slug: "verified-api",
    title_fa: "کالکشن API آزمایشی", title_en: "Verified API collection",
    description_fa: "نمونه تست", description_en: "Test fixture" };
  await page.route("**/api/v1/catalog/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith("/collections/verified-api") ? collection
      : { items: path.endsWith("/collections") ? [collection] : [], total: path.endsWith("/collections") ? 1 : 0, page: 1, page_size: 100 };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/collections");
  await expect(page.getByRole("heading", { name: "کالکشن API آزمایشی", exact: true })).toBeVisible();
  await page.locator('a[href="/collections/verified-api"]').first().click();
  await expect(page).toHaveURL(/collections\/verified-api/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "کالکشن کالکشن API آزمایشی", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator("#collections-title")).toBeVisible();
});
