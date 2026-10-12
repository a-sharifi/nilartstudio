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
  await expect(page.getByText("Price and availability unconfirmed")).toBeVisible();
  await expect(page.getByText("Prototype states")).toHaveCount(0);
  await page.goto("/fa/shop");
  await expect(page.getByRole("heading", { name: "محصول واقعی" })).toBeVisible();
});
