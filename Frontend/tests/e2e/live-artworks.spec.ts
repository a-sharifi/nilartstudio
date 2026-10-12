import { expect, test } from "@playwright/test";
test("live gallery and artwork detail use API data", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "شرح", description_en: "Real description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.goto("/en/artworks");
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("link", { name: "View artwork" }).click();
  await expect(page).toHaveURL(/\/en\/artworks\/real/);
  await expect(page.locator(".ad-summary")).toHaveText("Real description");
  await expect(page.locator(".ad-layout")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  await expect(page.locator(".demo-painting")).toHaveCount(0);
  await page.goto("/fa/artworks");
  await expect(page.getByRole("heading", { name: "نقاشی واقعی" })).toBeVisible();
});

test("reference search survives detail navigation, back and reload", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "شرح", description_en: "Published description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.goto("/en/artworks");
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search artworks" }).fill("real");
  await page.locator(".art-search").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=real/);
  await page.getByRole("link", { name: "View artwork" }).click();
  await expect(page.locator(".ad-summary")).toHaveText("Published description");
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "Search artworks" })).toHaveValue("real");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Available works only" }).check();
  await expect(page.getByRole("heading", { name: "No artworks match your selection." })).toBeVisible();
});

test("reference mobile gallery and detail have no horizontal overflow", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "توضیح منتشرشده", description_en: "Published description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fa/artworks");
  await expect(page.getByRole("heading", { name: "نقاشی واقعی" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/nilart-reference-artworks-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "مشاهده اثر" }).click();
  await expect(page.locator(".ad-summary")).toHaveText("توضیح منتشرشده");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/nilart-reference-artwork-detail-mobile.png", fullPage: true });
});
