import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001",mid="00000000-0000-4000-8000-000000000002"
const initial={id,kind:"ticket",version:0,created_at:"2026-10-13T10:00:00Z",updated_at:"2026-10-13T10:00:00Z",data:{subject:"Isolated support question",body:"Please help with this test",topic:"general",status:"submitted"}}
async function setup(page:Page,mode="normal",permissions=["support.manage"]){
 let ticket=structuredClone(initial),messages:unknown[]=[],csrf="",receiptReads=0
 const writes:Record<string,unknown>[]=[]
 if(mode==="closed")ticket.data.status="closed"
 await page.route("**/api/v1/admin/support/*/attachments",r=>r.fulfill({json:[]}))
 await page.route("**/api/v1/auth/access",route=>route.fulfill({json:{account_id:id,roles:["admin"],permissions}}))
 await page.route("**/api/v1/auth/session/csrf",route=>route.fulfill({json:{csrf_token:"fresh-support-token"}}))
 await page.route("**/api/v1/admin/customer/tickets**",async route=>{
 const req=route.request(),url=new URL(req.url())
 if(url.pathname.endsWith("/state")){
 const body=req.postDataJSON();writes.push(body);csrf=req.headers()["x-csrf-token"]
 if(mode==="state-conflict")return route.fulfill({status:409,json:{code:"record_version_conflict"}})
 ticket={...ticket,version:ticket.version+1,data:{...ticket.data,status:body.status}}
 if(mode==="state-lost")return route.abort("failed")
 return route.fulfill({json:ticket})
 }
 if(url.pathname.endsWith("/reply")){
 const body=req.postDataJSON();writes.push(body);csrf=req.headers()["x-csrf-token"]
 if(mode==="not-stored"&&writes.length===1)return route.abort("failed")
 if(mode==="conflict")return route.fulfill({status:409,json:{code:"record_version_conflict"}})
 const reply={id:mid,kind:"message",version:0,created_at:initial.created_at,updated_at:initial.updated_at,data:{ticket_id:id,author:"support",body:body.body,request_id:body.request_id}}
 if(!messages.length)messages=[reply]
 ticket={...ticket,version:1,data:{...ticket.data,status:"awaiting_customer"}}
 if(mode==="lost")return route.abort("failed")
 return route.fulfill({json:reply})
 }
 if(url.pathname.endsWith("/messages")){
 if(url.searchParams.has("request_id"))receiptReads++
 return route.fulfill({json:{items:messages,next_cursor:null}})
 }
 if(url.pathname.endsWith(id))return route.fulfill({json:ticket})
 return route.fulfill({json:{items:url.searchParams.has("status")&&url.searchParams.get("status")!==ticket.data.status?[]:[ticket],next_cursor:null}})
 })
 return {writes,csrf:()=>csrf,receipts:()=>receiptReads}
}
async function open(page:Page){await page.goto("/en/admin/support");await page.getByRole("button",{name:"Open conversation"}).click();await expect(page.getByLabel("Reply to customer")).toBeVisible()}
test("staff reply uses current version and fresh CSRF and survives reload",async({page})=>{
 const state=await setup(page);await open(page)
 await page.getByLabel("Reply to customer").fill("Verified test reply")
 await page.getByRole("button",{name:"Record reply",exact:true}).click()
 await expect(page.getByRole("article").getByText("Verified test reply",{exact:true})).toBeVisible()
 expect(state.writes).toHaveLength(1);expect(state.writes[0]).toMatchObject({version:0,body:"Verified test reply"});expect(state.writes[0].request_id).toMatch(/^[0-9a-f-]{36}$/);expect(state.csrf()).toBe("fresh-support-token")
 await open(page);await expect(page.getByRole("article").getByText("Verified test reply",{exact:true})).toBeVisible()
})
test("lost acknowledgement resolves stored receipt without sending twice",async({page})=>{
 const state=await setup(page,"lost");await open(page)
 await page.getByLabel("Reply to customer").fill("Reply with uncertain acknowledgement")
 await page.getByRole("button",{name:"Record reply",exact:true}).click()
 await expect(page.getByRole("alert").filter({hasText:"Reply unconfirmed"})).toContainText("Reply unconfirmed")
 await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeDisabled()
 await page.getByRole("button",{name:"Reload conversation"}).click()
 await expect(page.getByText("The previous reply was confirmed.",{exact:true})).toBeVisible()
 await expect(page.getByLabel("Reply to customer")).toHaveValue("")
 expect(state.writes).toHaveLength(1);expect(state.receipts()).toBe(1)
})
test("version conflict retains draft until explicit reload and navigation guards edits",async({page})=>{
 await setup(page,"conflict");await open(page)
 await page.getByLabel("Reply to customer").fill("Keep this draft")
 await page.getByRole("button",{name:"Open conversation"}).click()
 await expect(page.getByRole("dialog")).toBeVisible();await page.getByRole("button",{name:"Keep editing"}).click()
 await page.getByRole("button",{name:"Record reply",exact:true}).click()
 await expect(page.getByRole("alert").filter({hasText:"Ticket changed"})).toContainText("Ticket changed")
 await expect(page.getByLabel("Reply to customer")).toHaveValue("Keep this draft")
 await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeDisabled()
 await page.getByRole("button",{name:"Reload conversation"}).click()
 await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeEnabled()
})
test("closed conversations prevent replying",async({page})=>{
 await setup(page,"closed");await open(page)
 await expect(page.getByLabel("Reply to customer")).toBeDisabled()
 await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeDisabled()
})
test("unauthorized accounts never read inbox",async({page})=>{
 await setup(page,"normal",["finance.read"]);let reads=0
 await page.route("**/api/v1/admin/customer/**",route=>{reads++;return route.fulfill({status:500})})
 await page.goto("/en/admin/support")
 await expect(page.getByRole("heading",{name:"Access denied",exact:true})).toBeVisible();expect(reads).toBe(0)
})
test("Persian support inbox fits a mobile viewport",async({page})=>{
 await setup(page);await page.setViewportSize({width:390,height:844});await page.goto("/fa/admin/support")
 await page.getByRole("button",{name:"باز کردن گفتگو"}).click()
 await expect(page.getByLabel("پاسخ به مشتری")).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
 await page.screenshot({path:"/tmp/nilart-admin-support-mobile.png",fullPage:true})
})

