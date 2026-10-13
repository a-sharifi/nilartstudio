import { expect, test } from "@playwright/test";

test("database reference products and Cats bundle use the supplied illustrations", async ({ page }) => {
  await page.goto("/en/shop");
  await expect(page.locator('.shop-result .mockup').first()).toBeVisible();
  await page.goto("/en/products/cats-sketchbook-127gsm");
  await expect(page.locator(".product-gallery .mockup.sage svg").first()).toBeVisible();
  await expect(page.locator(".product-add-button")).toBeDisabled();
  await page.goto("/en/bundles");
  await expect(page.locator(".bundle-image > .bundle-still-life")).toBeVisible();
  await page.getByRole("link", { name: "Cats bundle", exact: true }).click();
  await expect(page.locator(".bundle-gallery-column .bundle-still-life")).toBeVisible();
  await expect(page.locator(".bundle-component-card")).toHaveCount(3);
  await expect(page.locator(".product-add-button")).toBeDisabled();
  await page.screenshot({ path: "/tmp/nilart-cats-bundle-reference-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fa/bundles/cats-bundle");
  await expect(page.locator(".bundle-still-life")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/nilart-cats-bundle-reference-mobile.png", fullPage: true });
});
