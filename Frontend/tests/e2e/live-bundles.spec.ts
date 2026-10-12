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

test("footer routes render their supplied reference layouts", async ({ page }) => {
  for (const [path, selector] of [["/guides/buying", ".buying-guide"], ["/faq", ".faq-page"], ["/en/about", ".about-page"], ["/en/contact", ".contact-page"], ["/en/terms", ".terms-page"], ["/privacy", ".privacy-page"], ["/en/returns", ".returns-page"], ["/en/track-order", ".tracking-page"]]) {
    await page.goto(path);
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator(".static-info-page")).toHaveCount(0);
  }
});

test("reference footer layouts remain readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/fa/contact", "/fa/about", "/fa/terms", "/fa/returns", "/fa/track-order", "/fa/faq", "/fa/guides/buying", "/fa/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/fa/contact");
  await expect(page.locator(".contact-page")).toBeVisible();
  await page.screenshot({ path: "/tmp/nilart-restored-contact-mobile.png", fullPage: true });
});
