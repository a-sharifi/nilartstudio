import {expect,test,type Page} from "@playwright/test"
import {createHash} from "node:crypto"
const ticket="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-000000000002"
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC","base64")
async function setup(page:Page,lost=false,write=true){
 const initial={id:ticket,kind:"ticket",version:0,created_at:"2026-10-14T10:00:00Z",updated_at:"2026-10-14T10:00:00Z",data:{subject:"Private screenshot question",body:"Please inspect the screenshot",topic:"technical",status:"submitted"},catalog:null};let record=initial;const files:{id:string;ticket_id:string;file_name:string;size:number;sha256:string;created_at:string}[]=[];let writes=0
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:id,roles:["customer"],permissions:["account.read_self",...(write?["account.write_self"]:[])]}}))
 await page.route("**/api/v1/auth/session/csrf",r=>r.fulfill({json:{csrf_token:"attachment-token"}}))
 await page.route("**/api/v1/account/panel/summary",r=>r.fulfill({json:{favorites:0,addresses:0,tickets:1,unread_notifications:0}}))
 await page.route("**/api/v1/account/panel/ticket?*",r=>r.fulfill({json:{items:[record],next_cursor:null}}))
 await page.route(`**/api/v1/account/panel/ticket/${ticket}`,r=>r.fulfill({json:record}))
 await page.route("**/api/v1/account/panel/message?*",r=>r.fulfill({json:{items:[],next_cursor:null}}))
 await page.route(`**/api/v1/account/support/${ticket}/attachments**`,async r=>{if(r.request().method()==="PUT"){writes++;const body=r.request().postDataJSON(),key=r.request().url().split("/").at(-1)!;files.push({id:key,ticket_id:ticket,file_name:body.file_name,size:png.length,sha256:createHash("sha256").update(png).digest("hex"),created_at:initial.created_at});record={...record,version:1,data:{...record.data,status:"awaiting_reply"}};expect(r.request().headers()["x-csrf-token"]).toBe("attachment-token");if(lost)return r.abort("failed");return r.fulfill({json:files[0]})}if(r.request().url().endsWith("/content"))return r.fulfill({body:png,contentType:"image/png",headers:{"Content-Disposition":'attachment; filename="shot.png"'}});return r.fulfill({json:files})})
 return ()=>writes
}
async function choose(page:Page){await page.goto(`/en/account/support/${ticket}`);await page.getByLabel("Choose support file").setInputFiles({name:"shot.png",mimeType:"image/png",buffer:png});await page.getByRole("button",{name:"Attach file",exact:true}).click()}
test("private screenshot persists and is downloadable after conversation reload",async({page})=>{const writes=await setup(page);await choose(page);await expect(page.getByRole("link",{name:"Download attachment",exact:true})).toBeVisible();await page.reload();await expect(page.getByText("shot.png",{exact:true})).toBeVisible();const saved=page.waitForEvent("download");await page.getByRole("link",{name:"Download attachment",exact:true}).click();expect((await saved).suggestedFilename()).toBe("shot.png");expect(writes()).toBe(1)})
test("unknown screenshot upload reconciles without sending twice",async({page})=>{const writes=await setup(page,true);await choose(page);await expect(page.getByRole("button",{name:"Retry same attachment",exact:true})).toBeVisible();await page.getByRole("button",{name:"Check saved attachments",exact:true}).click();await expect(page.getByRole("link",{name:"Download attachment",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Retry same attachment",exact:true})).toHaveCount(0);expect(writes()).toBe(1)})
test("read-only Persian mobile attachment control is disabled",async({page})=>{await setup(page,false,false);await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/support/${ticket}`);await expect(page.getByLabel("انتخاب فایل پیوست")).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()})
test("staff inbox exposes the screenshot through its protected staff route",async({page})=>{
 await setup(page);await choose(page);const link=page.getByRole("link",{name:"Download attachment",exact:true});await expect(link).toBeVisible();const key=(await link.getAttribute("href"))!.split("/").at(-2)!
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:id,roles:["admin"],permissions:["support.manage"]}}))
 const record={id:ticket,kind:"ticket",version:1,created_at:"2026-10-14T10:00:00Z",updated_at:"2026-10-14T10:00:00Z",data:{subject:"Private screenshot question",body:"Please inspect the screenshot",topic:"technical",status:"awaiting_reply"}}
 await page.route("**/api/v1/admin/customer/tickets**",r=>r.fulfill({json:r.request().url().endsWith("/messages")?{items:[],next_cursor:null}:r.request().url().endsWith(ticket)?record:{items:[record],next_cursor:null}}))
 await page.route(`**/api/v1/admin/support/${ticket}/attachments`,r=>r.fulfill({json:[{id:key,ticket_id:ticket,file_name:"shot.png",size:png.length,sha256:createHash("sha256").update(png).digest("hex"),created_at:record.created_at}]}))
 await page.goto("/en/admin/support");await page.getByRole("button",{name:"Open conversation",exact:true}).click()
 await expect(page.getByRole("link",{name:"Download attachment",exact:true})).toHaveAttribute("href",`/api/v1/admin/support/${ticket}/attachments/${key}/content`)
 await expect(page.getByLabel("Choose support file")).toBeEnabled()
})
test("Persian mobile screenshot preview stays local until explicit upload",async({page})=>{
 const writes=await setup(page);await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/support/${ticket}`)
 await page.getByLabel("انتخاب فایل پیوست").setInputFiles({name:"shot.png",mimeType:"image/png",buffer:png})
 const preview=page.getByRole("img",{name:"پیش‌نمایش تصویر انتخاب‌شده برای پیوست",exact:true})
 await expect(preview).toBeVisible();await expect.poll(()=>preview.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
 expect(writes()).toBe(0);expect(await preview.getAttribute("src")).toMatch(/^data:image\/png;base64,/)
 await page.getByRole("button",{name:"حذف فایل انتخابی",exact:true}).click()
 await expect(preview).toHaveCount(0);expect(writes()).toBe(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("conversation refresh preserves reply and selected screenshot through read failure",async({page})=>{
 const writes=await setup(page);let reads=0
 await page.route(`**/api/v1/account/panel/ticket/${ticket}`,r=>{reads++;return reads===2?r.fulfill({status:503,json:{code:"service_unavailable"}}):r.fulfill({json:{id:ticket,kind:"ticket",version:reads>2?1:0,created_at:"2026-10-14T12:00:00Z",updated_at:"2026-10-17T12:00:00Z",data:{subject:"Screenshot question",body:"Please inspect the screenshot",topic:"technical",status:"submitted"},catalog:null}})})
 await page.goto(`/en/account/support/${ticket}`)
 await page.getByRole("textbox",{name:"Your reply",exact:true}).fill("Keep this reply while refreshing")
 await page.getByLabel("Choose support file").setInputFiles({name:"shot.png",mimeType:"image/png",buffer:png})
 await expect(page.getByRole("img",{name:"Selected screenshot preview",exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Refresh conversation",exact:true}).click()
 await expect(page.getByText("Showing the last loaded conversation; your reply and selected file are preserved.",{exact:true})).toBeVisible()
 await expect(page.getByRole("textbox",{name:"Your reply",exact:true})).toHaveValue("Keep this reply while refreshing")
 await expect(page.getByRole("img",{name:"Selected screenshot preview",exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Refresh conversation",exact:true}).click()
 await expect(page.getByText("Conversation refreshed.",{exact:true})).toBeVisible()
 await expect(page.getByRole("textbox",{name:"Your reply",exact:true})).toHaveValue("Keep this reply while refreshing")
 await expect(page.getByRole("img",{name:"Selected screenshot preview",exact:true})).toBeVisible()
 expect(writes()).toBe(0)
})
