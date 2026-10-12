import { expect, test } from "@playwright/test"

test("live Next navigation preserves locale, filters, back navigation and reload", async ({ page }) => {
  const collection = { id: "c1", slug: "art", title_fa: "هنر", title_en: "Art", description_fa: "توضیح", description_en: "Description" }
  const product = { id: "p1", slug: "real-product", title_fa: "محصول", title_en: "Real product", description_fa: "", description_en: "", collection_ids: ["c1"], category_ids: ["cat1", "cat2"] }
  await page.route("**/api/v1/catalog/**", async route => {
    const url = new URL(route.request().url())
    const items = url.pathname.endsWith("/collections") ? [collection]
      : url.pathname.endsWith("/categories") ? [{ id: "cat1", slug: "paper", title_fa: "کاغذ", title_en: "Paper" }, { id: "cat2", slug: "gifts", title_fa: "هدیه", title_en: "Gifts" }]
      : url.pathname.endsWith("/products") ? [product] : []
    await route.fulfill({ json: url.pathname.endsWith("/collections/art") ? collection : { items, total: items.length, page: 1, page_size: 100 } })
  })
  await page.goto("/en")
  await page.getByRole("link", { name: "All collections" }).click()
  await expect(page).toHaveURL(/\/collections\?language=en$/)
  await expect(page.getByRole("heading", { name: "Find your favorite collection" })).toBeVisible()
  await page.locator("a.collection-detail-card").click()
  await expect(page).toHaveURL(/\/collections\/art\?language=en$/)
  await expect(page.getByRole("heading", { name: "Art Collection" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Real product" })).toBeVisible()
  await page.getByRole("tab", { name: "Products", exact: true }).click()
  await expect(page).toHaveURL(/tab=products&language=en$/)
  await page.reload()
  await expect(page.getByRole("tab", { name: "Products", exact: true })).toHaveAttribute("aria-selected", "true")
  await page.goBack()
  await expect(page.getByRole("tab", { name: "All", exact: true })).toHaveAttribute("aria-selected", "true")
  await page.goBack()
  await expect(page.getByRole("heading", { name: "Find your favorite collection" })).toBeVisible()
})
