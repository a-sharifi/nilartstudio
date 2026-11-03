import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {randomUUID} from "node:crypto"
const origin="http://127.0.0.1:18080"
test.skip(process.env.NILART_RUN_DEMO_TESTS!=="true"||process.env.PLAYWRIGHT_BASE_URL!==origin,"Price publication tests require isolated demo records")
test("real proposal review, explicit publication, lost-result recovery and stale-rate rejection",async({page})=>{
 test.setTimeout(90000);page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(30000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:"+989121110001",password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 let csrf=(await login.json()).csrf_token
 async function write(path:string,data:unknown,method:"PUT"|"POST"="PUT"){if(!csrf)csrf=(await (await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token;const r=await page.request.fetch(`${origin}${path}`,{method,headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.ok(),await r.text()).toBe(true);return r.json()}
 const tag=randomUUID().slice(0,8).toUpperCase(),product=randomUUID(),material=randomUUID(),resourceRevision=randomUUID(),recipe=randomUUID(),revision=randomUUID(),line=randomUUID(),code=`PRICE-${tag}`
 await write('/api/v1/admin/catalog/entries/products',{id:product,slug:`price-${tag.toLowerCase()}`,title_fa:'کالای آزمایش قیمت',title_en:'Pricing test product',description_fa:'آزمایش مستقل',description_en:'Isolated price test',reason:'Synthetic price review'},'POST')
 const sku=(await write(`/api/v1/admin/catalog/products/${product}/skus`,{code},'POST')).sku_id
 const materialContent={kind:'material',code:`PM-${tag}`,title_fa:'ماده آزمایش قیمت',title_en:'Pricing material',base_unit:'sheet',purchase_unit:'pack',purchase_to_base:'10',supplier:'Synthetic price supplier',rate:{amount:'100000',currency:'IRT'},valid_from:'2026-10-19'}
 await write(`/api/v1/admin/costing/resources/${material}/versions/${resourceRevision}`,{expected_version:0,content:materialContent,reason:'Explicit synthetic cost'})
 const recipeContent={sku_id:sku,title_fa:'فرمول آزمایش قیمت',title_en:'Pricing test BOM',valid_from:'2026-10-19',lines:[{id:line,label:'Paper',resource_id:material,resource_revision_id:resourceRevision,quantity:'1',unit:'base',basis:'output',waste_fraction:'0'}]}
 await write(`/api/v1/admin/costing/recipes/${recipe}/versions/${revision}`,{expected_version:0,content:recipeContent,reason:'Pinned costing formula'})
 page.on('dialog',d=>d.accept())
 async function form(custom=''){
  for(const [label,value] of [['Cost date','2026-10-19'],['Recipe healthy output','1'],['Target margin (fraction 0–1)','0.25'],['Percentage fee (fraction)','0'],['Fixed selling cost per unit (toman)','0'],['Rounding step (toman)','1'],['Custom price (optional, toman)',custom],['Simulated discount (fraction; zero for none)','0']])await page.getByLabel(label,{exact:true}).fill(value)
  await page.getByRole('combobox',{name:'Rounding method',exact:true}).click();await page.getByRole('option',{name:'Nearest; half up',exact:true}).click()
  await page.getByRole('button',{name:'Calculate & preview',exact:true}).click();await expect(page.getByText('Calculated. Saving and publishing are separate steps.',{exact:true})).toBeVisible()
  await page.getByLabel('Pricing decision reason',{exact:true}).fill('Reviewed synthetic price proposal')
  await page.getByRole('button',{name:'Save proposal; do not publish',exact:true}).click();await expect(page).toHaveURL(/\/pricing\/reviews\/[0-9a-f-]{36}$/)
 }
 await page.goto(`/en/admin/pricing/${sku}`)
 await page.getByRole('button',{name:'Calculate & preview',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Enter explicit date'})).toBeVisible()
 await form()
 const proposal=page.url().split('/').at(-1)!
 await expect(page.getByRole('heading',{name:new RegExp(`${code} · Pending review`)})).toBeVisible()
 expect((await (await page.request.get(`${origin}/api/v1/admin/catalog/skus/${sku}/price`)).json()).price).toBeNull()
 let lost=false,publicationPath='';let publicationIntent:unknown
 await page.route('**/api/v1/admin/pricing/proposals/*/commands/*',async route=>{if(route.request().method()==='PUT'&&route.request().postDataJSON().action==='publish'&&!lost){lost=true;publicationPath=new URL(route.request().url()).pathname;publicationIntent=route.request().postDataJSON();const response=await route.fetch();expect(response.status()).toBe(200);return route.abort('failed')}return route.continue()})
 await page.getByLabel('Pricing decision reason',{exact:true}).fill('Explicit approval to publish demo public price')
 await page.getByRole('button',{name:'Confirm & publish public price',exact:true}).click();await expect(page.getByText('Result unknown. Check or retry the same operation.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Check pricing decision result',exact:true}).click();await expect(page.getByRole('heading',{name:new RegExp(`${code} · Published`)})).toBeVisible()
 csrf=null;await write(publicationPath,publicationIntent)
 const price=await (await page.request.get(`${origin}/api/v1/admin/catalog/skus/${sku}/price`)).json();expect(price).toMatchObject({version:1,price:{amount:'133333.000000',currency:'IRT'}})
 expect((await (await page.request.get(`${origin}/api/v1/admin/catalog/skus/${sku}/price/audits`)).json()).items).toHaveLength(1)
 await page.goto(`/en/admin/pricing/${sku}`);await form('140000');const second=page.url().split('/').at(-1)!
 csrf=null;const newRevision=randomUUID()
 await write(`/api/v1/admin/costing/resources/${material}/versions/${newRevision}`,{expected_version:1,content:{...materialContent,rate:{amount:'120000',currency:'IRT'}},reason:'Synthetic changed material rate'})
 await page.reload();await expect(page.getByText("This proposal's inputs changed. Publication is blocked until a reviewed revision is saved.",{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Confirm & publish public price',exact:true})).toBeDisabled()
 await write(`/api/v1/admin/costing/recipes/${recipe}/versions/${randomUUID()}`,{expected_version:1,content:{...recipeContent,lines:[{...recipeContent.lines[0],resource_revision_id:newRevision}]},reason:'Explicitly reviewed new pinned rate'})
 await page.getByRole('button',{name:'Calculate & preview',exact:true}).click();await expect(page.getByText('Calculated. Saving and publishing are separate steps.',{exact:true})).toBeVisible()
 await page.getByLabel('Pricing decision reason',{exact:true}).fill('Reviewed edited proposal with new cost')
 await page.getByRole('button',{name:'Save proposal; do not publish',exact:true}).click();await expect(page.getByRole('heading',{name:new RegExp(`${code} · Pending review · v2`)})).toBeVisible()
 await page.getByLabel('Pricing decision reason',{exact:true}).fill('Human rejection: retain the approved public price')
 await page.getByRole('button',{name:'Reject proposal with reason',exact:true}).click();await expect(page.getByRole('heading',{name:new RegExp(`${code} · Rejected`)})).toBeVisible()
 expect((await (await page.request.get(`${origin}/api/v1/admin/catalog/skus/${sku}/price`)).json()).version).toBe(1)
 const original=await (await page.request.get(`${origin}/api/v1/admin/pricing/proposals/${proposal}`)).json();expect(original.snapshot.cost_per_output).toBe('100000.000000');expect(original.status).toBe('published')
 expect((await (await page.request.get(`${origin}/api/v1/admin/pricing/proposals/${second}/events`)).json()).items).toHaveLength(3)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/pricing/reviews/${proposal}`);await expect(page.getByRole('table',{name:language==='fa'?'ریز هزینه فرمول ثابت':'Pinned recipe cost breakdown',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-pricing-${language}-${width}.png`,fullPage:true})}
})
