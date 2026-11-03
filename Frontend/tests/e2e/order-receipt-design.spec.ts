import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001"
const order={id,version:0,created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",snapshot:{reference:"NIL-1048",currency:"IRT",items:[{id,title_fa:"دفتر طراحی گربه‌ها",title_en:"Cats sketchbook",sku:"CAT-SKETCH-A5",options_fa:"جلد سخت · کاغذ ۱۲۷ گرم",options_en:"Hardcover · 127 gsm paper",quantity:2,unit_amount:"100.10",discount_amount:"0.20",delivery:"physical",returnable:true}],shipping_amount:"10",tax_amount:"0",total_amount:"210",recipient:"مریم رضایی / Maryam Rezaei",address:"تهران، خیابان نمونه، پلاک ۱۲\nTehran, Sample Street, No. 12",receipt:{number:"REC-2026-1048",issued_at:"2026-10-13T12:00:00Z",paid_amount:"210"}},state:{payment:"paid",fulfillment:"unshipped",delivered:{},return_until:null,refunded_amount:"0"}}
async function setup(page:Page,value:unknown=order){
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:id,roles:["customer"],permissions:["account.read_self","orders.read_self"]}}))
 await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:value}))
}
test("bilingual receipt fits mobile and desktop and prints only the document",async({page})=>{
 await setup(page)
 await page.addInitScript(()=>{(window as unknown as Window&{printed:number}).printed=0;window.print=()=>{(window as unknown as Window&{printed:number}).printed++}})
 for(const language of ["fa","en"]){
  for(const width of [320,1046]){
   await page.setViewportSize({width,height:900});await page.goto(`/${language}/account/orders/${id}/receipt`)
   await expect(page.getByRole("heading",{name:"REC-2026-1048",exact:true})).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   await page.screenshot({path:`/tmp/nilart-receipt-${language}-${width}.png`,fullPage:true})
  }
  await page.getByRole("button",{name:language==="fa"?"چاپ رسید":"Print receipt",exact:true}).click()
  expect(await page.evaluate(()=>(window as unknown as Window&{printed:number}).printed)).toBe(1)
  await page.emulateMedia({media:"print"})
  await expect(page.locator(".dash-sidebar")).toBeHidden()
  await expect(page.locator(".or-toolbar")).toBeHidden()
  await expect(page.locator(".or-page-heading")).toBeHidden()
  await expect(page.locator(".order-receipt-sheet")).toBeVisible()
  await expect(page.locator(".or-lines thead")).toBeVisible()
  await page.pdf({path:`/tmp/nilart-receipt-${language}.pdf`,preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false})
  await page.emulateMedia({media:"screen"})
 }
})
test("long receipt uses a repeating print table without losing items",async({page})=>{
 const long=structuredClone(order)
 long.snapshot.items=Array.from({length:40},(_,index)=>({...order.snapshot.items[0],id:`00000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`,title_en:`Cats sketchbook — line ${index+1}`}))
 long.snapshot.total_amount="8010";long.snapshot.receipt.paid_amount="8010"
 await setup(page,long);await page.goto(`/en/account/orders/${id}/receipt`)
 await expect(page.locator(".or-lines tbody tr")).toHaveCount(40)
 await page.emulateMedia({media:"print"})
 await page.pdf({path:"/tmp/nilart-receipt-long.pdf",preferCSSPageSize:true,printBackground:true,displayHeaderFooter:false})
})
test("unissued receipt cannot print a fabricated document",async({page})=>{
 await setup(page,{...order,snapshot:{...order.snapshot,receipt:null}})
 await page.goto(`/en/account/orders/${id}/receipt`)
 await expect(page.getByText("A payment receipt has not been issued for this order.",{exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"Print receipt",exact:true})).toHaveCount(0)
 await expect(page.locator(".order-receipt-sheet")).toHaveCount(0)
})
