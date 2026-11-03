import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001"
const initial={id,order_id:id,version:0,kind:"cancellation",status:"submitted",public_reply:"",payload:{reason:"Changed my plans",quantities:{}},created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z"}
async function setup(page:Page,mode="normal",permissions=["orders.read_all","fulfillment.manage","orders.read_self","account.read_self"]){
 let saved=structuredClone(initial);const writes:{key:string;body:Record<string,unknown>}[]=[]
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:id,roles:["admin"],permissions}}))
 await page.route("**/api/v1/auth/session/csrf",r=>r.fulfill({json:{csrf_token:"review-token"}}))
 await page.route("**/api/v1/admin/order-requests**",async r=>{const req=r.request(),url=new URL(req.url());if(req.method()==="PUT"){const body=req.postDataJSON();writes.push({key:url.pathname.split("/").at(-1)!,body});expect(req.headers()["x-csrf-token"]).toBe("review-token");saved={...saved,version:body.version+1,status:body.status,public_reply:body.reply};if(mode==="lost"&&writes.length===1)return r.abort("failed");return r.fulfill({json:saved})}return r.fulfill({json:url.pathname.endsWith(id)?saved:{items:[saved],next_cursor:null}})})
 await page.route("**/api/v1/account/requests?*",r=>r.fulfill({json:{items:[saved],next_cursor:null}}))
 return writes
}
async function open(page:Page){await page.goto("/en/admin/order-requests");await page.getByRole("button",{name:"Review request",exact:true}).click();await expect(page.getByLabel("Customer-visible reply")).toBeVisible()}
test("staff decision persists and customer sees recorded response",async({page})=>{const writes=await setup(page);page.on("dialog",d=>d.accept());await open(page);await page.getByLabel("Customer-visible reply").fill("Checking your request");await page.getByRole("button",{name:"Record decision",exact:true}).click();await expect(page.getByText("Decision recorded.",{exact:true})).toBeVisible();expect(writes[0].body).toEqual({version:0,status:"in_review",reply:"Checking your request"});await page.goto("/en/account/requests");await expect(page.getByText("Checking your request",{exact:true})).toBeVisible();await expect(page.locator("article.customer-order-card").getByText("Under review",{exact:true})).toBeVisible()})
test("lost response reconciles saved decision without second write",async({page})=>{const writes=await setup(page,"lost");page.on("dialog",d=>d.accept());await open(page);await page.getByLabel("Customer-visible reply").fill("Checking your request");await page.getByRole("button",{name:"Record decision",exact:true}).click();await expect(page.getByRole("button",{name:"Retry same decision"})).toBeVisible();await expect(page.getByLabel("Customer-visible reply")).toBeDisabled();await page.getByRole("button",{name:"Check result and refresh request"}).click();await expect(page.getByText("Saved decision confirmed.",{exact:true})).toBeVisible();expect(writes).toHaveLength(1)})
test("read-only staff can inspect but cannot record decisions",async({page})=>{const writes=await setup(page,"normal",["orders.read_all"]);await open(page);await expect(page.getByLabel("Customer-visible reply")).toBeDisabled();await expect(page.getByText("You have read-only access.",{exact:true})).toBeVisible();expect(writes).toHaveLength(0)})
test("Persian mobile request review fits without overflow",async({page})=>{await setup(page);await page.setViewportSize({width:390,height:844});await page.goto("/fa/admin/order-requests");await page.getByRole("button",{name:"بررسی درخواست",exact:true}).click();await expect(page.getByText("جزئیات درخواست",{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()})
test("queue searches and combines server filters",async({page})=>{
 await setup(page)
 const queries:URLSearchParams[]=[]
 await page.route("**/api/v1/admin/order-requests?*",r=>{const params=new URL(r.request().url()).searchParams;queries.push(params);return r.fulfill({json:{items:params.get("q")==="missing"||params.get("kind")==="return"?[]:[initial],next_cursor:null}})})
 await page.goto("/en/admin/order-requests")
 await expect(page.getByRole("button",{name:"Review request",exact:true})).toBeVisible()
 await page.getByLabel("Search reason, ID or order reference").fill("missing")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByText("No requests match these filters.",{exact:true})).toBeVisible()
 expect(queries.at(-1)?.get("q")).toBe("missing")
 await page.getByRole("button",{name:"Clear search",exact:true}).click()
 await expect(page.getByRole("button",{name:"Review request",exact:true})).toBeVisible()
 await page.getByRole("combobox",{name:"Request type",exact:true}).click()
 await page.getByRole("option",{name:"Return",exact:true}).click()
 await expect(page.getByText("No requests match these filters.",{exact:true})).toBeVisible()
 expect(queries.at(-1)?.get("kind")).toBe("return")
 await page.getByRole("combobox",{name:"Request status",exact:true}).click()
 await page.getByRole("option",{name:"Submitted",exact:true}).click()
 await expect.poll(()=>queries.at(-1)?.get("status")).toBe("submitted")
 expect(queries.at(-1)?.get("kind")).toBe("return")
})
test("decision history retries reads, paginates and resets after recording",async({page})=>{
 await setup(page)
 const older="00000000-0000-4000-8000-000000000002"
 let reads=0
 await page.route("**/api/v1/admin/order-requests/*/reviews?*",r=>r.fulfill({json:{items:[{id:older,request_id:id,actor_id:id,status:"in_review",reply:"Earlier recorded reply",expected_version:0,created_at:initial.created_at}],next_cursor:null}}))
 await page.route("**/api/v1/admin/order-requests/*/reviews",r=>{reads++;return reads===1?r.fulfill({status:503,json:{error:{code:"unavailable"}}}):r.fulfill({json:{items:[{id,request_id:id,actor_id:id,status:"rejected",reply:"Latest recorded reply",expected_version:1,created_at:initial.updated_at}],next_cursor:id}})})
 await open(page)
 const history=page.getByRole("region",{name:"Decision history",exact:true})
 await history.getByRole("button",{name:"Load decision history",exact:true}).click()
 await expect(history.getByRole("alert")).toHaveText("Unable to load decision history.")
 await history.getByRole("button",{name:"Load decision history",exact:true}).click()
 await expect(history.getByText("Latest recorded reply",{exact:true})).toBeVisible()
 await history.getByRole("button",{name:"Older decisions",exact:true}).click()
 await expect(history.getByText("Earlier recorded reply",{exact:true})).toBeVisible()
 await expect(history.getByRole("button",{name:"Older decisions",exact:true})).toHaveCount(0)
 await page.getByLabel("Customer-visible reply").fill("Checking this request")
 page.once("dialog",d=>d.accept())
 await page.getByRole("button",{name:"Record decision",exact:true}).click()
 await expect(page.getByText("Decision recorded.",{exact:true})).toBeVisible()
 await expect(history.getByText("Latest recorded reply",{exact:true})).toHaveCount(0)
})
test("return review loads saved line names and requested quantities with retry",async({page})=>{
 await setup(page)
 const line="00000000-0000-4000-8000-000000000002"
 const request={...initial,kind:"return",payload:{reason:"One notebook damaged",quantities:{[line]:1}}}
 await page.route("**/api/v1/admin/order-requests**",r=>r.fulfill({json:new URL(r.request().url()).pathname.endsWith(id)?request:{items:[request],next_cursor:null}}))
 let fail=true
 const {contextOrder}=await import("../order-context-fixture")
 await page.route("**/api/v1/admin/orders/*",r=>fail?r.fulfill({status:503,json:{code:"unavailable"}}):r.fulfill({json:{...contextOrder,state:{...contextOrder.state,fulfillment:"delivered",delivered:{[line]:2}}}}))
 await open(page)
 const context=page.getByRole("region",{name:"Order review context",exact:true})
 await context.getByRole("button",{name:"Load order context",exact:true}).click()
 await expect(context.getByRole("alert")).toHaveText("Unable to load matching order context. Try again.")
 fail=false
 await context.getByRole("button",{name:"Load order context",exact:true}).click()
 const row=context.getByRole("row").filter({hasText:"Notebook"})
 await expect(row).toContainText("BOOK")
 await expect(row.getByRole("cell").nth(3)).toHaveText("2")
 await expect(row.getByRole("cell").nth(4)).toHaveText("2")
 await expect(row.getByRole("cell").nth(5)).toHaveText("1")
 await page.getByLabel("Customer-visible reply").fill("Keep this reply draft")
 page.once("dialog",d=>d.dismiss())
 await context.getByRole("button",{name:"View saved order",exact:true}).click()
 await expect(page).toHaveURL(new RegExp(`order-requests/${id}$`))
 await expect(page.getByLabel("Customer-visible reply")).toHaveValue("Keep this reply draft")
 await page.setViewportSize({width:390,height:844})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("review URLs survive reload and guard returning to the queue",async({page})=>{
 await setup(page)
 await open(page)
 await expect(page).toHaveURL(new RegExp(`order-requests/${id}$`))
 await page.reload()
 await expect(page.getByLabel("Customer-visible reply")).toBeVisible()
 await page.getByLabel("Customer-visible reply").fill("Unsaved review draft")
 page.once("dialog",d=>d.dismiss())
 await page.getByRole("button",{name:"Back to requests",exact:true}).click()
 await expect(page.getByLabel("Customer-visible reply")).toHaveValue("Unsaved review draft")
 await expect(page).toHaveURL(new RegExp(`order-requests/${id}$`))
 page.once("dialog",d=>d.accept())
 await page.getByRole("button",{name:"Back to requests",exact:true}).click()
 await expect(page).toHaveURL(/\/en\/admin\/order-requests$/)
 await expect(page.getByRole("button",{name:"Review request",exact:true})).toBeVisible()
})
test("direct review read failure has retry and no invented detail",async({page})=>{
 await setup(page)
 let fail=true
 await page.route(`**/api/v1/admin/order-requests/${id}`,r=>fail?r.fulfill({status:404,json:{code:"request_not_found"}}):r.fulfill({json:initial}))
 await page.goto(`/en/admin/order-requests/${id}`)
 await expect(page.getByRole("main").getByRole("alert")).toHaveText("Unable to load request.")
 await expect(page.getByLabel("Customer-visible reply")).toHaveCount(0)
 fail=false
 await page.getByRole("button",{name:"Reload request",exact:true}).click()
 await expect(page.getByLabel("Customer-visible reply")).toBeVisible()
})
test("direct review URL denies unauthorized staff before requesting its detail",async({page})=>{await setup(page,"normal",["catalog.manage"]);let reads=0;await page.route(`**/api/v1/admin/order-requests/${id}`,r=>{reads++;return r.fulfill({json:initial})});await page.goto(`/en/admin/order-requests/${id}`);await expect(page.getByRole("heading",{name:/access|permission/i})).toBeVisible();expect(reads).toBe(0);await expect(page.getByLabel("Customer-visible reply")).toHaveCount(0)})
