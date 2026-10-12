import { expect, test } from "@playwright/test";

test("unconfigured SMS never advances registration", async ({ page }) => {
  await page.route("**/api/v1/auth/otp/request", route => route.fulfill({
    status: 503, contentType: "application/json", body: JSON.stringify({ code: "sms_unavailable" }),
  }));
  await page.goto("/fa/auth/register");
  await page.locator("#otp-phone").fill("۰۹۱۲۳۴۵۶۷۸۹");
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  await expect(page.getByText("ثبت‌نام در حال حاضر در دسترس نیست.")).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/register$/);
  await expect(page.locator(".auth-preview")).toBeHidden();
});

for (const purpose of ["register", "recovery"] as const) {
test(`${purpose} uses server challenge and grant then confirms session`, async ({ page }) => {
  await page.route("**/api/v1/auth/otp/request", route => route.fulfill({
    status: 202, contentType: "application/json", body: JSON.stringify({
      challenge_id: "2d35793f-cf30-42f1-9559-639e12fb6311", purpose,
      expires_at: new Date(Date.now() + 180000).toISOString(), resend_after_seconds: 60, delivery_status: "accepted",
    }),
  }));
  await page.route("**/api/v1/auth/otp/verify", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      grant: "test-only-" + "x".repeat(40), purpose, expires_in_seconds: 600,
    }),
  }));
  await page.route(`**/api/v1/auth/${purpose}/complete`, route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      account_id: "test-account", csrf_token: "test-csrf", expires_at: new Date(Date.now() + 86400000).toISOString(),
    }),
  }));
  await page.route("**/api/v1/auth/session", route => route.fulfill({
    contentType: "application/json", body: JSON.stringify({ account_id: "test-account" }),
  }));
  await page.goto(purpose === "register" ? "/en/auth/register" : "/en/auth/forgot-password");
  await page.locator("#otp-phone").fill("09123456789");
  await page.getByRole("button", { name: purpose === "register" ? "Get verification code" : "Get recovery code" }).click();
  await expect(page.locator("#verify-code")).toBeVisible();
  await expect(page.locator(".auth-preview")).toBeHidden();
  await page.locator("#verify-code").fill("۱۲۳۴۵۶");
  await page.getByRole("button", { name: purpose === "register" ? "Verify and continue" : "Verify and reset password" }).click();
  await expect(page.getByRole("heading", { name: purpose === "register" ? "Set a password for your account" : "Set a new password" })).toBeVisible();
  await page.locator("#registration-password").fill("a long secure passphrase");
  await page.locator("#registration-confirm").fill("a long secure passphrase");
  await page.getByRole("button", { name: purpose === "register" ? "Complete registration" : "Save new password" }).click();
  await expect(page.getByText(purpose === "register" ? "Account created and your session verified." : "Password updated, previous sessions revoked and your new session verified.")).toBeVisible();
  expect(page.url()).not.toContain("test-only");
});
}

test("reload cannot restore an OTP grant from browser storage", async ({ page }) => {
  await page.goto("/en/auth/verify");
  await expect(page.getByText("Request a code before verifying your phone number.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Request a code before verifying your phone number.")).toBeVisible();
  await page.goto("/en/auth/register/password");
  await expect(page.getByText("Verify your phone number again to set a password.")).toBeVisible();
});
