import {expect,test} from "@playwright/test"
test("verification shows only the server's development sandbox code",async({page})=>{
 let visible=true
 await page.route("**/api/v1/auth/otp/request",route=>route.fulfill({status:202,json:{challenge_id:"11111111-1111-4111-8111-111111111111",purpose:"register",expires_at:new Date(Date.now()+180000).toISOString(),resend_after_seconds:60,delivery_status:"accepted",sandbox:true,...(visible?{development_code:"384629"}:{})}}))
 for(const language of ["fa","en"]){
  await page.goto(`/${language}/auth/register`)
  await page.locator("#otp-phone").fill("9123456789")
  await page.locator(".password-submit").click()
  await expect(page).toHaveURL(/auth\/verify/)
  await expect(page.getByText("384629",{exact:true})).toBeVisible()
 }
 visible=false
 await page.goto("/en/auth/register")
 await page.locator("#otp-phone").fill("9123456789")
 await page.locator(".password-submit").click()
 await expect(page).toHaveURL(/auth\/verify/)
 await expect(page.getByText("384629",{exact:true})).toHaveCount(0)
})
