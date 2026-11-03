import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001"
const order={id,version:0,created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",snapshot:{reference:"TEST-ORDER",currency:"IRR",items:[{id,title_fa:"دفتر",title_en:"Notebook",sku:"SKU",options_fa:"آبی",options_en:"Blue",quantity:2,unit_amount:"100.10",discount_amount:"0.20",delivery:"physical",returnable:true}],shipping_amount:"10",tax_amount:"0",total_amount:"210",recipient:"Customer",address:"Historical address",receipt:{number:"RECEIPT-1",issued_at:"2026-10-13T12:00:00Z",paid_amount:"210"}},state:{payment:"paid",fulfillment:"unshipped",delivered:{},return_until:null,refunded_amount:"0"}}
async function access(page:Page){await page.route("**/api/v1/auth/access",route=>route.fulfill({json:{account_id:id,roles:["customer"],permissions:["account.read_self","account.write_self","orders.read_self"]}}))}
test("desktop owned history, detail and issued receipt",async({page})=>{
 await access(page)
 await page.route("**/api/v1/account/orders?*",route=>route.fulfill({json:{items:[order],next_cursor:null}}))
 await page.route(`**/api/v1/account/orders/${id}`,route=>route.fulfill({json:order}))
 await page.goto("/en/account/orders")
 await page.getByRole("link",{name:"TEST-ORDER",exact:true}).click()
 await expect(page.getByText("Historical address",{exact:true})).toBeVisible()
 await expect(page.getByText("210 rial",{exact:true})).toBeVisible()
 await page.getByRole("link",{name:"View receipt",exact:true}).click()
 await expect(page.getByRole("heading",{name:"RECEIPT-1",exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"Print receipt",exact:true})).toBeVisible()
})
test("Persian mobile empty history and retry",async({page})=>{
 await access(page);let failed=true
 await page.route("**/api/v1/account/orders?*",route=>failed?route.fulfill({status:503,json:{code:"service_unavailable"}}):route.fulfill({json:{items:[],next_cursor:null}}))
 await page.setViewportSize({width:390,height:844});await page.goto("/fa/account/orders")
 await expect(page.getByText("دریافت سفارش ممکن نشد. سفارش ممکن است در دسترس نباشد.",{exact:true})).toBeVisible();failed=false
 await page.getByRole("button",{name:"تلاش دوباره",exact:true}).click()
 await expect(page.getByRole("heading",{name:"هنوز سفارشی ثبت نشده است",exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
async function requestAccess(page:Page){await access(page);await page.route("**/api/v1/auth/session/csrf",route=>route.fulfill({json:{csrf_token:"test-token"}}));await page.route(`**/api/v1/account/orders/${id}`,route=>route.fulfill({json:order}))}
test("cancellation persists as review request without changing paid order",async({page})=>{
 await requestAccess(page)
 let saved:unknown
 await page.route(`**/api/v1/account/orders/${id}/requests/*`,route=>{const body=route.request().postDataJSON();saved={id:route.request().url().split("/").at(-1),order_id:id,kind:body.kind,status:"submitted",payload:{reason:body.reason,quantities:body.quantities},created_at:order.created_at,updated_at:order.updated_at};return route.fulfill({json:saved})})
 await page.route("**/api/v1/account/requests?*",route=>route.fulfill({json:{items:saved?[saved]:[],next_cursor:null}}))
 await page.goto(`/en/account/orders/${id}/cancel`)
 await page.getByRole("textbox",{name:"Reason"}).fill("Changed my plans")
 await page.getByRole("button",{name:"Submit request",exact:true}).click()
 await expect(page.getByText("Submitted",{exact:true})).toBeVisible()
 await page.goto("/en/account/requests")
 await expect(page.getByText("Changed my plans",{exact:true})).toBeVisible()
 await expect(page.getByText(/Request status alone does not confirm a refund/)).toBeVisible()
})
test("unknown request response preserves draft and checks by request identity",async({page})=>{
 await requestAccess(page);let saved:unknown,writes=0
 await page.route(`**/api/v1/account/orders/${id}/requests/*`,route=>{writes++;const body=route.request().postDataJSON();saved={id:route.request().url().split("/").at(-1),order_id:id,kind:body.kind,status:"submitted",payload:{reason:body.reason,quantities:body.quantities},created_at:order.created_at,updated_at:order.updated_at};return route.fulfill({status:503,json:{code:"service_unavailable"}})})
 await page.route("**/api/v1/account/requests/*",route=>route.fulfill({json:saved}))
 await page.goto(`/en/account/orders/${id}/cancel`)
 await page.getByRole("textbox",{name:"Reason"}).fill("Changed my plans")
 await page.getByRole("button",{name:"Submit request",exact:true}).click()
 await expect(page.getByRole("button",{name:"Check saved result"})).toBeVisible()
 await expect(page.getByRole("textbox",{name:"Reason"})).toHaveValue("Changed my plans")
 await expect(page.getByRole("button",{name:"Submit request",exact:true})).toBeDisabled()
 await page.getByRole("button",{name:"Check saved result"}).click()
 await expect(page.getByText("Submitted",{exact:true})).toBeVisible();expect(writes).toBe(1)
})
test("customer sees recorded decision and staff reply without a refund promise",async({page})=>{
 await access(page)
 await page.route("**/api/v1/account/requests?*",route=>route.fulfill({json:{items:[{id,order_id:id,kind:"cancellation",status:"approved",version:2,public_reply:"Approved for processing <script>unsafe</script>",payload:{reason:"Changed my plans",quantities:{}},created_at:order.created_at,updated_at:order.updated_at}],next_cursor:null}}))
 await page.goto("/en/account/requests")
 await expect(page.getByRole("region",{name:"Staff reply"})).toBeVisible()
 await expect(page.getByText("Approved for processing <script>unsafe</script>",{exact:true})).toBeVisible()
 await expect(page.getByText(/Request status alone does not confirm a refund/)).toBeVisible()
 expect(await page.locator("script").filter({hasText:"unsafe"}).count()).toBe(0)
})
const trackedRequest={id,order_id:id,kind:"return",status:"approved",version:2,public_reply:"Ready for return processing",payload:{reason:"One item damaged",quantities:{[id]:1}},created_at:order.created_at,updated_at:order.updated_at}
const trackedHistory={request_id:id,order_reference:"TEST-ORDER",items:[{id,title_fa:"دفتر",title_en:"Notebook",options_fa:"آبی",options_en:"Blue",quantity:1}],history:[{status:"submitted",reply:"",version:0,created_at:order.created_at},{status:"in_review",reply:"Checking your return",version:1,created_at:order.updated_at},{status:"approved",reply:"Ready for return processing",version:2,created_at:order.updated_at}]}
test("return detail shows recorded history and requested item quantities",async({page})=>{
 await access(page)
 await page.route(`**/api/v1/account/requests/${id}`,r=>r.fulfill({json:trackedRequest}))
 await page.route(`**/api/v1/account/requests/${id}/tracking`,r=>r.fulfill({json:trackedHistory}))
 await page.goto(`/en/account/requests/${id}`)
 const region=page.getByRole("region",{name:"Request tracking",exact:true})
 await expect(region.getByText("Notebook",{exact:true})).toBeVisible()
 await expect(region.getByText(/Quantity: 1/)).toBeVisible()
 await expect(region.getByText("Review started",{exact:true})).toBeVisible()
 await expect(region.getByText("Checking your return",{exact:true})).toBeVisible()
 await expect(page.getByText(/Request status alone does not confirm a refund/)).toBeVisible()
})
test("history failure retries without hiding the request or sending writes",async({page})=>{
 await access(page);let failed=true,writes=0
 await page.route(`**/api/v1/account/requests/${id}`,r=>r.fulfill({json:trackedRequest}))
 await page.route(`**/api/v1/account/requests/${id}/tracking`,r=>{if(r.request().method()!=="GET")writes++;return failed?r.fulfill({status:503,json:{code:"service_unavailable"}}):r.fulfill({json:trackedHistory})})
 await page.goto(`/en/account/requests/${id}`)
 await expect(page.getByText("One item damaged",{exact:true})).toBeVisible()
 await expect(page.getByText("Unable to load request history.",{exact:true})).toBeVisible();failed=false
 await page.getByRole("button",{name:"Retry history",exact:true}).click()
 await expect(page.getByRole("region",{name:"Request tracking",exact:true}).getByText("Notebook",{exact:true})).toBeVisible();expect(writes).toBe(0)
})
test("Persian mobile request tracking shows original item names",async({page})=>{
 await access(page)
 await page.route(`**/api/v1/account/requests/${id}`,r=>r.fulfill({json:trackedRequest}))
 await page.route(`**/api/v1/account/requests/${id}/tracking`,r=>r.fulfill({json:trackedHistory}))
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/requests/${id}`)
 await expect(page.getByText("دفتر",{exact:true})).toBeVisible();await expect(page.getByText("شروع بررسی",{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("search and status filters query the full history and preserve filtered empty state",async({page})=>{
 await access(page);const queries:URLSearchParams[]=[]
 await page.route("**/api/v1/account/orders?*",r=>{const query=new URL(r.request().url()).searchParams;queries.push(query);return r.fulfill({json:{items:query.has("q")||query.has("payment")?[]:[order],next_cursor:null}})})
 await page.goto("/en/account/orders");await expect(page.getByText("TEST-ORDER",{exact:true})).toBeVisible()
 await page.getByRole("searchbox").fill("Notebook");await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByRole("heading",{name:"No matching orders",exact:true})).toBeVisible();expect(queries.at(-1)?.get("q")).toBe("Notebook")
 await page.getByRole("combobox",{name:"Payment status",exact:true}).click();await page.getByRole("option",{name:"Paid",exact:true}).click();await expect(page.getByRole("heading",{name:"No matching orders",exact:true})).toBeVisible();expect(queries.at(-1)?.get("payment")).toBe("paid")
 await page.getByRole("button",{name:"Clear filters",exact:true}).click();await expect(page.getByText("TEST-ORDER",{exact:true})).toBeVisible();expect(queries.at(-1)?.has("q")).toBe(false)
})
test("Persian mobile search failure preserves query and can retry",async({page})=>{
 await access(page);let failed=true
 await page.route("**/api/v1/account/orders?*",r=>{const query=new URL(r.request().url()).searchParams;return query.has("q")&&failed?r.fulfill({status:503,json:{code:"service_unavailable"}}):r.fulfill({json:{items:query.has("q")?[]:[order],next_cursor:null}})})
 await page.setViewportSize({width:390,height:844});await page.goto("/fa/account/orders");await expect(page.getByText("TEST-ORDER",{exact:true})).toBeVisible()
 await page.getByRole("searchbox").fill("دفتر");await page.getByRole("button",{name:"جستجو",exact:true}).click();await expect(page.locator("section[role=alert]")).toBeVisible();failed=false
 await page.getByRole("button",{name:"تلاش دوباره",exact:true}).click();await expect(page.getByRole("heading",{name:"سفارشی با این فیلترها پیدا نشد",exact:true})).toBeVisible();await expect(page.getByRole("searchbox")).toHaveValue("دفتر")
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("request history filters full history and clears to recorded requests",async({page})=>{
 await access(page);const queries:URLSearchParams[]=[]
 await page.route("**/api/v1/account/requests?*",r=>{const query=new URL(r.request().url()).searchParams;queries.push(query);return r.fulfill({json:{items:query.has("q")||query.has("kind")?[]:[trackedRequest],next_cursor:null}})})
 await page.goto("/en/account/requests");await expect(page.getByText("One item damaged",{exact:true})).toBeVisible()
 await page.getByRole("searchbox").fill("missing");await page.getByRole("button",{name:"Search",exact:true}).click();await expect(page.getByText("No matching requests.",{exact:true})).toBeVisible();expect(queries.at(-1)?.get("q")).toBe("missing")
 await page.getByRole("combobox",{name:"Request type"}).selectOption("cancellation");await expect(page.getByText("No matching requests.",{exact:true})).toBeVisible();expect(queries.at(-1)?.get("kind")).toBe("cancellation")
 await page.getByRole("button",{name:"Clear filters",exact:true}).click();await expect(page.getByText("One item damaged",{exact:true})).toBeVisible()
})
test("Persian mobile request filters retain query on failed search",async({page})=>{
 await access(page);let failed=true
 await page.route("**/api/v1/account/requests?*",r=>{const query=new URL(r.request().url()).searchParams;return query.has("q")&&failed?r.fulfill({status:503,json:{code:"service_unavailable"}}):r.fulfill({json:{items:query.has("q")?[]:[trackedRequest],next_cursor:null}})})
 await page.setViewportSize({width:390,height:844});await page.goto("/fa/account/requests");await expect(page.getByText("One item damaged",{exact:true})).toBeVisible()
 await page.getByRole("searchbox").fill("دفتر");await page.getByRole("button",{name:"جستجو",exact:true}).click();await expect(page.getByRole("alert")).toBeVisible();failed=false
 await page.getByRole("button",{name:"تلاش دوباره",exact:true}).click();await expect(page.getByText("درخواستی با این فیلترها پیدا نشد.",{exact:true})).toBeVisible();await expect(page.getByRole("searchbox")).toHaveValue("دفتر")
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("Persian mobile order reference copies the recorded value",async({page,context})=>{
 await access(page);await context.grantPermissions(["clipboard-read","clipboard-write"])
 await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:order}))
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/orders/${id}`)
 await page.getByRole("button",{name:"کپی شماره سفارش",exact:true}).click()
 await expect(page.getByText("شماره سفارش کپی شد.",{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe("TEST-ORDER")
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("return deadline expires on the open form without losing the draft",async({page})=>{
 await access(page);await page.clock.install({time:new Date("2026-10-17T10:00:00Z")});let writes=0
 const delivered={...order,return_available:{[id]:2},active_request_id:null,state:{...order.state,fulfillment:"delivered",delivered:{[id]:2},return_until:"2026-10-17T10:01:00Z"}}
 await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:delivered}))
 await page.route(`**/api/v1/account/orders/${id}/requests/*`,r=>{writes++;return r.fulfill({status:503,json:{code:"service_unavailable"}})})
 await page.goto(`/en/account/orders/${id}/return`)
 await expect(page.getByText("Recorded return request deadline",{exact:false})).toBeVisible()
 await page.getByRole("textbox",{name:"Reason",exact:true}).fill("Please inspect this item")
 await page.getByRole("spinbutton",{name:"Notebook",exact:true}).fill("1")
 await expect(page.getByRole("button",{name:"Submit request",exact:true})).toBeEnabled()
 await page.clock.fastForward(61000)
 await expect(page.getByText("This deadline has passed.",{exact:false})).toBeVisible()
 await expect(page.getByRole("button",{name:"Submit request",exact:true})).toBeDisabled()
 await expect(page.getByRole("textbox",{name:"Reason",exact:true})).toHaveValue("Please inspect this item")
 await expect(page.getByRole("spinbutton",{name:"Notebook",exact:true})).toHaveValue("1")
 expect(writes).toBe(0)
})
test("Persian return form describes a missing recorded deadline",async({page})=>{
 await access(page);await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:{...order,state:{...order.state,fulfillment:"delivered",delivered:{[id]:2}}}}))
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/orders/${id}/return`)
 await expect(page.getByText("مهلت مرجوعی برای این سفارش ثبت نشده است.",{exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"ثبت درخواست",exact:true})).toBeDisabled()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("return quantity is limited to the remaining recorded allowance",async({page})=>{
 await access(page)
 const delivered={...order,return_available:{[id]:1},active_request_id:null,state:{...order.state,fulfillment:"delivered",delivered:{[id]:2},return_until:"2099-01-01T00:00:00Z"}}
 await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:delivered}))
 await page.goto(`/en/account/orders/${id}/return`)
 await expect(page.getByText("Available to request: 1",{exact:true})).toBeVisible()
 const quantity=page.getByRole("spinbutton",{name:"Notebook",exact:true})
 await expect(quantity).toHaveAttribute("max","1")
 await page.getByRole("textbox",{name:"Reason",exact:true}).fill("One unit remains to return")
 await quantity.fill("2");await expect(page.getByRole("button",{name:"Submit request",exact:true})).toBeDisabled()
 await quantity.fill("1");await expect(page.getByRole("button",{name:"Submit request",exact:true})).toBeEnabled()
})
test("Persian active request points to tracking instead of another cancellation",async({page})=>{
 await access(page);await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:{...order,return_available:{[id]:0},active_request_id:id}}))
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/orders/${id}/cancel`)
 await expect(page.getByRole("link",{name:"پیگیری درخواست فعلی",exact:true})).toHaveAttribute("href",`/fa/account/requests/${id}`)
 await expect(page.getByRole("button",{name:"ثبت درخواست",exact:true})).toBeDisabled()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test("order list and detail show linked catalog thumbnails in both languages",async({page})=>{
 await access(page)
 const linked={...order,catalog_items:{[id]:{kind:"products",slug:"notebook-ghosts",image_url:null}}}
 await page.route("**/api/v1/account/orders?*",r=>r.fulfill({json:{items:[linked],next_cursor:null}}))
 await page.route(`**/api/v1/account/orders/${id}`,r=>r.fulfill({json:linked}))
 for(const language of ["fa","en"]){
  await page.setViewportSize({width:language==="fa"?390:1440,height:900})
  for(const detail of [false,true]){
   await page.goto(`/${language}/account/orders${detail?`/${id}`:""}`)
   const thumbnail=page.locator("a.order-product-thumbnail")
   await expect(thumbnail).toHaveAttribute("href",`/${language}/products/notebook-ghosts`)
   await expect(page.locator("a.order-product-name")).toHaveAttribute("href",`/${language}/products/notebook-ghosts`)
   await expect.poll(()=>thumbnail.locator("img").evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   await page.screenshot({path:`/tmp/nilart-order-thumbnails-${language}-${detail?"detail":"list"}.png`,fullPage:true})
   await (detail?page.locator("a.order-product-name"):thumbnail).click()
   await expect(page).toHaveURL(new RegExp(`/${language}/products/notebook-ghosts$`))
  }
 }
})

test("order filters use shared dropdowns with keyboard selection and server filters",async({page})=>{
 await access(page)
 const queries:URLSearchParams[]=[]
 await page.route("**/api/v1/account/orders?*",r=>{const query=new URL(r.request().url()).searchParams;queries.push(query);return r.fulfill({json:{items:query.has("payment")||query.has("fulfillment")?[]:[order],next_cursor:null}})})
 await page.setViewportSize({width:390,height:900});await page.goto("/en/account/orders")
 const payment=page.getByRole("combobox",{name:"Payment status",exact:true})
 await expect(payment).toBeEnabled()
 await payment.click();await expect(page.getByRole("listbox",{name:"Payment status",exact:true})).toBeVisible()
 await page.getByRole("option",{name:"Paid",exact:true}).click()
 await expect(payment).toHaveValue("Paid")
 await expect(page.getByRole("listbox",{name:"Payment status",exact:true})).toHaveCount(0)
 await expect.poll(()=>queries.at(-1)?.get("payment")).toBe("paid")
 const delivery=page.getByRole("combobox",{name:"Delivery status",exact:true})
 await expect(delivery).toBeEnabled();await delivery.click();await delivery.press("End");await delivery.press("Enter")
 await expect.poll(()=>queries.at(-1)?.get("fulfillment")).toBe("on_hold")
 await page.getByRole("button",{name:"Clear filters",exact:true}).click()
 await expect(page.getByText("TEST-ORDER",{exact:true})).toBeVisible()
 await payment.click();await page.screenshot({path:"/tmp/nilart-order-shared-dropdown-mobile.png",fullPage:true})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
