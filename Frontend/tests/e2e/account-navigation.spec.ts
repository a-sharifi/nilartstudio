import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001"
async function setup(page:Page){
 await page.route("**/api/v1/**",route=>{
  const path=new URL(route.request().url()).pathname
  if(path==="/api/v1/auth/access")return route.fulfill({json:{account_id:id,roles:["customer"],permissions:["account.read_self","account.write_self","orders.read_self"]}})
  if(path==="/api/v1/account/profile")return route.fulfill({json:{account_id:id,phone:"+989123456789",full_name:"Test customer",version:0}})
  if(path==="/api/v1/account/security/methods")return route.fulfill({json:{password_enabled:true,otp_enabled:false,can_change:true,sandbox_sms:false}})
  if(path.endsWith("/summary"))return route.fulfill({json:{orders:0,awaiting_delivery:0,active_requests:0,available_files:0,favorites:0,addresses:0,tickets:0,unread_notifications:0}})
  return route.fulfill({json:{items:[],next_cursor:null}})
 })
}
async function selectMenu(page:Page,language:string,destination:string){
 const menu=page.getByRole("navigation",{name:language==="fa"?"منوی حساب کاربری":"Account navigation",exact:true}).filter({visible:true})
 if(!await menu.count())await page.getByRole("button",{name:language==="fa"?"بازکردن منوی پنل":"Open account menu",exact:true}).click()
 await page.getByRole("navigation",{name:language==="fa"?"منوی حساب کاربری":"Account navigation",exact:true}).filter({visible:true}).locator(`a[href="/${language}/account${destination?`/${destination}`:""}"]`).click()
}
for(const language of ["fa","en"]){
 test(`${language} profile opens every account destination and all sections return to orders`,async({page})=>{
  await setup(page);await page.setViewportSize({width:language==="fa"?390:1440,height:900})
  const sections=["","orders","downloads","favorites","addresses","security","preferences","support","notifications"]
  for(const section of sections){
   await page.goto(`/${language}/account/profile`)
   await expect(page.getByRole("textbox",{name:language==="fa"?/نام و نام خانوادگی/:/Full name/})).toHaveValue("Test customer")
   await selectMenu(page,language,section)
   await expect(page).toHaveURL(new RegExp(`/${language}/account${section?`/${section}`:""}$`))
   await expect(page.getByText(language==="fa"?"این فرایند مستقل است و در این مرحله طراحی نشده است. شماره ورود، رمز و تنظیمات از فرم عمومی پروفایل تغییر نمی‌کنند.":"This flow is independent and not designed at this stage. Login phone, password and settings do not change through the general profile form.",{exact:true})).toHaveCount(0)
   if(section!=="orders"){
    await selectMenu(page,language,"orders")
    await expect(page).toHaveURL(new RegExp(`/${language}/account/orders$`))
   }
  }
 })
}
test("profile still protects unsaved edits before switching to orders",async({page})=>{
 await setup(page);await page.goto("/en/account/profile")
 await page.getByRole("textbox",{name:/Full name/}).fill("Unsaved name")
 await selectMenu(page,"en","orders")
 await expect(page.getByRole("dialog")).toBeVisible()
 await expect(page).toHaveURL(/\/en\/account\/profile$/)
 await page.getByRole("button",{name:"Stay on this page",exact:true}).click()
 await expect(page.getByRole("textbox",{name:/Full name/})).toHaveValue("Unsaved name")
 await selectMenu(page,"en","orders")
 await page.getByRole("button",{name:"Leave without saving",exact:true}).click()
 await expect(page).toHaveURL(/\/en\/account\/orders$/)
})
