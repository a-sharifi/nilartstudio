import {test,expect,type Page} from "@playwright/test"
const owner="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-000000000002"
const record={id,version:0,created_at:"2026-10-14T10:00:00Z",updated_at:"2026-10-14T10:00:00Z",snapshot:{reference:"TEST-ORDER",currency:"IRT",items:[{id:owner,title_fa:"دفتر",title_en:"Notebook",sku:"BOOK",options_fa:"",options_en:"",quantity:2,unit_amount:"100.10",discount_amount:"0.20",delivery:"physical",returnable:true}],shipping_amount:"10",tax_amount:"0",total_amount:"210.00",recipient:"Test recipient",address:"First line\nSecond line",receipt:{number:"TEST-RECEIPT",issued_at:"2026-10-14T10:00:00Z",paid_amount:"210.00"}},state:{payment:"paid",fulfillment:"unshipped",delivered:{},return_until:null,refunded_amount:"0"}}
async function setup(page:Page,permissions=["orders.read_all"]){
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:owner,roles:["operations"],permissions}}))
 await page.route("**/api/v1/admin/orders**",r=>r.fulfill({json:new URL(r.request().url()).pathname.endsWith(id)?record:{items:[record],next_cursor:null}}))
}
test("admin orders open persisted details and preserve exact money",async({page})=>{
 await setup(page);await page.goto("/en/admin/orders")
 await expect(page.getByRole("heading",{name:"Orders",exact:true})).toBeVisible()
 await expect(page.getByText("210.00 toman",{exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Details",exact:true}).click()
 await expect(page).toHaveURL(new RegExp(`${id}$`))
 await expect(page.getByRole("heading",{name:"TEST-ORDER",exact:true})).toBeVisible()
 await expect(page.getByText("Notebook",{exact:true})).toBeVisible()
 await expect(page.getByText("First line\nSecond line",{exact:true})).toBeVisible()
 await expect(page.getByText("TEST-RECEIPT",{exact:true})).toBeVisible()
 await page.reload();await expect(page.getByRole("heading",{name:"TEST-ORDER",exact:true})).toBeVisible()
})
test("order search and status filters are submitted to the server",async({page})=>{
 await setup(page);const requests:URL[]=[]
 await page.route(url=>url.pathname==="/api/v1/admin/orders",r=>{const url=new URL(r.request().url());requests.push(url);return r.fulfill({json:{items:url.searchParams.get("q")==="missing"?[]:[record],next_cursor:null}})})
 await page.goto("/en/admin/orders")
 await page.getByRole("button",{name:"Details",exact:true}).waitFor()
 await page.getByRole("combobox",{name:"Payment status"}).click();await page.getByRole("option",{name:"Paid",exact:true}).click()
 await page.getByRole("combobox",{name:"Delivery status"}).click();await page.getByRole("option",{name:"Unshipped",exact:true}).click()
 await page.getByLabel("Search order reference, item or SKU").fill("missing")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByText("No orders match these filters.",{exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.get("payment")).toBe("paid");expect(requests.at(-1)?.searchParams.get("fulfillment")).toBe("unshipped")
 await page.getByRole("button",{name:"Clear search"}).click();await expect(page.getByRole("button",{name:"Details",exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.get("q")).toBeNull()
})
test("customer accounts never read admin orders",async({page})=>{
 await setup(page,["orders.read_self"]);let reads=0
 await page.route("**/api/v1/admin/orders**",r=>{reads++;return r.fulfill({status:500})})
 await page.goto("/en/admin/orders");await expect(page.getByRole("heading",{name:"Access denied",exact:true})).toBeVisible();expect(reads).toBe(0)
})
test("Persian mobile order details fit the viewport",async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});await page.goto(`/fa/admin/orders/${id}`)
 await expect(page.getByRole("heading",{name:"TEST-ORDER",exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:"/tmp/nilart-admin-order-mobile.png",fullPage:true})
})

test("saved receipts show recorded values and a clean print view",async({page})=>{
 await setup(page);await page.goto(`/en/admin/orders/${id}`)
 await page.getByRole("button",{name:"View saved receipt"}).click()
 await expect(page).toHaveURL(new RegExp(`${id}/receipt$`))
 await expect(page.getByRole("heading",{name:"Saved receipt",exact:true})).toBeVisible()
 await expect(page.getByText("Receipt paid amount: 210.00 toman",{exact:true})).toBeVisible()
 await page.emulateMedia({media:"print"})
 await expect(page.getByRole("button",{name:"Print saved receipt"})).toBeHidden()
 await expect(page.locator('.ad-sidebar')).toBeHidden()
 await expect(page.getByText("TEST-RECEIPT",{exact:true})).toBeVisible()
 await page.screenshot({path:"/tmp/nilart-admin-receipt-print.png",fullPage:true})
})
test("orders without a saved receipt cannot print one",async({page})=>{
 await setup(page)
 await page.route(`**/api/v1/admin/orders/${id}`,r=>r.fulfill({json:{...record,snapshot:{...record.snapshot,receipt:null}}}))
 await page.goto(`/en/admin/orders/${id}/receipt`)
 await expect(page.getByText("No payment receipt is recorded for this order.",{exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"Print saved receipt"})).toHaveCount(0)
})
test("order detail loads scoped requests, retries and opens a persistent review",async({page})=>{
 await setup(page)
 let fail=true
 const queries:URLSearchParams[]=[]
 const request={id:owner,order_id:id,version:0,kind:"return",status:"submitted",public_reply:"",payload:{reason:"One notebook damaged",quantities:{[owner]:1}},created_at:record.created_at,updated_at:record.updated_at}
 await page.route("**/api/v1/admin/order-requests**",r=>{const url=new URL(r.request().url());if(url.pathname.endsWith(owner))return r.fulfill({json:request});queries.push(url.searchParams);return fail?r.fulfill({status:503,json:{code:"unavailable"}}):r.fulfill({json:{items:url.searchParams.has("cursor")?[]:[request],next_cursor:url.searchParams.has("cursor")?null:owner}})})
 await page.goto(`/en/admin/orders/${id}`)
 const section=page.getByRole("region",{name:"Requests for this order",exact:true})
 await section.getByRole("button",{name:"Load order requests",exact:true}).click()
 await expect(section.getByRole("alert")).toHaveText("Unable to load requests for this order.")
 fail=false
 await section.getByRole("button",{name:"Load order requests",exact:true}).click()
 await expect(section.getByText("One notebook damaged",{exact:true})).toBeVisible()
 expect(queries.at(-1)?.get("order_id")).toBe(id)
 await section.getByRole("button",{name:"More order requests",exact:true}).click()
 await expect.poll(()=>queries.at(-1)?.get("cursor")).toBe(owner)
 expect(queries.at(-1)?.get("order_id")).toBe(id)
 await section.getByRole("button",{name:"Open request review",exact:true}).click()
 await expect(page).toHaveURL(new RegExp(`order-requests/${owner}$`))
 await expect(page.getByLabel("Customer-visible reply")).toBeDisabled()
})
test("empty order request history and receipt isolation",async({page})=>{await setup(page);await page.route("**/api/v1/admin/order-requests?*",r=>r.fulfill({json:{items:[],next_cursor:null}}));await page.goto(`/en/admin/orders/${id}`);await page.getByRole("button",{name:"Load order requests",exact:true}).click();await expect(page.getByText("No requests recorded for this order.",{exact:true})).toBeVisible();await page.goto(`/en/admin/orders/${id}/receipt/`);await expect(page.getByRole("button",{name:"Print saved receipt",exact:true})).toBeVisible();await expect(page.getByRole("region",{name:"Requests for this order",exact:true})).toHaveCount(0)})
