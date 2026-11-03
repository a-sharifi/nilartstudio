import {expect,test,type Page} from "@playwright/test"
import {createHash} from "node:crypto"
import {jpeg,pdf} from "../fixtures/support-files"
const id="00000000-0000-4000-8000-000000000001",owner="00000000-0000-4000-8000-000000000002"
async function setup(page:Page){
 let record={id,kind:"ticket",version:0,created_at:"2026-10-17T12:00:00Z",updated_at:"2026-10-17T12:00:00Z",data:{subject:"Evidence question",body:"Please inspect these files",topic:"technical",status:"submitted"},catalog:null},writes=0
 const files:{id:string;ticket_id:string;file_name:string;size:number;sha256:string;created_at:string;bytes:Buffer}[]=[]
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:owner,roles:["customer"],permissions:["account.read_self","account.write_self"]}}))
 await page.route("**/api/v1/auth/session/csrf",r=>r.fulfill({json:{csrf_token:"file-token"}}))
 await page.route("**/api/v1/account/profile",r=>r.fulfill({json:{account_id:owner,phone:"+989123456789",full_name:"",version:0}}))
 await page.route("**/api/v1/account/panel/summary",r=>r.fulfill({json:{favorites:0,addresses:0,tickets:1,unread_notifications:0}}))
 await page.route("**/api/v1/account/panel/ticket?*",r=>r.fulfill({json:{items:[record],next_cursor:null}}))
 await page.route("**/api/v1/account/panel/message?*",r=>r.fulfill({json:{items:[],next_cursor:null}}))
 await page.route("**/api/v1/account/panel/ticket/*",r=>{if(r.request().method()==="PUT"){record={...record,id:r.request().url().split("/").at(-1)!,data:{...r.request().postDataJSON().data,status:"submitted"}}}return r.fulfill({json:record})})
 await page.route("**/api/v1/account/support/*/attachments**",r=>{const path=new URL(r.request().url()).pathname;if(r.request().method()==="PUT"){writes++;const body=r.request().postDataJSON(),bytes=Buffer.from(body.content_base64,"base64");const file={id:path.split("/").at(-1)!,ticket_id:record.id,file_name:body.file_name,size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),created_at:record.created_at,bytes};files.push(file);record={...record,version:record.version+1,data:{...record.data,status:"awaiting_reply"}};return r.fulfill({json:file})}if(path.endsWith("/content")){const file=files.find(file=>file.id===path.split("/").at(-2))!;return r.fulfill({body:file.bytes,contentType:file.file_name.endsWith(".pdf")?"application/pdf":"image/jpeg",headers:{"Content-Disposition":`attachment; filename="${file.file_name}"`}})}return r.fulfill({json:files})})
 return ()=>writes
}
test("private PDF upload downloads exact bytes without embedding the document",async({page})=>{
 const writes=await setup(page);await page.goto(`/en/account/support/${id}`)
 await page.getByLabel("Choose support file").setInputFiles({name:"evidence.pdf",mimeType:"application/pdf",buffer:pdf});await expect(page.getByText("evidence.pdf",{exact:true})).toBeVisible();expect(writes()).toBe(0);await expect(page.locator("iframe,object,embed")).toHaveCount(0)
 await page.getByRole("button",{name:"Attach file",exact:true}).click();await expect(page.getByRole("link",{name:"Download attachment",exact:true})).toBeVisible()
 const downloaded=page.waitForEvent("download");await page.getByRole("link",{name:"Download attachment",exact:true}).click();const file=await downloaded;expect(file.suggestedFilename()).toBe("evidence.pdf");const stream=await file.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));expect(Buffer.concat(chunks)).toEqual(pdf);expect(writes()).toBe(1)
})
test("Persian mobile JPEG previews locally and removal sends nothing",async({page})=>{
 const writes=await setup(page);await page.setViewportSize({width:390,height:844});await page.goto(`/fa/account/support/${id}`)
 await page.getByLabel("انتخاب فایل پیوست").setInputFiles({name:"photo.jpg",mimeType:"image/jpeg",buffer:jpeg});const image=page.getByRole("img",{name:"پیش‌نمایش تصویر انتخاب‌شده برای پیوست",exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(img=>(img as HTMLImageElement).naturalWidth)).toBe(2);expect(writes()).toBe(0)
 await page.screenshot({path:"/tmp/nilart-jpeg-support-mobile.png",fullPage:true});await page.getByRole("button",{name:"حذف فایل انتخابی",exact:true}).click();await expect(image).toHaveCount(0);expect(writes()).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test("new ticket sends JPEG and PDF only after confirmed ticket creation",async({page})=>{
 const writes=await setup(page);await page.goto("/en/account/support?new=1");await page.getByRole("combobox",{name:"Topic *"}).click();await page.getByRole("option",{name:"General question",exact:true}).click();await page.getByLabel("Subject *",{exact:true}).fill("Evidence for this question");await page.getByLabel("Describe the issue *",{exact:true}).fill("Please inspect both attached files")
 await page.getByLabel("Supporting files (optional)",{exact:true}).setInputFiles([{name:"photo.jpg",mimeType:"image/jpeg",buffer:jpeg},{name:"evidence.pdf",mimeType:"application/pdf",buffer:pdf}]);await expect(page.getByText("Selected; not sent",{exact:true})).toHaveCount(2);expect(writes()).toBe(0)
 await page.getByRole("button",{name:"Submit ticket",exact:true}).click();await expect(page.getByText("Attachment saved",{exact:true})).toHaveCount(2);expect(writes()).toBe(2)
})
for(const lost of [false,true])test(`staff PDF reaches customer conversation with retained reply draft${lost?" after reconciliation":""}`,async({page})=>{
 await setup(page);let uploads=0,replies=0
 let record={id,kind:"ticket",version:0,created_at:"2026-10-17T12:00:00Z",updated_at:"2026-10-17T12:00:00Z",data:{subject:"Staff file question",body:"Please help",topic:"technical",status:"submitted"},catalog:null}
 const files:{id:string;ticket_id:string;file_name:string;size:number;sha256:string;created_at:string}[]=[]
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:owner,roles:["admin"],permissions:["support.manage"]}}))
 await page.route("**/api/v1/admin/customer/tickets**",r=>{const path=new URL(r.request().url()).pathname;if(path.endsWith("/reply")){replies++;return r.abort("failed")}if(path.endsWith("/messages")||path.endsWith("/audits"))return r.fulfill({json:{items:[],next_cursor:null}});return r.fulfill({json:path.endsWith(id)?record:{items:[record],next_cursor:null}})})
 await page.route(`**/api/v1/admin/support/${id}/attachments**`,r=>{if(r.request().method()==="PUT"){uploads++;const body=r.request().postDataJSON();const file={id:r.request().url().split("/").at(-1)!,ticket_id:id,file_name:body.file_name,size:pdf.length,sha256:createHash("sha256").update(pdf).digest("hex"),created_at:record.created_at};files.push(file);record={...record,version:1,data:{...record.data,status:"awaiting_customer"}};if(lost)return r.abort("failed");return r.fulfill({json:file})}return r.fulfill({json:files})})
 await page.goto("/en/admin/support");await page.getByRole("button",{name:"Open conversation",exact:true}).click();await page.getByRole("textbox",{name:"Reply to customer",exact:true}).fill("Keep this draft; only send the file")
 await page.getByLabel("Choose support file").setInputFiles({name:"staff-guide.pdf",mimeType:"application/pdf",buffer:pdf});await expect(page.getByText("staff-guide.pdf",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeDisabled();await page.getByRole("button",{name:"Attach file",exact:true}).click()
 if(lost){await expect(page.getByRole("button",{name:"Retry same attachment",exact:true})).toBeVisible();await page.getByRole("button",{name:"Check saved attachments",exact:true}).click()}
 await expect.poll(()=>uploads).toBe(1);await expect(page.getByRole("link",{name:"Download attachment",exact:true})).toHaveAttribute("href",`/api/v1/admin/support/${id}/attachments/${files[0].id}/content`);await expect(page.getByRole("textbox",{name:"Reply to customer",exact:true})).toHaveValue("Keep this draft; only send the file");await expect(page.getByRole("button",{name:"Record reply",exact:true})).toBeEnabled();expect(uploads).toBe(1);expect(replies).toBe(0)
 await page.getByRole("textbox",{name:"Reply to customer",exact:true}).fill("")
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:owner,roles:["customer"],permissions:["account.read_self","account.write_self"]}}))
 await page.route(`**/api/v1/account/panel/ticket/${id}`,r=>r.fulfill({json:record}))
 await page.route(`**/api/v1/account/support/${id}/attachments`,r=>r.fulfill({json:files}))
 await page.goto(`/en/account/support/${id}`);await expect(page.getByText("staff-guide.pdf",{exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"Download attachment",exact:true})).toHaveAttribute("href",`/api/v1/account/support/${id}/attachments/${files[0].id}/content`)
})
