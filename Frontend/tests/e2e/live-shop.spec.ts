import { expect, test } from "@playwright/test";

test("shop shows published API products in English and Persian", async ({ page }) => {
  await page.route("**/api/v1/catalog/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const items = path.endsWith("collections") ? [{ id: "c1", slug: "art", title_fa: "هنر", title_en: "Art" }]
      : path.endsWith("products") ? [{ id: "p1", slug: "real", title_fa: "محصول واقعی", title_en: "Real product", collection_ids: ["c1"], category_ids: [] }] : [];
    await route.fulfill({ json: { items, total: items.length, page: 1, page_size: 100 } });
  });
  await page.goto("/en/shop");
  await expect(page.getByRole("heading", { name: "Nilart shop" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Real product" })).toBeVisible();
  await expect(page.locator(".stock-badge")).toHaveCount(0);
  await expect(page.getByText("Prototype states")).toHaveCount(0);
  await page.goto("/fa/shop");
  await expect(page.getByRole("heading", { name: "محصول واقعی" })).toBeVisible();
});

test("reference category navigation stays connected to the live catalog", async ({ page }) => {
  await page.route("**/api/v1/catalog/**", async route => {
    const path = new URL(route.request().url()).pathname;
    const items = path.endsWith("categories") ? [{ id: "category-1", slug: "prints", title_fa: "چاپ", title_en: "Prints" }]
      : path.endsWith("products") ? [{ id: "p1", slug: "print", title_fa: "چاپ واقعی", title_en: "Published print", collection_ids: [], category_ids: ["category-1"] }] : [];
    await route.fulfill({ json: { items, total: items.length, page: 1, page_size: 100 } });
  });
  await page.goto("/en/categories/prints");
  await expect(page.getByRole("heading", { name: "Prints", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Published print" })).toBeVisible();
  await expect(page.getByText("Backend connection required")).toHaveCount(0);
});
