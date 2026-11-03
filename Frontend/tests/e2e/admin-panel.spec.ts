import {expect,test,type Page} from "@playwright/test"
const owner="00000000-0000-4000-8000-000000000001",product="00000000-0000-4000-8000-000000000002",id="00000000-0000-4000-8000-000000000003"
const entry={id:product,kind:"products",slug:"test-book",title_fa:"دفتر آزمایش",title_en:"Test notebook",description_fa:"",description_en:"",collection_ids:[],category_ids:[],published:true,version:0}
async function setup(page:Page,permissions=["catalog.manage","identity.manage","pricing.publish"]){
 await page.route("**/api/v1/auth/access",route=>route.fulfill({json:{account_id:owner,roles:["admin"],permissions}}))
 await page.route("**/api/v1/auth/session/csrf",route=>route.fulfill({json:{csrf_token:"fresh-test-csrf"}}))
 await page.route("**/api/v1/admin/catalog/entries/products?*",route=>route.fulfill({json:{items:[entry],total:1}}))
 await page.route(`**/api/v1/admin/catalog/entries/products/${product}/skus`,route=>route.fulfill({json:[{id,code:"TEST-BOOK",published:true,version:0,price:{amount:"12.000001",currency:"IRT"}}]}))
}
test("dashboard uses reference shell without prototype metrics",async({page})=>{
 await setup(page)
 await page.goto("/en/admin")
 await expect(page.getByRole("heading",{name:"Dashboard",exact:true})).toBeVisible()
 await expect(page.getByText("Verified session",{exact:true})).toBeVisible()
 await expect(page.getByText("Sample data",{exact:false})).toHaveCount(0)
 await expect(page.getByText("NA-1042",{exact:false})).toHaveCount(0)
 await page.getByRole("button",{name:"View and manage"}).nth(1).click()
 await expect(page.getByRole("heading",{name:"Products & SKUs",exact:true})).toBeVisible()
 await expect(page.getByText("Test notebook",{exact:true})).toBeVisible()
 await page.screenshot({path:"/tmp/nilart-admin-products-desktop.png",fullPage:true})
})
test("price editor preserves decimals, CSRF, optimistic version and acknowledged state",async({page})=>{
 await setup(page)
 let saved:unknown,csrf:string|undefined
 let record={sku_id:id,product_id:product,code:"TEST-BOOK",version:7,price:{amount:"12.000001",currency:"IRT"}}
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price`,route=>{
 if(route.request().method()==="PUT"){saved=route.request().postDataJSON();csrf=route.request().headers()["x-csrf-token"];record={...record,...route.request().postDataJSON(),version:8}}
 return route.fulfill({json:record})
 })
 await page.goto("/en/admin/products")
 await page.getByRole("button",{name:"View SKUs & prices"}).click()
 await page.getByRole("button",{name:"Edit price",exact:true}).click()
 await page.getByLabel("Exact amount",{exact:false}).fill("100.123456")
 await page.getByRole("button",{name:"Reload",exact:true}).click()
 await expect(page.getByRole("dialog")).toBeVisible()
 await page.getByRole("button",{name:"Keep editing",exact:true}).click()
 await page.getByRole("button",{name:"Confirm and save price",exact:true}).click()
 await expect(page.getByText("Price saved and audited.",{exact:true})).toBeVisible()
 expect(saved).toEqual({version:7,price:{amount:"100.123456",currency:"IRT"}})
 expect(csrf).toBe("fresh-test-csrf")
 await page.reload()
 await page.getByRole("button",{name:"View SKUs & prices"}).click()
 await page.getByRole("button",{name:"Edit price",exact:true}).click()
 await expect(page.getByLabel("Exact amount",{exact:false})).toHaveValue("100.123456")
})
test("conflicting price writes retain input and require an explicit reload",async({page})=>{
 await setup(page)
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price`,route=>route.request().method()==="PUT"?route.fulfill({status:409,json:{code:"sku_price_version_conflict"}}):route.fulfill({json:{sku_id:id,product_id:product,code:"TEST-BOOK",version:1,price:null}}))
 await page.goto("/en/admin/products")
 await page.getByRole("button",{name:"View SKUs & prices"}).click()
 await page.getByRole("button",{name:"Edit price",exact:true}).click()
 await page.getByLabel("Exact amount",{exact:false}).fill("99")
 await page.getByRole("button",{name:"Confirm and save price",exact:true}).click()
 await expect(page.getByRole("alert").filter({hasText:"Price changed"})).toHaveText("Price changed. Reload before saving.")
 await expect(page.getByRole("button",{name:"Confirm and save price",exact:true})).toBeDisabled()
 await expect(page.getByLabel("Exact amount",{exact:false})).toHaveValue("99")
})
test("catalog route denies finance accounts before reading catalog",async({page})=>{
 await setup(page,["finance.read"])
 let reads=0
 await page.route("**/api/v1/admin/catalog/**",route=>{reads++;return route.fulfill({status:500})})
 await page.goto("/en/admin/products")
 await expect(page.getByRole("heading",{name:"Access denied",exact:true})).toBeVisible()
 expect(reads).toBe(0)
})
test("Persian mobile shell opens navigation, switches language and fits viewport",async({page})=>{
 await setup(page)
 await page.setViewportSize({width:390,height:844})
 await page.goto("/fa/admin")
 await expect(page.getByRole("heading",{name:"داشبورد",exact:true})).toBeVisible()
 await page.getByRole("button",{name:"باز کردن منو",exact:true}).click()
 await expect(page.getByRole("dialog")).toBeVisible()
 await page.getByRole("dialog").getByText("کاتالوگ",{exact:true}).click()
 await page.getByRole("dialog").getByRole("button",{name:"محصولات و SKU",exact:true}).click()
 await expect(page.getByText("دفتر آزمایش",{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.screenshot({path:"/tmp/nilart-admin-products-mobile.png",fullPage:true})
 await page.getByRole("button",{name:"EN",exact:true}).click()
 await expect(page.getByRole("heading",{name:"Products & SKUs",exact:true})).toBeVisible()
})

test("unknown price result is never presented as success or automatically retried",async({page})=>{
 await setup(page)
 let writes=0
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price`,route=>{if(route.request().method()==="PUT"){writes++;return route.abort("failed")}return route.fulfill({json:{sku_id:id,product_id:product,code:"TEST-BOOK",version:0,price:null}})})
 await page.goto("/en/admin/products")
 await page.getByRole("button",{name:"View SKUs & prices"}).click()
 await page.getByRole("button",{name:"Edit price",exact:true}).click()
 await page.getByLabel("Exact amount",{exact:false}).fill("100")
 await page.getByRole("button",{name:"Confirm and save price",exact:true}).click()
 await expect(page.getByText("Save unconfirmed. Reload the price before resubmitting.",{exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"Confirm and save price",exact:true})).toBeDisabled()
 await expect(page.getByText("Price saved and audited.",{exact:true})).toHaveCount(0)
 expect(writes).toBe(1)
})

test("catalog loading failure offers retry and confirmed empty lists are explicit",async({page})=>{
 await setup(page)
 let failed=true
 await page.route("**/api/v1/admin/catalog/entries/products?*",route=>failed?route.fulfill({status:503,json:{code:"unavailable"}}):route.fulfill({json:{items:[],total:0}}))
 await page.goto("/en/admin/products")
 await expect(page.getByText("Unable to load catalog.",{exact:true})).toBeVisible()
 failed=false
 await page.getByRole("button",{name:"Reload",exact:true}).click()
 await expect(page.getByText("No records found.",{exact:true})).toBeVisible()
})

for(const [section,kind,title] of [["collections","collections","Collections & categories"],["categories","categories","Categories"],["bundles","bundles","Packages"],["artworks","artworks","Ready artworks"]]){
 test(`${section} opens its catalog contract`,async({page})=>{
 await setup(page)
 const managed=["collections","categories"].includes(kind)
 await page.route(`**/api/v1/${managed?"admin/catalog/entries":"catalog"}/${kind}?*`,route=>route.fulfill({json:{items:[{...entry,kind,slug:"reference-item",title_fa:"نمونه",title_en:"Published reference item"}],total:1}}))
 await page.goto(`/en/admin/${section}`)
 await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible()
 await expect(page.getByText("Published reference item",{exact:true})).toBeVisible()
 await expect(page.getByRole("link",{name:"View in store",exact:true})).toHaveAttribute("href",`/en/${kind}/reference-item`)
 })
}

test("draft SKU creation uses the protected product and never publishes or prices it",async({page})=>{
 await setup(page)
 let saved:unknown
 await page.route(`**/api/v1/admin/catalog/products/${product}/skus`,route=>{saved=route.request().postDataJSON();return route.fulfill({status:201,json:{sku_id:"00000000-0000-4000-8000-000000000004",product_id:product,code:"NEW-DRAFT",version:1,published:false}})})
 await page.goto("/en/admin/products")
 await page.getByRole("button",{name:"View SKUs & prices",exact:true}).click()
 await page.getByLabel("New SKU code",{exact:true}).fill("NEW-DRAFT")
 await page.getByRole("button",{name:"Create draft SKU",exact:true}).click()
 await expect(page.getByText("SKU created as a draft.",{exact:true})).toBeVisible()
 await expect(page.getByText("NEW-DRAFT · Draft",{exact:true})).toBeVisible()
 expect(saved).toEqual({code:"NEW-DRAFT"})
 await expect(page.getByLabel("New SKU code",{exact:true})).toHaveValue("")
})
test("price history preserves decimals, currency and removals with retry and pagination",async({page})=>{
 await setup(page)
 await page.setViewportSize({width:390,height:844})
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price`,route=>route.fulfill({json:{sku_id:id,product_id:product,code:"TEST-BOOK",version:2,price:null}}))
 let attempts=0
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price/audits*`,route=>{
  attempts++;if(attempts===1)return route.fulfill({status:503,json:{code:"service_unavailable"}})
  const older=route.request().url().includes("before_version=2")
  return route.fulfill({json:{items:[{id:older?owner:id,sku_id:id,product_id:product,actor_id:owner,previous_version:older?0:1,version:older?1:2,created_at:"2026-10-13T12:00:00Z",before:{price:older?null:{amount:"100.123456",currency:"IRR"}},after:{price:older?{amount:"100.123456",currency:"IRR"}:null}}],next_before_version:older?null:2}})
 })
 await page.goto("/en/admin/products")
 await page.getByRole("button",{name:"View SKUs & prices"}).click()
 await page.getByRole("button",{name:"Edit price",exact:true}).click()
 await page.getByRole("button",{name:"Load price history"}).click()
 await expect(page.getByText("Unable to load price history.",{exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Load price history"}).click()
 await expect(page.getByText("100.123456 IRR",{exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Older price history"}).click()
 await expect(page.getByText("100.123456 IRR",{exact:true})).toHaveCount(2)
 await expect(page.getByRole("button",{name:"Older price history"})).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})
test("catalog search queries all records and resets pagination",async({page})=>{
 await setup(page)
 const requests:string[]=[]
 await page.route("**/api/v1/admin/catalog/entries/products?*",route=>{
  const url=new URL(route.request().url());requests.push(url.search)
  return route.fulfill({json:{items:[url.searchParams.get("q")?{...entry,title_en:"Far record",slug:"far-record"}:entry],total:url.searchParams.get("q")?1:50}})
 })
 await page.goto("/en/admin/products")
 await page.getByRole("button",{name:"Next",exact:true}).click()
 await expect.poll(()=>requests.some(r=>r.includes("page=2"))).toBe(true)
 await page.getByLabel("Search catalog",{exact:true}).fill("Far record")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByText("Far record",{exact:true}).first()).toBeVisible()
 await expect.poll(()=>requests.some(r=>r.includes("page=1")&&r.includes("q=Far%20record"))).toBe(true)
 await expect(page.getByRole("button",{name:"Next",exact:true})).toBeDisabled()
 await page.getByRole("button",{name:"Clear search"}).click()
 await expect(page.getByText("Test notebook",{exact:true})).toBeVisible()
})
test("catalogue-only staff can view prices but cannot edit or publish them",async({page})=>{
 await setup(page,["catalog.manage"])
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price`,route=>route.fulfill({json:{sku_id:id,product_id:product,code:"TEST-BOOK",version:7,price:{amount:"12.000001",currency:"IRT"}}}))
 await page.route(`**/api/v1/admin/catalog/skus/${id}/price/audits*`,route=>route.fulfill({json:{items:[],next_before_version:null}}))
 await page.goto('/en/admin/products')
 await page.getByRole('button',{name:'View SKUs & prices',exact:true}).click()
 await page.getByRole('button',{name:'View price',exact:true}).click()
 await expect(page.getByLabel('Exact amount',{exact:false})).toBeDisabled()
 await expect(page.getByRole('button',{name:'Confirm and save price',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Edit price',exact:true})).toHaveCount(0)
})
