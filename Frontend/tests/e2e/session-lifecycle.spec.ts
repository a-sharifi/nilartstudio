import { expect, test } from "@playwright/test";

test("verified login and logout update another tab's private view", async ({ context, page }) => {
  let owner: string | null = null;
  await context.route("**/api/v1/auth/session", route => route.fulfill({ status: owner ? 200 : 401,
    contentType: "application/json", body: JSON.stringify({ account_id: owner }) }));
  await context.route("**/api/v1/account/profile", route => route.fulfill({ status: owner ? 200 : 401,
    contentType: "application/json", body: JSON.stringify({ account_id: owner, full_name: "Private customer", phone: "+989123456789", version: 1 }) }));
  await context.route("**/api/v1/auth/login/password", route => {
    owner = "customer";
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ account_id: owner, csrf_token: "test-csrf" }) });
  });
  await context.route("**/api/v1/auth/session/csrf", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ csrf_token: "test-csrf" }) }));
  await context.route("**/api/v1/auth/logout", route => { owner = null; return route.fulfill({ status: 204 }); });
  await page.goto("/en/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
  const other = await context.newPage();
  await other.goto("/en/auth/login/password");
  await other.locator("#login-phone").fill("09123456789");
  await other.locator("#login-password").fill("test secure passphrase");
  await other.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("#profile-fullName")).toHaveValue("Private customer");
  await page.locator("#profile-fullName").fill("Unsaved private draft");
  await other.goto("/en/auth/logout");
  await other.getByRole("button", { name: "Sign out", exact: true }).first().click();
  await expect(other.getByRole("heading", { name: "You are signed out", exact: true })).toBeVisible();
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
  await expect(page.getByText("Unsaved private draft", { exact: true })).toHaveCount(0);
});

test("forged cross-tab hints cannot sign out a valid profile", async ({ page }) => {
  let reads = 0;
  await page.route("**/api/v1/account/profile", route => { reads += 1; return route.fulfill({ contentType: "application/json",
    body: JSON.stringify({ account_id: "customer", full_name: "Private customer", phone: "+989123456789", version: 1 }) }); });
  await page.goto("/en/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveValue("Private customer");
  await page.locator("#profile-fullName").fill("Preserved draft");
  const before = reads;
  await page.evaluate(() => {
    const channel = new BroadcastChannel("nilart-auth-status");
    channel.postMessage({ type: "session-changed", signedOut: true, account_id: "forged" });
    channel.close();
  });
  await expect.poll(() => reads).toBeGreaterThan(before);
  await expect(page.locator("#profile-fullName")).toHaveValue("Preserved draft");
});

test("expiry during profile save removes the draft without claiming a successful save", async ({ page }) => {
  let writes = 0;
  await page.route("**/api/v1/account/profile", route => {
    if (route.request().method() === "PUT") {
      writes += 1;
      return route.fulfill({ status: 401, body: "{}" });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({
      account_id: "customer", full_name: "Private customer", phone: "+989123456789", version: 1,
    }) });
  });
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ csrf_token: "test-csrf" }),
  }));
  await page.goto("/en/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveValue("Private customer");
  await page.locator("#profile-fullName").fill("Expired private draft");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
  expect(writes).toBe(1);
});
