import { expect, test } from "@playwright/test";

test("reference bookmark detail reads database content and opens the native gallery", async ({ page }) => {
  await page.goto("/en/products/bookmark-love");
  await expect(page.getByRole("heading", { name: "Bookmark", exact: true })).toBeVisible();
  await expect(page.locator(".product-gallery .mockup.rose").first()).toBeVisible();
  await expect(page.locator(".gallery-thumbnails button")).toHaveCount(1);
  await expect(page.locator(".product-intro")).toHaveText("Bookmark from the Love collection.");
  await expect(page.locator(".product-specifications")).toContainText("Bookmark");
  await expect(page.locator(".product-specifications")).not.toContainText("Paper weight");
  await expect(page.locator(".quantity-stepper input")).toBeDisabled();
  await page.getByRole("radio", { name: "Bookmark", exact: true }).check();
  await expect(page.locator(".product-add-button")).toBeDisabled();
  await page.getByRole("button", { name: "Enlarge image: Front view" }).click();
  await expect(page.locator("dialog[open].product-dialog-lightbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open].product-dialog-lightbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enlarge image: Front view" })).toBeFocused();
  await page.locator("h1").click();
  await page.screenshot({path:"/tmp/nilart-bookmark-detail-reference-desktop.png",fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.goto("/fa/products/bookmark-love");
  await expect(page.locator(".product-intro")).toContainText("کالکشن عشق");
  await expect(page.locator(".product-delivery")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:"/tmp/nilart-bookmark-detail-reference-mobile.png",fullPage:true});
});

test("notebook detail retains reference thumbnail and keyboard navigation", async ({ page }) => {
  await page.goto("/en/products/cats-sketchbook-127gsm");
  await expect(page.locator(".gallery-thumbnails button")).toHaveCount(4);
  await page.getByRole("button", { name: "Back cover", exact: true }).click();
  await expect(page.locator(".gallery-main .gallery-view-back")).toBeVisible();
  await page.getByRole("button", { name: "Enlarge image: Back cover" }).click();
  await page.locator("dialog[open] .gallery-controls button").first().press("ArrowRight");
  await expect(page.locator("dialog[open] .gallery-view-inside")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".product-specifications")).toContainText("Cats");
  await expect(page.locator(".product-related .product-card")).toHaveCount(4);
});
