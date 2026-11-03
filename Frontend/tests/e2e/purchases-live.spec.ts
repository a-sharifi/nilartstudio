import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {randomUUID} from "node:crypto"
const enabled=process.env.NILART_RUN_DEMO_TESTS==="true"&&process.env.PLAYWRIGHT_BASE_URL==="http://127.0.0.1:18080"
test.skip(!enabled,"Writes synthetic records only in the isolated nilart-demo workspace.")
test("real purchase draft, posting, partial receipt and linked supplier return persist",async({page})=>{
 page.setDefaultTimeout(5000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}))
 const origin="http://127.0.0.1:18080"
 expect((await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:"+989121110001",password:env.NILART_DEMO_ADMIN_PASSWORD}})).status()).toBe(200)
 async function write(path:string,data:unknown){const csrf=await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}});expect(csrf.status()).toBe(200);return page.request.put(`${origin}${path}`,{headers:{Origin:origin,"X-CSRF-Token":(await csrf.json()).csrf_token},data})}
 const supplier=randomUUID(),material=randomUUID(),tag=randomUUID().slice(0,8).toUpperCase(),code=`DEMO-P-${tag}`,purchaseNumber=`PUR-${tag}`
 expect((await write(`/api/v1/admin/procurement/suppliers/${supplier}/versions/${randomUUID()}`,{expected_version:0,content:{kind:"supplier",code:`SUP-${tag}`,title_fa:"تأمین‌کننده آزمایش خرید",title_en:`Purchase demo ${tag}`},reason:"Isolated purchase browser supplier"})).status()).toBe(200)
 expect((await write(`/api/v1/admin/costing/resources/${material}/versions/${randomUUID()}`,{expected_version:0,content:{kind:"material",code,title_fa:"ماده آزمایش خرید",title_en:"Purchase demo paper",base_unit:"sheet",purchase_unit:"pack",purchase_to_base:"250",supplier:"Synthetic purchase supplier",rate:{amount:"10",currency:"IRT"}},reason:"Isolated purchase browser material"})).status()).toBe(200)
 page.on("dialog",d=>d.accept())
 await page.goto("/en/admin/purchases/new")
 await page.getByLabel("Purchase document number",{exact:true}).fill(purchaseNumber)
 await page.getByLabel("Purchase date",{exact:true}).fill("2026-10-18")
 await page.getByLabel("Find supplier",{exact:true}).fill(`SUP-${tag}`)
 await page.getByRole("button",{name:"Find suppliers",exact:true}).click()
 await page.getByRole("button",{name:`SUP-${tag} · Purchase demo ${tag}`,exact:true}).click()
 await page.getByLabel("Find purchase item",{exact:true}).fill(code)
 await page.getByRole("button",{name:"Find purchase items",exact:true}).click()
 await page.getByRole("button",{name:`${code} · Purchase demo paper · sheet`,exact:true}).click()
 for(const [label,value] of [["Base quantity","10"],["Base unit price (toman)","10"],["Line discount (toman)","10"],["Supplier-billed acquisition cost (toman)","5"]])await page.getByLabel(label,{exact:true}).fill(value)
 await page.getByLabel("Purchase action reason",{exact:true}).fill("Synthetic purchase draft")
 await page.getByRole("button",{name:"Save purchase draft",exact:true}).click()
 await expect(page).toHaveURL(/\/admin\/purchases\/[0-9a-f-]{36}$/)
 const id=page.url().split("/").at(-1)
 await page.getByLabel("Purchase action reason",{exact:true}).fill("Post isolated invoice")
 await page.getByRole("button",{name:"Post purchase",exact:true}).click()
 await expect(page.getByRole("button",{name:"Receive goods",exact:true})).toBeVisible()
 let lost=false,receiptPath="",receiptIntent:unknown=null
 await page.route("**/api/v1/admin/procurement/purchases/*/commands/*",async route=>{
  if(route.request().method()==="PUT"&&route.request().postDataJSON().action==="receive"&&!lost){lost=true;receiptPath=new URL(route.request().url()).pathname;receiptIntent=route.request().postDataJSON();const stored=await route.fetch();expect(stored.status()).toBe(200);return route.abort("failed")}
  return route.continue()
 })
 await page.getByLabel(`Operation quantity ${code}`,{exact:true}).fill("4")
 await page.getByLabel("Purchase action reason",{exact:true}).fill("Receive four counted sheets")
 await page.getByRole("button",{name:"Receive goods",exact:true}).click()
 await expect(page.getByRole("button",{name:"Check purchase result",exact:true})).toBeVisible()
 await page.getByRole("button",{name:"Check purchase result",exact:true}).click()
 expect((await write(receiptPath,receiptIntent)).status()).toBe(200)
 await expect(page.getByLabel(`Operation quantity ${code}`,{exact:true})).toHaveValue("")
 const response=await page.request.get(`${origin}/api/v1/admin/procurement/purchases/${id}`);expect(response.status()).toBe(200)
 const received=await response.json();expect(received.version).toBe(3)
 const effect=received.state.movements[0]
 expect((await (await page.request.get(`${origin}/api/v1/admin/inventory/positions/${effect.position_id}`)).json()).quantity).toBe("4.000000")
 await page.getByRole("combobox",{name:"Purchase stock action",exact:true}).click();await page.getByRole("option",{name:"Return to supplier",exact:true}).click()
 await page.getByRole("combobox",{name:"Source receipt",exact:true}).click();await page.getByRole("option",{name:/v3/}).click()
 await page.getByLabel(`Operation quantity ${code}`,{exact:true}).fill("1")
 await page.getByLabel("Purchase action reason",{exact:true}).fill("Return one sheet against source receipt")
 await page.getByRole("button",{name:"Return to supplier",exact:true}).click()
 await expect(page.getByLabel(`Operation quantity ${code}`,{exact:true})).toHaveValue("")
 await page.reload();await expect(page.getByRole("heading",{name:`${purchaseNumber} · Posted`,exact:true})).toBeVisible()
 const final=await (await page.request.get(`${origin}/api/v1/admin/procurement/purchases/${id}`)).json()
 expect(final.version).toBe(4);expect(final.state.liability).toBe("85.500000")
 const position=await (await page.request.get(`${origin}/api/v1/admin/inventory/positions/${effect.position_id}`)).json()
 expect(position).toMatchObject({quantity:"3.000000",value:"28.500000",average_cost:"9.500000"})
 await page.goto(`/en/admin/inventory/suppliers/${supplier}`)
 await page.getByRole("button",{name:"Load purchase statement",exact:true}).click();await expect(page.getByText("85.5",{exact:true}).first()).toBeVisible()
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/admin/purchases/${id}`)
 await expect(page.getByRole("heading",{name:new RegExp(purchaseNumber)})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.screenshot({path:"/tmp/nilart-purchase-fa-mobile.png",fullPage:true})
})
