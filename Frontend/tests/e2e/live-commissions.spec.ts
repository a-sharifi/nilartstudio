import { expect, test } from "@playwright/test";
test("original commission pages submit a text brief for review", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined;
  await page.route("**/api/v1/auth/session", route => route.fulfill({ json: { account_id: "commission-test-owner" } }));
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({ json: { csrf_token: "nonce" } }));
  await page.route("**/api/v1/account/commissions", route => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { id: "request-1", status: "awaiting_review" } });
  });
  await page.goto("/en/commissions");
  await expect(page.locator(".commissions-page")).toBeVisible();
  await expect(page.locator(".commission-preview-controls")).toHaveCount(0);
  await page.locator(".commission-start").first().click();
  await expect(page).toHaveURL(/\/commissions\/new\/references$/);
  await expect(page.locator('input[name="ref-kind"]').first()).toBeDisabled();
  await page.getByRole("textbox", { name: /Your idea and brief/ }).fill("Portrait with a quiet garden background");
  await page.locator(".ref-bottom-actions .button.primary").click();
  await expect(page).toHaveURL(/\/commissions\/new\/preferences$/);
  await page.locator('input[name="execution"][value="digital"]').check();
  await page.locator('input[name="style"]').first().check();
  await page.locator('input[name="size"]').first().check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Request saved; awaiting review")).toBeVisible();
  expect(submitted).toMatchObject({ idea: "Portrait with a quiet garden background", changes: "", execution: "digital", style: "expressive", size: "2400 × 2400 px" });
  await expect(page.locator(".references-demo-controls")).toHaveCount(0);
  await page.screenshot({ path: "/tmp/nilart-commission-design-desktop.png", fullPage: true });
});

test("guest commission introduction uses real sign-in", async ({ page }) => {
  await page.route("**/api/v1/auth/session", route => route.fulfill({ status: 401, json: {} }));
  await page.goto("/fa/commissions");
  await page.locator(".commission-start").first().click();
  await expect(page).toHaveURL(/\/fa\/auth\/login\?returnTo=/);
});

test("uncertain review submission retries the same body and remains on preferences", async ({ page }) => {
  const requests: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/auth/session", route => route.fulfill({ json: { account_id: "commission-retry-owner" } }));
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({ json: { csrf_token: "nonce" } }));
  await page.route("**/api/v1/account/commissions", route => {
    requests.push(route.request().postData()!);
    return requests.length === 1 ? route.abort() : route.fulfill({ json: { id: "retry-receipt", status: "awaiting_review" } });
  });
  await page.goto("/fa/commissions/new/references");
  await page.locator("textarea").fill("درخواست آزمایشی مستقل");
  await page.locator(".ref-bottom-actions .button.primary").click();
  await page.locator('input[name="execution"][value="hand"]').check();
  await page.locator('input[name="style"]').first().check();
  await page.locator('input[name="size"]').first().check();
  await page.locator('.pref-actions button[type="submit"]').click();
  await expect(page.locator(".pref-warning")).toContainText("نتیجه ثبت مشخص نیست");
  await expect(page.locator('input[name="execution"]').first()).toBeDisabled();
  await page.locator('.pref-actions button[type="submit"]').click();
  await expect(page.getByText("درخواست ثبت شد؛ در انتظار بررسی")).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[0]).toBe(requests[1]);
  await expect(page).toHaveURL(/\/preferences$/);
  await expect(page.locator(".pref-warning")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/nilart-commission-design-mobile-fa.png", fullPage: true });
});

test("session revalidation removes a previous account's private brief", async ({ page }) => {
  let owner = "first-commission-owner";
  await page.route("**/api/v1/auth/session", route => route.fulfill({ json: { account_id: owner } }));
  await page.goto("/en/commissions/new/references");
  await page.locator("textarea").fill("Private first-account brief");
  await page.locator(".ref-bottom-actions .button.primary").click();
  await expect(page).toHaveURL(/\/preferences$/);
  await expect(page.locator("summary").filter({ hasText: "Private first-account brief" })).toBeVisible();
  owner = "second-commission-owner";
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Private first-account brief", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit for review" })).toBeDisabled();
  await page.getByRole("button", { name: "Back to references and brief" }).click();
  await expect(page.locator("textarea")).toHaveValue("");
});