test("an unrecorded uncertain reply retries the exact original payload",async({page})=>{
 const state=await setup(page,"not-stored");await open(page)
 await page.getByLabel("Reply to customer").fill("Same payload on retry")
 await page.getByRole("button",{name:"Record reply",exact:true}).click()
 await expect(page.getByRole("alert").filter({hasText:"Reply unconfirmed"})).toContainText("Reply unconfirmed")
 await page.getByRole("button",{name:"Reload conversation"}).click()
 await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeEnabled()
 await expect(page.getByLabel("Reply to customer")).toBeDisabled()
 await page.getByRole("button",{name:"Record reply",exact:true}).click()
 await expect(page.getByRole("article").getByText("Same payload on retry",{exact:true})).toBeVisible()
 await expect.poll(()=>state.writes.length).toBe(2);expect(state.writes[1]).toEqual(state.writes[0])
})

test("staff can close and reopen tickets with a reason and current version",async({page})=>{
 const state=await setup(page);await open(page)
 await expect(page.getByRole("button",{name:"Confirm and close ticket"})).toBeDisabled()
 await page.getByLabel("Reason for status change").fill("Resolved isolated test")
 await page.getByRole("button",{name:"Open conversation"}).click()
 await expect(page.getByRole("dialog")).toBeVisible();await page.getByRole("button",{name:"Keep editing"}).click()
 await page.getByRole("button",{name:"Confirm and close ticket"}).click()
 await expect(page.getByText("Ticket status saved.",{exact:true})).toBeVisible()
 await expect(page.getByLabel("Reply to customer")).toBeDisabled()
 expect(state.writes[0]).toEqual({version:0,status:"closed",reason:"Resolved isolated test"})
 expect(state.csrf()).toBe("fresh-support-token")
 await page.getByLabel("Reason for status change").fill("Further help requested")
 await page.getByRole("button",{name:"Confirm and reopen ticket"}).click()
 await expect(page.getByRole("button",{name:"Confirm and close ticket"})).toBeVisible()
 expect(state.writes[1]).toEqual({version:1,status:"submitted",reason:"Further help requested"})
 await expect(page.getByLabel("Reply to customer")).toBeEnabled()
})
test("uncertain status writes require reload without reversing or retrying automatically",async({page})=>{
 const state=await setup(page,"state-lost");await open(page)
 await page.getByLabel("Reason for status change").fill("Closed before lost response")
 await page.getByRole("button",{name:"Confirm and close ticket"}).click()
 await expect(page.getByRole("alert").filter({hasText:"Status change unconfirmed"})).toBeVisible()
 await expect(page.getByRole("button",{name:"Confirm and close ticket"})).toBeDisabled()
 await page.getByRole("button",{name:"Reload conversation"}).click()
 await expect(page.getByText("Status reloaded. Review it before making another change.",{exact:true})).toBeVisible()
 await expect(page.getByLabel("Reason for status change")).toHaveValue("")
 await expect(page.getByRole("button",{name:"Confirm and reopen ticket"})).toBeDisabled()
 expect(state.writes).toHaveLength(1)
})
test("status version conflicts retain reason until explicit recovery",async({page})=>{
 await setup(page,"state-conflict");await open(page)
 await page.getByLabel("Reason for status change").fill("Reason retained")
 await page.getByRole("button",{name:"Confirm and close ticket"}).click()
 await expect(page.getByRole("alert").filter({hasText:"Ticket changed"})).toBeVisible()
 await expect(page.getByLabel("Reason for status change")).toHaveValue("Reason retained")
 await expect(page.getByRole("button",{name:"Confirm and close ticket"})).toBeDisabled()
 await page.getByRole("button",{name:"Reload conversation"}).click()
 await expect(page.getByLabel("Reason for status change")).toHaveValue("")
})

