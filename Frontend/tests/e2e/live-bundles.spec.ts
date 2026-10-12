import { expect, test } from "@playwright/test";
test("bundle list and detail show real components without purchase claims", async ({ page }) => {
  const bundle = { id: "b", slug: "set", title_fa: "پکیج واقعی", title_en: "Real bundle", description_fa: "شرح", description_en: "Description", components: [{ sku_id: "s", code: "SKU-A", quantity: 2, title_fa: "محصول", title_en: "Product" }] };
  await page.route("**/api/v1/catalog/bundles**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/set") ? bundle : { items: [bundle], total: 1 } }));
  await page.goto("/bundles?language=en");
  await expect(page.getByRole("heading", { name: "Real bundle" })).toBeVisible();
  await page.getByRole("link", { name: "Real bundle" }).click();
  await expect(page.getByText("2 × Product · SKU-A")).toBeVisible();
  await expect(page.getByText("Purchase details unconfirmed")).toBeVisible();
});

test("footer information pages render without backend guards", async ({ page }) => {
  for (const [path, title] of [["/guides/buying", "Buying guide"], ["/faq", "FAQ"], ["/en/about", "About"], ["/en/contact", "Contact"], ["/en/terms", "Terms"], ["/privacy", "Privacy"], ["/en/returns", "Returns"], ["/en/track-order", "Track order"]]) {
    await page.goto(path + (path.startsWith("/en/") ? "" : "?language=en"));
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByText("Backend connection required")).toHaveCount(0);
  }
});
