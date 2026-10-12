import { expect, test } from "@playwright/test";

test("profile uses supplied form, server values and confirmed save", async ({ page }) => {
  let full_name = "Server customer", version = 1;
  await page.route("**/api/v1/account/profile", async route => {
    if (route.request().method() === "PUT") {
      expect(route.request().headers()["x-csrf-token"]).toBe("fresh-csrf");
      const body = route.request().postDataJSON();
      expect(Object.keys(body).sort()).toEqual(["full_name", "version"]);
      full_name = body.full_name; version += 1;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ account_id: "test-owner", phone: "+989123456789", full_name, version }) });
  });
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ csrf_token: "fresh-csrf" }) }));
  await page.goto("/en/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveValue("Server customer");
  await expect(page.locator(".profile-demo")).toHaveCount(0);
  await expect(page.locator(".dash-alert-dot")).toHaveCount(0);
  await page.locator("#profile-fullName").fill("Updated customer");
  await page.locator("button[type=submit]").click();
  await expect(page.getByText("Your profile has been saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("#profile-fullName")).toHaveValue("Updated customer");
});

test("guest profile does not expose demo name or form", async ({ page }) => {
  await page.route("**/api/v1/account/profile", route => route.fulfill({ status: 401, contentType: "application/json", body: "{}" }));
  await page.goto("/fa/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
  await expect(page.getByText("سارا احمدی", { exact: true })).toHaveCount(0);
});

test("profile conflicts preserve draft until explicit replacement", async ({ page }) => {
  let name = "Old name", version = 1;
  await page.route("**/api/v1/account/profile", async route => {
    if (route.request().method() === "PUT") {
      name = "Changed elsewhere"; version = 2;
      await route.fulfill({ status: 409, contentType: "application/json", body: JSON.stringify({ code: "profile_version_conflict" }) });
    } else await route.fulfill({ contentType: "application/json", body: JSON.stringify({ account_id: "owner", phone: "+989123456789", full_name: name, version }) });
  });
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ csrf_token: "fresh" }) }));
  await page.goto("/en/account/profile");
  await page.locator("#profile-fullName").fill("Unsaved edit");
  await page.locator("button[type=submit]").click();
  await expect(page.locator("#profile-fullName")).toHaveValue("Unsaved edit");
  await page.getByRole("button", { name: "Load latest version", exact: true }).click();
  await expect(page.locator("#profile-fullName")).toHaveValue("Changed elsewhere");
});

test("an old save cannot restore a profile after an account switch", async ({ page }) => {
  let switched = false;
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/account/profile", async route => {
    if (route.request().method() === "PUT") {
      await pending;
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({
        account_id: "old-owner", phone: "+989123456789", full_name: "Old account edit", version: 2,
      }) });
    } else await route.fulfill({ contentType: "application/json", body: JSON.stringify({
      account_id: switched ? "new-owner" : "old-owner", phone: "+989123456789",
      full_name: switched ? "Current customer" : "Previous customer", version: 1,
    }) });
  });
  await page.route("**/api/v1/auth/session/csrf", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ csrf_token: "fresh" }),
  }));
  await page.goto("/en/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveValue("Previous customer");
  await page.locator("#profile-fullName").fill("Old account edit");
  const request = page.waitForRequest(request => request.method() === "PUT");
  await page.locator("button[type=submit]").click();
  await request;
  switched = true;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("#profile-fullName")).toHaveValue("Current customer");
  const response = page.waitForResponse(response => response.request().method() === "PUT");
  release();
  await response;
  await expect(page.locator("#profile-fullName")).toHaveValue("Current customer");
  await expect(page.getByText("Your profile has been saved.", { exact: true })).toHaveCount(0);
});

test("a session broadcast rechecks the server and removes denied private data", async ({ page }) => {
  let denied = false;
  await page.route("**/api/v1/account/profile", route => route.fulfill(denied
    ? { status: 401, contentType: "application/json", body: "{}" }
    : { contentType: "application/json", body: JSON.stringify({ account_id: "owner",
      phone: "+989123456789", full_name: "Private customer", version: 1 }) }));
  await page.goto("/en/account/profile");
  await expect(page.locator("#profile-fullName")).toHaveValue("Private customer");
  await page.locator("#profile-fullName").fill("Private draft");
  denied = true;
  await page.evaluate(() => {
    const channel = new BroadcastChannel("nilart-auth-status");
    channel.postMessage({ type: "session-changed" });
    channel.close();
  });
  await expect(page.getByText("This account’s profile is not accessible.", { exact: true })).toBeVisible();
  await expect(page.locator("#profile-fullName")).toHaveCount(0);
  await expect(page.getByText("Private customer", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Private draft", { exact: true })).toHaveCount(0);
});
