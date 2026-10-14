import {expect,test} from "@playwright/test"
test("country selector and phone input stay separate in Persian and English",async({page})=>{
 for(const language of ["fa","en"]){
  for(const width of [979,390,320]){
   await page.setViewportSize({width,height:900})
   await page.goto(`/${language}/auth/register?returnTo=%2F${language}%2Fcommissions%2Fnew%2Freferences`)
   const country=page.locator(".password-phone [role=combobox]")
   const phone=page.locator("#otp-phone")
   await phone.fill("9991881995")
   await expect(phone).toHaveValue("9991881995")
   const selectorBox=await country.boundingBox(),phoneBox=await phone.boundingBox()
   expect(selectorBox).not.toBeNull();expect(phoneBox).not.toBeNull()
   expect(selectorBox!.x+selectorBox!.width).toBeLessThanOrEqual(phoneBox!.x)
   expect(selectorBox!.width).toBeGreaterThan(80)
   await country.click()
   await expect(page.getByRole("option").first()).toBeVisible()
   await page.keyboard.press("Escape")
   await expect(phone).toHaveValue("9991881995")
   if(language==="fa"&&width===979)await page.screenshot({path:"/tmp/nilart-phone-layout.png"})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  }
 }
})
