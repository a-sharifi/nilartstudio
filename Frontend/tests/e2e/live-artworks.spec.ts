import { expect, test } from "@playwright/test";
test("live gallery and artwork detail use API data", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "شرح", description_en: "Real description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.goto("/en/artworks");
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("link", { name: "Real artwork" }).click();
  await expect(page).toHaveURL(/\/en\/artworks\/real/);
  await expect(page.getByText("Real description")).toBeVisible();
  await page.goto("/fa/artworks");
  await expect(page.getByRole("heading", { name: "نقاشی واقعی" })).toBeVisible();
});