test("status filtering resets the inbox and guards a draft before changing views",async({page})=>{
 await setup(page);await open(page)
 await page.getByLabel("Reply to customer").fill("Unsaved filtered draft")
 await page.getByRole("combobox",{name:"Ticket status"}).click()
 await page.getByRole("option",{name:"Closed",exact:true}).click()
 await expect(page.getByRole("dialog")).toBeVisible()
 await page.getByRole("button",{name:"Keep editing"}).click()
 await expect(page.getByRole("combobox",{name:"Ticket status"})).toHaveValue("All statuses")
 await expect(page.getByLabel("Reply to customer")).toHaveValue("Unsaved filtered draft")
 await page.getByRole("combobox",{name:"Ticket status"}).click()
 await page.getByRole("option",{name:"Closed",exact:true}).click()
 await page.getByRole("button",{name:"Discard",exact:true}).click()
 await expect(page.getByText("No tickets match this status.",{exact:true})).toBeVisible()
 await expect(page.getByLabel("Reply to customer")).toHaveCount(0)
 await page.getByRole("combobox",{name:"Ticket status"}).click()
 await page.getByRole("option",{name:"Submitted",exact:true}).click()
 await expect(page.getByRole("button",{name:"Open conversation"})).toBeVisible()
})

test("staff history retries reads, pages older actions and clears after ticket changes",async({page})=>{
 await setup(page);let calls=0
 const row={id:mid,actor_id:id,created_at:initial.created_at,action:"customer.support_state",reason:"Stored internal closure reason",changes:{record_id:id,before:"submitted",after:"closed",previous_version:0,version:1}}
 await page.route(`**/api/v1/admin/customer/tickets/${id}/audits**`,route=>{
 calls++;if(calls===1)return route.fulfill({status:503,json:{code:"unavailable"}})
 const older=new URL(route.request().url()).searchParams.get("cursor")
 return route.fulfill({json:{items:[older?{...row,id:"00000000-0000-4000-8000-000000000003",action:"customer.support_reply",reason:"Staff support reply",changes:{record_id:id}}:row],next_cursor:older?null:mid}})
 })
 await open(page)
 await page.getByRole("button",{name:"Load support history"}).click()
 await expect(page.getByText("Unable to load support history.",{exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Load support history"}).click()
 await expect(page.getByText("Stored internal closure reason",{exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Older support history"}).click()
 await expect(page.getByText("Staff support reply",{exact:true})).toBeVisible()
 await page.getByLabel("Reason for status change").fill("Fresh closure")
 await page.getByRole("button",{name:"Confirm and close ticket"}).click()
 await expect(page.getByText("Ticket status saved.",{exact:true})).toBeVisible()
 await expect(page.getByText("Stored internal closure reason",{exact:true})).toHaveCount(0)
})

test("subject search is submitted explicitly, keeps pagination filters and guards drafts",async({page})=>{
 await setup(page);const requests:URL[]=[]
 await page.route(url=>url.pathname==="/api/v1/admin/customer/tickets",route=>{
 const url=new URL(route.request().url());requests.push(url)
 const empty=url.searchParams.get("q")==="missing"||url.searchParams.get("status")==="closed"
 const more=url.searchParams.has("cursor"),search=url.searchParams.get("q")==="support"
 return route.fulfill({json:{items:empty?[]:[more?{...initial,id:mid}:initial],next_cursor:search&&!more&&!empty?id:null}})
 })
 await page.goto("/en/admin/support")
 await expect(page.getByRole("button",{name:"Open conversation"})).toBeVisible()
 await page.getByLabel("Search ticket subjects").fill("support")
 expect(requests.at(-1)?.searchParams.get("q")).toBeNull()
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByRole("button",{name:"More tickets"})).toBeVisible()
 await page.getByRole("button",{name:"More tickets"}).click()
 await expect(page.getByRole("button",{name:"Open conversation"})).toHaveCount(2)
 expect(requests.at(-1)?.searchParams.get("q")).toBe("support")
 expect(requests.at(-1)?.searchParams.get("cursor")).toBe(id)
 await page.getByRole("button",{name:"Open conversation"}).first().click()
 await page.getByLabel("Reply to customer").fill("Preserve this draft")
 await page.getByLabel("Search ticket subjects").fill("missing")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByRole("dialog")).toBeVisible()
 await page.getByRole("button",{name:"Keep editing"}).click()
 await expect(page.getByLabel("Reply to customer")).toHaveValue("Preserve this draft")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await page.getByRole("button",{name:"Discard",exact:true}).click()
 await expect(page.getByText("No tickets match this search and status.",{exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.has("cursor")).toBe(false)
 await page.getByRole("button",{name:"Clear search"}).click()
 await expect(page.getByRole("button",{name:"Open conversation"})).toBeVisible()
 await page.getByRole("combobox",{name:"Ticket status"}).click()
 await page.getByRole("option",{name:"Closed",exact:true}).click()
 await page.getByLabel("Search ticket subjects").fill("support")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByText("No tickets match this search and status.",{exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.get("status")).toBe("closed")
 await page.getByRole("button",{name:"Clear search"}).click()
 await expect(page.getByText("No tickets match this status.",{exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.get("q")).toBeNull()
 expect(requests.at(-1)?.searchParams.get("status")).toBe("closed")
})
