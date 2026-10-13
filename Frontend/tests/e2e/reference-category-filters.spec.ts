import { expect, test } from "@playwright/test";

test("live shop uses reference category navigation and category filter choices", async ({ page }) => {
  await page.goto("/en/shop");
  const nav = page.locator(".shop-category-nav");
  await expect(nav.locator("strong")).toHaveText(["Sketchbooks", "Notebooks", "Stickers", "Bookmarks"]);
  await expect(nav.locator(".shop-category-thumb .mockup")).toHaveCount(4);
  await expect(nav).not.toContainText("Demo");
  const panel = page.locator(".shop-sidebar .filter-panel");
  await expect(panel.getByRole("radio")).toHaveCount(5);
  await panel.getByRole("radio", { name: "Stickers", exact: true }).click();
  await expect(page).toHaveURL(/category=stickers/);
  await expect(page.locator(".shop-results .product-card")).toHaveCount(2);
  await expect(page.locator(".shop-results")).not.toContainText("Demo price");
  await expect(page.locator(".shop-chips")).toContainText("Stickers");
  await page.screenshot({ path: "/tmp/nilart-reference-shop-filters-desktop.png", fullPage: true });
  await panel.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(panel.getByRole("radio", { name: "All categories", exact: true })).toBeChecked();
  await nav.getByRole("link", { name: /Bookmarks/ }).click();
  await expect(page).toHaveURL(/\/en\/categories\/bookmarks$/);
  await expect(page.locator(".shop-category-scope")).toContainText("Bookmarks");
  await expect(page.locator(".shop-sidebar").getByRole("radio")).toHaveCount(0);
  await expect(page.locator(".shop-results .product-card")).toHaveCount(2);
});

test("reference mobile filter sheet keeps changes temporary until applied", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fa/shop");
  const trigger = page.locator(".shop-mobile-filter");
  await trigger.click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog.locator(".filter-panel")).toHaveCount(1);
  await expect(dialog.getByRole("radio")).toHaveCount(5);
  await dialog.getByRole("radio", { name: "استیکر", exact: true }).check();
  await expect(page).not.toHaveURL(/category=stickers/);
  await page.screenshot({ path: "/tmp/nilart-reference-shop-filters-mobile.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByRole("radio", { name: "همه دسته‌ها", exact: true })).toBeChecked();
  await dialog.getByRole("radio", { name: "نشانک", exact: true }).check();
  await dialog.getByRole("button", { name: "اعمال فیلترها", exact: true }).click();
  await expect(page).toHaveURL(/category=bookmarks/);
  await expect(page.locator(".shop-results .product-card")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("live collections reuse the reference filter panel for database categories", async ({ page }) => {
  await page.goto("/collections/gorbe?language=en");
  const panel = page.locator(".detail-sidebar .filter-panel");
  await expect(panel.getByRole("radio")).toHaveCount(5);
  await panel.getByRole("radio", { name: "Bookmarks", exact: true }).click();
  await expect(page).toHaveURL(/category=bookmarks/);
  await expect(page.locator(".detail-results-area .product-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Bookmark — Cats", exact: true })).toBeVisible();
});
