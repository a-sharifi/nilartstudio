import { expect, test, type Page } from "@playwright/test";

async function mockProfile(page: Page) {
  await page.route("**/api/v1/account/profile", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ account_id: "owner",
      full_name: "Server customer", phone: "+989123456789", version: 1 }),
  }));
}

async function enterProfile(page: Page) {
  await mockProfile(page);
  await page.goto("/en");
  await expect(page.locator(".hero")).toBeVisible();
  // Enter through Next's existing navigation rather than a document reload.
  await page.evaluate(() => window.history.pushState(null, "", "/en/account/profile"));
  await expect(page.locator("#profile-fullName")).toHaveValue("Server customer");
}

test("Back preserves the profile draft until leaving is confirmed", async ({ page }) => {
  await enterProfile(page);
  await page.locator("#profile-fullName").fill("Unsaved draft");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await page.getByRole("button", { name: "Stay on this page" }).click();
  await expect(page.locator("#profile-fullName")).toHaveValue("Unsaved draft");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
});

test("Forward resumes the exact destination after confirmation", async ({ page }) => {
  await enterProfile(page);
  await page.evaluate(() => window.history.pushState(null, "", "/collections?language=en"));
  await expect(page.locator("#collections-title")).toBeVisible();
  await page.evaluate(() => window.history.back());
  await expect(page.locator("#profile-fullName")).toHaveValue("Server customer");
  await page.locator("#profile-fullName").fill("Unsaved draft");
  await page.evaluate(() => window.history.forward());
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await page.getByRole("button", { name: "Stay on this page" }).click();
  await page.evaluate(() => window.history.forward());
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/collections\?language=en$/);
  await expect(page.locator("#collections-title")).toBeVisible();
});

test("multiple-entry traversal preserves the requested destination and history", async ({ page }) => {
  await enterProfile(page);
  await page.evaluate(() => {
    window.history.pushState(null, "", "/en/account/profile?step=one");
    window.history.pushState(null, "", "/en/account/profile?step=two");
  });
  await page.locator("#profile-fullName").fill("Unsaved draft");
  const length = await page.evaluate(() => window.history.length);
  await page.evaluate(() => window.history.go(-3));
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/step=two$/);
  await page.getByRole("button", { name: "Stay on this page" }).click();
  expect(await page.evaluate(() => window.history.length)).toBe(length);
  await page.evaluate(() => window.history.go(-3));
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/en$/);
  expect(await page.evaluate(() => window.history.length)).toBe(length);
});

test("clean forms allow Back without a dialog", async ({ page }) => {
  await enterProfile(page);
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a temporary read failure keeps native Back protection", async ({ page }) => {
  await enterProfile(page);
  await page.locator("#profile-fullName").fill("Unsaved draft");
  await page.route("**/api/v1/account/profile", route => route.fulfill({ status: 503, body: "{}" }));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText("Unable to load your profile.")).toBeVisible();
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await page.getByRole("button", { name: "Stay on this page" }).click();
  await page.unroute("**/api/v1/account/profile");
  await mockProfile(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("#profile-fullName")).toHaveValue("Unsaved draft");
});

test("Back stays on the form while a save is pending", async ({ page }) => {
  await enterProfile(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ csrf_token: "fresh" }),
  }));
  await page.route("**/api/v1/account/profile", async route => {
    await pending;
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({
      account_id: "owner", full_name: "Saved draft", phone: "+989123456789", version: 2,
    }) });
  });
  await page.locator("#profile-fullName").fill("Saved draft");
  const request = page.waitForRequest(request => request.method() === "PUT");
  await page.locator("button[type=submit]").click();
  await request;
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  release();
  await expect(page.getByText("Your profile has been saved.", { exact: true })).toBeVisible();
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/\/en$/);
});

test("Persian mobile Back uses the supplied leave dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProfile(page);
  await page.goto("/fa");
  await expect(page.locator(".hero")).toBeVisible();
  await page.evaluate(() => window.history.pushState(null, "", "/fa/account/profile"));
  await expect(page.locator("#profile-fullName")).toHaveValue("Server customer");
  await page.locator("#profile-fullName").fill("نام ذخیره‌نشده");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/fa\/account\/profile$/);
  await page.getByRole("button", { name: "ماندن در صفحه" }).click();
  await expect(page.locator("#profile-fullName")).toHaveValue("نام ذخیره‌نشده");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("fragment entries preserve exact Back and Forward destinations", async ({ page }) => {
  await enterProfile(page);
  await page.evaluate(() => { window.location.hash = "dashboard-main"; });
  await expect(page).toHaveURL(/#dashboard-main$/);
  await page.evaluate(() => window.history.pushState(null, "", "/collections?language=en"));
  await expect(page.locator("#collections-title")).toBeVisible();
  await page.evaluate(() => window.history.go(-2));
  await expect(page.locator("#profile-fullName")).toHaveValue("Server customer");
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await page.locator("#profile-fullName").fill("Unsaved draft");
  await page.evaluate(() => window.history.go(2));
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/collections\?language=en$/);
});

test("reload requires native confirmation for an unsaved profile", async ({ page }) => {
  await enterProfile(page);
  await page.locator("#profile-fullName").fill("Unsaved draft");
  let prompted = false;
  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("beforeunload");
    prompted = true;
    await dialog.dismiss();
  });
  // Dismissing beforeunload intentionally prevents the navigation from finishing.
  await page.reload({ timeout: 2000 }).catch(() => {});
  expect(prompted).toBe(true);
  await expect(page.locator("#profile-fullName")).toHaveValue("Unsaved draft");
  page.once("dialog", dialog => dialog.accept());
  await page.reload();
  await expect(page.locator("#profile-fullName")).toHaveValue("Server customer");
});

test("tracked history protects drafts without the Navigation API", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "navigation", { value: undefined }));
  await enterProfile(page);
  await page.locator("#profile-fullName").fill("Unsaved draft");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await page.getByRole("button", { name: "Stay on this page" }).click();
  await expect(page.locator("#profile-fullName")).toHaveValue("Unsaved draft");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Leave without saving" }).click();
  await expect(page).toHaveURL(/\/en$/);
});
