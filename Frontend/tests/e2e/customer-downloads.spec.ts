import {createHash} from "node:crypto"
import {readFile} from "node:fs/promises"
import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001",content=Buffer.from("private final artwork bytes")
const file={id,order_id:id,line_id:id,file_name:"اثر نهایی.pdf",description:"Final purchased file",size:content.length,sha256:createHash("sha256").update(content).digest("hex"),version:0,created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",order_reference:"TEST-ORDER"}
async function access(page:Page){await page.route("**/api/v1/auth/access",route=>route.fulfill({json:{account_id:id,roles:["customer"],permissions:["account.read_self","orders.read_self"]}}))}
test("released file downloads with exact private bytes and Unicode filename",async({page})=>{
 await access(page);await page.route("**/api/v1/account/downloads?*",route=>route.fulfill({json:{items:new URL(route.request().url()).searchParams.get("q")==="missing"?[]:[file],next_cursor:null}}));await page.route(`**/api/v1/account/downloads/${id}/content`,route=>route.fulfill({body:content,contentType:"application/octet-stream",headers:{"Cache-Control":"no-store"}}))
 await page.goto("/en/account/downloads");const download=page.waitForEvent("download");await page.getByRole("button",{name:"Download file",exact:true}).click();const saved=await download
 expect(saved.suggestedFilename()).toBe(file.file_name);const path=await saved.path();expect(path).toBeTruthy();expect(await readFile(path!)).toEqual(content)
})
test("revoked link fails without a browser download and refresh removes it",async({page})=>{
 await access(page);let revoked=false,downloads=0;page.on("download",()=>downloads++)
 await page.route("**/api/v1/account/downloads?*",route=>route.fulfill({json:{items:revoked?[]:[file],next_cursor:null}}));await page.route(`**/api/v1/account/downloads/${id}/content`,route=>route.fulfill({status:404,json:{code:"file_not_found"}}))
 await page.goto("/en/account/downloads");await page.getByRole("button",{name:"Download file",exact:true}).click();await expect(page.getByText(/The file could not be downloaded/)).toBeVisible();revoked=true;await page.getByRole("button",{name:"Refresh",exact:true}).click();await expect(page.getByRole("heading",{name:"No files ready to download",exact:true})).toBeVisible();expect(downloads).toBe(0)
})
test("mismatched checksum blocks saving the file",async({page})=>{
 await access(page);let downloads=0;page.on("download",()=>downloads++)
 await page.route("**/api/v1/account/downloads?*",route=>route.fulfill({json:{items:new URL(route.request().url()).searchParams.get("q")==="missing"?[]:[file],next_cursor:null}}));await page.route(`**/api/v1/account/downloads/${id}/content`,route=>route.fulfill({body:Buffer.alloc(content.length,1),contentType:"application/octet-stream"}))
 await page.goto("/en/account/downloads");await page.getByRole("button",{name:"Download file",exact:true}).click();await expect(page.getByText(/The file could not be downloaded/)).toBeVisible();expect(downloads).toBe(0)
})
test("Persian mobile library supports search and owned order links",async({page})=>{
 await access(page);await page.route("**/api/v1/account/downloads?*",route=>route.fulfill({json:{items:new URL(route.request().url()).searchParams.get("q")==="missing"?[]:[file],next_cursor:null}}));await page.setViewportSize({width:390,height:844});await page.goto("/fa/account/downloads")
 await expect(page.getByRole("heading",{name:file.file_name,exact:true})).toBeVisible();await page.getByRole("searchbox").fill("missing");await page.getByRole("button",{name:"جستجو",exact:true}).click();await expect(page.getByText("فایلی با این جستجو پیدا نشد.",{exact:true})).toBeVisible();await page.getByRole("searchbox").fill("TEST-ORDER");await page.getByRole("button",{name:"جستجو",exact:true}).click();await expect(page.getByRole("link",{name:"TEST-ORDER",exact:true})).toHaveAttribute("href",`/fa/account/orders/${id}`);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("cancelled retrieval saves no file and a later download still works",async({page})=>{
 await access(page);let release!:()=>void,requests=0,downloads=0;const gate=new Promise<void>(done=>{release=done});page.on("download",()=>downloads++)
 await page.route("**/api/v1/account/downloads?*",r=>r.fulfill({json:{items:new URL(r.request().url()).searchParams.get("q")==="missing"?[]:[file],next_cursor:null}}))
 await page.route(`**/api/v1/account/downloads/${id}/content`,async r=>{requests++;if(requests===1)await gate;await r.fulfill({body:content,contentType:"application/octet-stream"}).catch(()=>{})})
 await page.goto("/en/account/downloads");const started=page.waitForRequest(request=>request.url().endsWith(`/downloads/${id}/content`));await page.getByRole("button",{name:"Download file",exact:true}).click();await started
 await page.getByRole("button",{name:"Cancel file retrieval",exact:true}).click();await expect(page.getByText("File retrieval cancelled.",{exact:true})).toBeVisible();release();expect(downloads).toBe(0)
 const saved=page.waitForEvent("download");await page.getByRole("button",{name:"Download file",exact:true}).click();const result=await saved;expect(result.suggestedFilename()).toBe(file.file_name);expect(downloads).toBe(1)
})
test("Persian mobile file details and clear search preserve the library",async({page})=>{
 await access(page);await page.route("**/api/v1/account/downloads?*",r=>r.fulfill({json:{items:new URL(r.request().url()).searchParams.get("q")==="missing"?[]:[file],next_cursor:null}}))
 await page.setViewportSize({width:390,height:844});await page.goto("/fa/account/downloads")
 await page.getByRole("button",{name:"جزئیات فایل",exact:true}).click();await expect(page.getByText(file.sha256,{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.getByRole("searchbox").fill("missing");await page.getByRole("button",{name:"پاک کردن جستجو",exact:true}).click();await expect(page.getByRole("heading",{name:file.file_name,exact:true})).toBeVisible()
})
test("digital order opens scoped files and can return to the full library",async({page})=>{
 await access(page)
 const order={id,version:0,created_at:file.created_at,updated_at:file.updated_at,snapshot:{reference:"TEST-ORDER",currency:"IRR",items:[{id,title_fa:"اثر",title_en:"Artwork",sku:"ART",options_fa:"",options_en:"",quantity:1,unit_amount:"100",discount_amount:"0",delivery:"digital",returnable:false}],shipping_amount:"0",tax_amount:"0",total_amount:"100",recipient:"Customer",address:"",receipt:null},state:{payment:"paid",fulfillment:"unshipped",delivered:{},return_until:null,refunded_amount:"0"}}
 const queries:URLSearchParams[]=[]
 await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:order}))
 await page.route("**/api/v1/account/downloads?*",r=>{queries.push(new URL(r.request().url()).searchParams);return r.fulfill({json:{items:[file],next_cursor:null}})})
 await page.goto(`/en/account/orders/${id}`);await page.getByRole("link",{name:"View order files",exact:true}).click()
 await expect(page).toHaveURL(new RegExp(`/en/account/downloads\\?order=${id}$`));await expect(page.getByRole("heading",{name:file.file_name,exact:true})).toBeVisible();expect(queries.at(-1)?.get("order_id")).toBe(id)
 await page.getByRole("link",{name:"View all files",exact:true}).click();await expect(page).toHaveURL(/\/en\/account\/downloads$/);await expect(page.getByRole("heading",{name:file.file_name,exact:true})).toBeVisible();expect(queries.at(-1)?.has("order_id")).toBe(false)
})
test("Persian mobile scoped empty view keeps order and full-library links",async({page})=>{
 await access(page);await page.route("**/api/v1/account/downloads?*",r=>r.fulfill({json:{items:[],next_cursor:null}}))
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/downloads?order=${id}`)
 await expect(page.getByRole("heading",{name:"فایلی از این سفارش برای دانلود در دسترس نیست",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"مشاهده همه فایل‌ها",exact:true})).toHaveAttribute("href","/fa/account/downloads")
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("full-library search preserves order scope through pagination and refresh",async({page})=>{
 await access(page);const queries:URLSearchParams[]=[]
 await page.route("**/api/v1/account/downloads?*",r=>{const params=new URL(r.request().url()).searchParams;queries.push(params);return r.fulfill({json:{items:[file],next_cursor:params.get("q")&&!params.has("cursor")?id:null}})})
 await page.goto(`/en/account/downloads?order=${id}`)
 await expect(page.getByRole("heading",{name:file.file_name,exact:true})).toBeVisible()
 await page.getByRole("searchbox",{name:"Search all files",exact:true}).fill(" Final ")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await page.getByRole("button",{name:"More files",exact:true}).click()
 await expect(page.getByRole("button",{name:"More files",exact:true})).toHaveCount(0)
 expect(queries.at(-1)?.get("q")).toBe("Final");expect(queries.at(-1)?.get("order_id")).toBe(id);expect(queries.at(-1)?.get("cursor")).toBe(id)
 await expect(page.getByRole("heading",{name:file.file_name,exact:true})).toHaveCount(1)
 await page.getByRole("button",{name:"Refresh",exact:true}).click()
 await expect(page.getByRole("button",{name:"More files",exact:true})).toBeVisible()
 expect(queries.at(-1)?.get("q")).toBe("Final");expect(queries.at(-1)?.has("cursor")).toBeFalsy()
})

test("reference layout groups files by order and keeps controls inside mobile cards",async({page})=>{
 await access(page)
 await page.route("**/api/v1/account/downloads?*",r=>r.fulfill({json:{items:[file,{...file,id:"00000000-0000-4000-8000-000000000003",file_name:"print-version.pdf"}],next_cursor:null}}))
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});await page.goto("/fa/account/downloads")
  await expect(page.locator(".downloads-order")).toHaveCount(1)
  await expect(page.locator(".downloads-order .downloads-file")).toHaveCount(2)
  await expect(page.getByRole("heading",{level:1,name:"فایل‌های دیجیتال شما"})).toBeVisible()
  await expect(page.getByRole("navigation",{name:"مسیر صفحه"}).getByText("دانلودها")).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  for(const button of await page.locator(".downloads-file .button.primary").all()){
   const bounds=await button.boundingBox();expect(bounds).toBeTruthy();expect(bounds!.width).toBeGreaterThan(100);expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width)
  }
 }
})
