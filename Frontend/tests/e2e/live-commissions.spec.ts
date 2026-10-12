import { expect, test } from "@playwright/test";
test("commission form saves an awaiting-review request", async ({ page }) => {
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({ json: { csrf_token: "nonce" } }));
  await page.route("**/api/v1/account/commissions", route => route.fulfill({ json: { id: "request-1", status: "awaiting_review" } }));
  await page.goto("/en/commissions");
  await page.getByRole("textbox", { name: "Idea" }).fill("Portrait");
  await page.getByRole("textbox", { name: "Style" }).fill("Oil");
  await page.getByRole("textbox", { name: "Requested size" }).fill("40 x 60");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Request saved; awaiting review")).toBeVisible();
});
