import {expect,test,type Page} from "@playwright/test"
const owner="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-000000000002"
const base={id,kind:"collections",slug:"reviewed-world",title_fa:"دنیای آزمایش",title_en:"Reviewed world",description_fa:"شرح آزمایش",description_en:"Reviewed description",collection_ids:[],category_ids:[],published:false,version:1}
async function access(page:Page){
 await page.route("**/api/v1/auth/access",route=>route.fulfill({json:{account_id:owner,roles:["admin"],permissions:["catalog.manage"]}}))
 await page.route("**/api/v1/auth/session/csrf",route=>route.fulfill({json:{csrf_token:"fresh-editor-csrf"}}))
}
async function catalog(page:Page,initial:typeof base|null=base){
 let record=initial
 const calls:{method:string;body:Record<string,unknown>;csrf:string}[]=[]
 const audits:{id:string;action:string;reason:string;actor_id:string;version:number;created_at:string;before:typeof base|null;after:typeof base}[]=[]
 await access(page)
 await page.route("**/api/v1/admin/catalog/entries/**",async route=>{
  const request=route.request(),url=new URL(request.url()),parts=url.pathname.split("/"),kind=parts[6],entryId=parts[7],tail=parts[8]
  if(request.method()==="GET"){
   if(tail==="audits")return route.fulfill({json:{items:audits,next_before_version:null}})
   if(entryId)return record?route.fulfill({json:record}):route.fulfill({status:404,json:{code:"catalog_entry_not_found"}})
   return route.fulfill({json:{items:kind==="collections"&&record?[record]:[],total:kind==="collections"&&record?1:0}})
  }
  const body=request.postDataJSON(),old=record
  calls.push({method:request.method(),body,csrf:request.headers()["x-csrf-token"]})
  if(tail==="publication")record={...record!,published:body.published,version:record!.version+1}
  else if(request.method()==="POST")record={...base,...body,kind,id:body.id,published:false,version:1}
  else record={...record!,...body,version:record!.version+1}
  audits.unshift({id:crypto.randomUUID(),action:tail==="publication"?(body.published?"published":"unpublished"):request.method()==="POST"?"created":"edited",reason:body.reason,actor_id:owner,version:record!.version,created_at:"2026-10-13T12:00:00Z",before:old,after:record!})
  return route.fulfill({status:request.method()==="POST"&&!tail?201:200,json:record})
 })
 return {calls,record:()=>record}
}

test("create draft, persist its editor URL and explicitly confirm publication",async({page})=>{
 const state=await catalog(page,null)
 await page.goto("/en/admin/collections/new")
 await page.getByLabel("Slug",{exact:true}).fill("reviewed-world")
 await page.getByLabel("Persian title",{exact:true}).fill("دنیای آزمایش")
 await page.getByLabel("English title",{exact:true}).fill("Reviewed world")
 await page.getByLabel("Reason for change",{exact:true}).fill("Create reviewed collection")
 await page.getByRole("button",{name:"Back to list",exact:false}).click()
 await expect(page.getByRole("dialog")).toBeVisible()
 await page.getByRole("button",{name:"Keep editing",exact:true}).click()
 await page.getByRole("button",{name:"Confirm and save content",exact:true}).click()
 await expect(page).toHaveURL(/\/collections\/[0-9a-f-]{36}\/edit$/)
 await expect(page.getByLabel("English title",{exact:true})).toHaveValue("Reviewed world")
 expect(state.record()?.published).toBe(false)
 expect(state.calls[0].body).not.toHaveProperty("published")
 expect(state.calls[0].csrf).toBe("fresh-editor-csrf")
 await page.reload()
 await expect(page.getByLabel("English title",{exact:true})).toHaveValue("Reviewed world")
 await page.getByRole("button",{name:"Publish record",exact:true}).click()
 await expect(page.getByRole("dialog",{name:"Confirm publication",exact:true})).toBeVisible()
 await page.getByLabel("Publication reason",{exact:true}).fill("Approve public visibility")
 await page.getByRole("button",{name:"Confirm and publish",exact:true}).click()
 await expect(page.getByText("Record published and audited.",{exact:true})).toBeVisible()
 expect(state.calls[1].body).toEqual({version:1,published:true,reason:"Approve public visibility"})
 await expect(page.getByLabel("Slug",{exact:true})).toHaveAttribute("readonly","")
 await expect(page.getByText("Published · Approve public visibility",{exact:false})).toBeVisible()
 await page.evaluate(()=>window.scrollTo(0,0))
 await page.screenshot({path:"/tmp/nilart-catalog-editor-desktop.png",fullPage:true})
 await page.getByRole("button",{name:"Unpublish",exact:true}).click()
 await page.getByLabel("Publication reason",{exact:true}).fill("Withdraw public visibility")
 await page.getByRole("button",{name:"Confirm and unpublish",exact:true}).click()
 await expect(page.getByText("Record unpublished and audited.",{exact:true})).toBeVisible()
 expect(state.record()?.published).toBe(false)
})

