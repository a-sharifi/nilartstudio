import {expect,test,type Page} from "@playwright/test"
const id="00000000-0000-4000-8000-000000000001"
const image=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC","base64")
const initial={id,version:0,status:"awaiting_review",created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",brief:{idea:"Private portrait",changes:"",style:"Oil",size:"40 cm",execution:"digital"},agreement:null as string|null,revision_allowance:null as number|null,artwork:[] as {id:string;number:number;note:string;created_at:string;action:null;details:null;decided_at:null}[]}
async function setup(page:Page,mode="normal"){
 let saved=structuredClone(initial);const writes:Record<string,unknown>[]=[]
 await page.route("**/api/v1/auth/access",r=>r.fulfill({json:{account_id:id,roles:["admin"],permissions:["commissions.manage","account.read_self","account.write_self"]}}))
 await page.route("**/api/v1/auth/session/csrf",r=>r.fulfill({json:{csrf_token:"publish-token"}}));page.on("dialog",d=>d.accept())
 await page.route("**/api/v1/admin/commissions**",r=>{const req=r.request(),url=new URL(req.url());if(req.method()==="PUT"){const body=req.postDataJSON(),key=url.pathname.split("/").at(-1)!;writes.push({...body,key});expect(req.headers()["x-csrf-token"]).toBe("publish-token");saved={...saved,version:1,status:"awaiting_customer",agreement:body.agreement,revision_allowance:body.revision_allowance,artwork:[{id:key,number:1,note:body.note,created_at:saved.created_at,action:null,details:null,decided_at:null}]};if(mode==="lost")return r.abort("failed");return r.fulfill({json:saved})}return r.fulfill({json:url.pathname.endsWith(id)?saved:{items:[saved],next_cursor:null}})})
 await page.route(`**/api/v1/account/commissions/${id}`,r=>r.fulfill({json:saved}))
 await page.route(`**/api/v1/account/commissions/${id}/artwork/*/preview`,r=>r.fulfill({body:image,contentType:"image/png"}))
 return writes
}
async function draft(page:Page){await page.goto("/en/admin/commissions");await page.getByRole("button",{name:"Open commission"}).click();await page.getByLabel("PNG preview").setInputFiles({name:"portrait.png",mimeType:"image/png",buffer:image});await expect(page.getByAltText("Selected preview")).toBeVisible();await page.getByLabel("Agreed terms",{exact:true}).fill("Previously accepted review terms");await page.getByLabel("Version note for customer").fill("Review the colors");await page.getByRole("checkbox").check()}
test("staff publishes private preview that customer can review",async({page})=>{const writes=await setup(page);await draft(page);await page.getByRole("button",{name:"Publish for customer review",exact:true}).click();await expect(page.getByText("Version published for customer review.",{exact:true})).toBeVisible();expect(writes[0]).toMatchObject({version:0,accepted_terms_confirmed:true,preview_png:image.toString("base64")});await page.goto(`/en/account/commissions/${id}`);await expect(page.getByAltText("Private artwork preview for review")).toBeVisible();await expect(page.getByRole("region",{name:"Artwork review history"}).getByText("Review the colors",{exact:true})).toBeVisible();await expect(page.getByRole("checkbox")).toBeEnabled()})
test("lost publication acknowledgement reconciles without another write",async({page})=>{const writes=await setup(page,"lost");await draft(page);await page.getByRole("button",{name:"Publish for customer review",exact:true}).click();await expect(page.getByRole("button",{name:"Retry same version"})).toBeVisible();await expect(page.getByLabel("Version note for customer")).toBeDisabled();await page.getByRole("button",{name:"Check result and refresh commission"}).click();await expect(page.getByText("Saved publication confirmed.",{exact:true})).toBeVisible();expect(writes).toHaveLength(1)})
test("non PNG upload blocks publication",async({page})=>{await setup(page);await page.goto("/en/admin/commissions");await page.getByRole("button",{name:"Open commission"}).click();await page.getByLabel("PNG preview").setInputFiles({name:"unsafe.png",mimeType:"image/png",buffer:Buffer.from("<svg onload='evil'/>")});await expect(page.getByText("Choose a valid PNG file up to 5 MiB.",{exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Publish for customer review"})).toBeDisabled()})
test("Persian mobile commission details fit the viewport",async({page})=>{await setup(page);await page.setViewportSize({width:390,height:844});await page.goto("/fa/admin/commissions");await page.getByRole("button",{name:"باز کردن سفارش",exact:true}).click();await expect(page.getByLabel("پیش‌نمایش PNG")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()})

test("server queue search and status preserve drafts until explicitly discarded",async({page})=>{
 await setup(page);page.removeAllListeners("dialog");let discard=false;page.on("dialog",d=>discard?d.accept():d.dismiss());const requests:URL[]=[]
 await page.route(url=>url.pathname==="/api/v1/admin/commissions",r=>{
 const url=new URL(r.request().url());requests.push(url)
 return r.fulfill({json:{items:url.searchParams.get("q")==="missing"||url.searchParams.get("status")==="approved"?[]:[initial],next_cursor:null}})
 })
 await page.goto("/en/admin/commissions")
 await page.getByRole("button",{name:"Open commission"}).click()
 await page.getByLabel("Version note for customer").fill("Keep the draft")
 await page.getByLabel("Search commissions").fill("missing")
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByLabel("Version note for customer")).toHaveValue("Keep the draft")
 discard=true
 await page.getByRole("button",{name:"Search",exact:true}).click()
 await expect(page.getByText("No commissions match this search and status.",{exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.get("q")).toBe("missing")
 await expect(page.getByLabel("Version note for customer")).toHaveCount(0)
 await page.getByRole("button",{name:"Clear search"}).click()
 await expect(page.getByRole("button",{name:"Open commission"})).toBeVisible()
 await page.getByRole("combobox",{name:"Commission status"}).click()
 await page.getByRole("option",{name:"Approved",exact:true}).click()
 await expect(page.getByText("No commissions match this search and status.",{exact:true})).toBeVisible()
 expect(requests.at(-1)?.searchParams.get("status")).toBe("approved")
})
