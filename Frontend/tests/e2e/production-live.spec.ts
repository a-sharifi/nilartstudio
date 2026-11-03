import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {randomUUID} from "node:crypto"
const origin="http://127.0.0.1:18080"
const enabled=process.env.NILART_RUN_DEMO_TESTS==="true"&&process.env.PLAYWRIGHT_BASE_URL===origin
test.skip(!enabled,"Uses synthetic records only in the explicitly isolated demo workspace.")
for(const failure of ["network","server_error"])test(`real purchase-to-production journey recovers ${failure} and preserves QC costs`,async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(6000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}))
 expect((await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:"+989121110001",password:env.NILART_DEMO_ADMIN_PASSWORD}})).status()).toBe(200)
 let apiCsrf:string|null=null
 async function write(path:string,data:unknown,method:"PUT"|"POST"="PUT"){
  if(!apiCsrf){const csrf=await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}});expect(csrf.status()).toBe(200);apiCsrf=(await csrf.json()).csrf_token}
  return page.request.fetch(`${origin}${path}`,{method,headers:{Origin:origin,"X-CSRF-Token":apiCsrf!},data})
 }
 const tag=randomUUID().slice(0,8).toUpperCase(),product=randomUUID(),material=randomUUID(),materialRevision=randomUUID(),service=randomUUID(),serviceRevision=randomUUID(),recipe=randomUUID(),recipeRevision=randomUUID(),supplier=randomUUID(),purchase=randomUUID(),purchaseLine=randomUUID(),line=randomUUID(),serviceLine=randomUUID(),code=`PROD-${tag}`
 const productResult=await write('/api/v1/admin/catalog/entries/products',{id:product,slug:`demo-production-${tag.toLowerCase()}`,title_fa:"کالای آزمایش تولید",title_en:"Production demo product",description_fa:"آزمایش مستقل",description_en:"Isolated production test",reason:"Synthetic production product"},"POST")
 expect(productResult.status()).toBe(201)
 const skuResponse=await write(`/api/v1/admin/catalog/products/${product}/skus`,{code},"POST");expect(skuResponse.status()).toBe(201);const sku=(await skuResponse.json()).sku_id
 expect((await write(`/api/v1/admin/costing/resources/${material}/versions/${materialRevision}`,{expected_version:0,content:{kind:"material",code:`MAT-${tag}`,title_fa:"ماده آزمایش تولید",title_en:"Production demo material",base_unit:"sheet",purchase_unit:"pack",purchase_to_base:"100",supplier:"Isolated production supplier",rate:{amount:"10",currency:"IRT"},valid_from:"2026-10-01"},reason:"Synthetic production material"})).status()).toBe(200)
 expect((await write(`/api/v1/admin/costing/resources/${service}/versions/${serviceRevision}`,{expected_version:0,content:{kind:"service",code:`SVC-${tag}`,title_fa:"خدمت آزمایش تولید",title_en:"Production demo binding",base_unit:"piece",rate:{amount:"3",currency:"IRT"},valid_from:"2026-10-01"},reason:"Synthetic production service"})).status()).toBe(200)
 expect((await write(`/api/v1/admin/costing/recipes/${recipe}/versions/${recipeRevision}`,{expected_version:0,content:{sku_id:sku,title_fa:"فرمول آزمایش تولید",title_en:"Demo production recipe",valid_from:"2026-10-01",lines:[{id:line,label:"Paper",resource_id:material,resource_revision_id:materialRevision,quantity:"1",unit:"base",basis:"output",waste_fraction:"0"},{id:serviceLine,label:"Binding",resource_id:service,resource_revision_id:serviceRevision,quantity:"1",unit:"base",basis:"output"}]},reason:"Synthetic pinned BOM"})).status()).toBe(200)
 expect((await write(`/api/v1/admin/procurement/suppliers/${supplier}/versions/${randomUUID()}`,{expected_version:0,content:{kind:"supplier",code:`SUP-P-${tag}`,title_fa:"تأمین‌کننده آزمایش تولید",title_en:"Production demo supplier"},reason:"Synthetic supplier"})).status()).toBe(200)
 for(const [version,action,extra] of [[0,"draft",{content:{supplier_id:supplier,document_number:`P-${tag}`,document_date:"2026-10-18",currency:"IRT",lines:[{id:purchaseLine,kind:"material",reference_id:material,quantity:"100",unit_price:"10",discount:"0",supplier_acquisition_cost:"0"}]}}],[1,"post",{}],[2,"receive",{lines:[{line_id:purchaseLine,quantity:"100"}]}]] as const){const response=await write(`/api/v1/admin/procurement/purchases/${purchase}/commands/${randomUUID()}`,{expected_version:version,action,reason:"Isolated purchase-to-production receipt",...extra});expect(response.status()).toBe(200)}
 page.on("dialog",d=>d.accept())
 await page.goto('/en/admin/production/new')
 await page.getByLabel('Batch number',{exact:true}).fill(`B-${tag}`)
 await page.getByLabel('Production date',{exact:true}).fill('2026-10-18')
 await page.getByLabel('Target output',{exact:true}).fill('10')
 await page.getByLabel('Find recipe or SKU',{exact:true}).fill(code)
 await page.getByRole('button',{name:'Find recipes',exact:true}).click()
 await page.getByRole('button',{name:`${code} · Demo production recipe · v1`,exact:true}).click()
 await page.getByLabel('Production action reason',{exact:true}).fill('Plan isolated production batch')
 await page.getByRole('button',{name:'Save production order',exact:true}).click()
 await expect(page).toHaveURL(/\/admin\/production\/[0-9a-f-]{36}$/);const id=page.url().split('/').at(-1)
 await page.getByLabel('Production action reason',{exact:true}).fill('Start approved batch')
 await page.getByRole('button',{name:'Start batch',exact:true}).click()
 await page.getByLabel(`Material quantity MAT-${tag}`,{exact:true}).fill('12')
 await page.getByLabel('Production action reason',{exact:true}).fill('Issue twelve counted sheets')
 await page.getByRole('button',{name:'Issue materials',exact:true}).click()
 await expect(page.getByLabel(`Material quantity MAT-${tag}`,{exact:true})).toHaveValue('')
 await page.getByRole('combobox',{name:'Material operation',exact:true}).click();await page.getByRole('option',{name:'Return unused materials',exact:true}).click()
 await page.getByLabel(`Material quantity MAT-${tag}`,{exact:true}).fill('2')
 await page.getByLabel('Production action reason',{exact:true}).fill('Return two unused sheets')
 await page.getByRole('button',{name:'Return unused materials',exact:true}).click()
 await expect(page.getByLabel(`Material quantity MAT-${tag}`,{exact:true})).toHaveValue('')
 await page.getByLabel(`Service cost SVC-${tag}`,{exact:true}).fill('25')
 await page.getByLabel('Production action reason',{exact:true}).fill('Actual workshop binding cost')
 await page.getByRole('button',{name:`Record service cost SVC-${tag}`,exact:true}).click()
 await expect(page.getByLabel(`Service cost SVC-${tag}`,{exact:true})).toHaveValue('')
 let lost=false,completionPath='',completionIntent:unknown=null
 await page.route('**/api/v1/admin/production/*/commands/*',async route=>{if(route.request().method()==='PUT'&&route.request().postDataJSON().action==='complete'&&!lost){lost=true;completionPath=new URL(route.request().url()).pathname;completionIntent=route.request().postDataJSON();const result=await route.fetch();expect(result.status()).toBe(200);return failure==='network'?route.abort('failed'):route.fulfill({status:500,json:{code:'internal_error'}})}return route.continue()})
 for(const [label,value] of [['Healthy output','8'],['Normal waste','1'],['Abnormal damage','1']])await page.getByLabel(label,{exact:true}).fill(value)
 await page.getByLabel('Production action reason',{exact:true}).fill('Workshop QC: eight healthy, one normal waste, one abnormal damage')
 await page.getByRole('button',{name:'Confirm QC & transfer output',exact:true}).click()
 await page.getByRole('button',{name:'Check production result',exact:true}).click()
 await expect(page.getByRole('heading',{name:`B-${tag} · Completed`,exact:true})).toBeVisible()
 apiCsrf=null
 expect((await write(completionPath,completionIntent)).status()).toBe(200)
 await page.reload();await expect(page.getByRole('heading',{name:`B-${tag} · Completed`,exact:true})).toBeVisible()
 const batch=await (await page.request.get(`${origin}/api/v1/admin/production/${id}`)).json()
 expect(batch.version).toBe(6);expect(batch.state).toMatchObject({wip:'0',transferred_value:'111.111111',abnormal_loss:'13.888889',quality:{healthy_output:8,normal_waste:1,abnormal_damage:1}})
 const position=await (await page.request.get(`${origin}/api/v1/admin/inventory/positions/${batch.state.movements[0].position_id}`)).json()
 expect(position).toMatchObject({reference_id:sku,quantity:'8.000000',value:'111.111111'})
 const stock=await (await page.request.get(`${origin}/api/v1/admin/inventory?q=MAT-${tag}`)).json();expect(stock.items[0]).toMatchObject({quantity:'90.000000',value:'900.000000'})
 await page.setViewportSize({width:390,height:844});await page.goto(`/fa/admin/production/${id}/qc`)
 await expect(page.getByRole('heading',{name:new RegExp(`B-${tag}`)})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.screenshot({path:'/tmp/nilart-production-fa-mobile.png',fullPage:true})
 apiCsrf=null
 const waste=await write(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'material',reference_id:material,expected_version:stock.items[0].version,action:'waste',quantity:'1',reason:`Warehouse damage ${tag}`});expect(waste.status()).toBe(200)
 await page.goto('/fa/admin/waste');await page.getByLabel('جست‌وجوی قلم یا دلیل',{exact:true}).fill(`MAT-${tag}`);await page.getByRole('button',{name:'جست‌وجو',exact:true}).click()
 await expect(page.getByText(`Warehouse damage ${tag}`,{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()

})