test("content conflict keeps bilingual input and blocks a repeated mutation",async({page})=>{
 await catalog(page)
 await page.route(`**/api/v1/admin/catalog/entries/collections/${id}`,route=>route.request().method()==="PUT"?route.fulfill({status:409,json:{code:"catalog_version_conflict"}}):route.fulfill({json:base}))
 await page.goto(`/en/admin/collections/${id}/edit`)
 await page.getByLabel("English title",{exact:true}).fill("My unsaved title")
 await page.getByLabel("Reason for change",{exact:true}).fill("Revise title")
 await page.getByRole("button",{name:"Confirm and save content",exact:true}).click()
 await expect(page.getByText("This record changed. Reload before saving.",{exact:true})).toBeVisible()
 await expect(page.getByLabel("English title",{exact:true})).toHaveValue("My unsaved title")
 await expect(page.getByRole("button",{name:"Confirm and save content",exact:true})).toBeDisabled()
 await page.getByRole("button",{name:"Reload record",exact:true}).click()
 await page.getByRole("button",{name:"Discard",exact:true}).click()
 await expect(page.getByLabel("English title",{exact:true})).toHaveValue("Reviewed world")
})

test("unknown creation checks its stable ID before an explicit new save",async({page})=>{
 const state=await catalog(page,null)
 let creates=0
 await page.route("**/api/v1/admin/catalog/entries/collections",route=>{creates++;return route.abort("failed")})
 await page.goto("/en/admin/collections/new")
 await page.getByLabel("Slug",{exact:true}).fill("reviewed-world")
 await page.getByLabel("Persian title",{exact:true}).fill("آزمایش")
 await page.getByLabel("English title",{exact:true}).fill("New draft")
 await page.getByLabel("Reason for change",{exact:true}).fill("Create")
 await page.getByRole("button",{name:"Confirm and save content",exact:true}).click()
 await expect(page.getByText("Result unconfirmed. Reload this record to check its state.",{exact:true})).toBeVisible()
 await expect(page.getByRole("button",{name:"Confirm and save content",exact:true})).toBeDisabled()
 expect(creates).toBe(1)
 expect(state.calls).toHaveLength(0)
 await page.getByRole("button",{name:"Reload record",exact:true}).click()
 await page.getByRole("button",{name:"Discard",exact:true}).click()
 await expect(page.getByText("The server confirmed this ID was not created. Review your draft before saving again.",{exact:true})).toBeVisible()
 await expect(page.getByLabel("English title",{exact:true})).toHaveValue("New draft")
 await expect(page.getByRole("button",{name:"Confirm and save content",exact:true})).toBeEnabled()
 expect(creates).toBe(1)
})

test("Persian mobile product editor reads private membership choices without inferring publication",async({page})=>{
 await access(page)
 const product={...base,kind:"products",slug:"test-product",collection_ids:[id]}
 await page.route("**/api/v1/admin/catalog/entries/products/*/audits",route=>route.fulfill({json:{items:[],next_before_version:null}}))
 await page.route(`**/api/v1/admin/catalog/entries/products/${id}`,route=>route.fulfill({json:product}))
 await page.route("**/api/v1/admin/catalog/entries/collections?*",route=>route.fulfill({json:{items:[base],total:1}}))
 await page.route("**/api/v1/admin/catalog/entries/categories?*",route=>route.fulfill({json:{items:[],total:0}}))
 await page.setViewportSize({width:390,height:844})
 await page.goto(`/fa/admin/products/${id}/edit`)
 await expect(page.getByLabel("عنوان فارسی",{exact:true})).toHaveValue("دنیای آزمایش")
 await expect(page.getByRole("checkbox",{name:"دنیای آزمایش · پیش‌نویس",exact:true})).toBeChecked()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.screenshot({path:"/tmp/nilart-catalog-editor-mobile.png",fullPage:true})
})
