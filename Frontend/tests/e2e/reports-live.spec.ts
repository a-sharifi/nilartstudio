import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {randomUUID} from "node:crypto"
const origin="http://127.0.0.1:18080"
test.skip(process.env.NILART_RUN_DEMO_TESTS!=="true"||process.env.PLAYWRIGHT_BASE_URL!==origin,"Synthetic report data requires isolated demo resources")
test("real as-of valuation, low stock, waste correction, source trace and protected XLSX",async({page})=>{
 test.setTimeout(90000);page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(30000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:"+989121110001",password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const csrf=(await login.json()).csrf_token
 async function put(path:string,data:unknown){const r=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.status(),await r.text()).toBe(200);return r.json()}
 const tag=randomUUID().slice(0,8).toUpperCase(),material=randomUUID(),materialRevision=randomUUID()
 await put(`/api/v1/admin/costing/resources/${material}/versions/${materialRevision}`,{expected_version:0,content:{kind:'material',code:`RPT-${tag}`,title_fa:'ماده آزمایش گزارش',title_en:'Report test material',base_unit:'sheet',purchase_unit:'pack',purchase_to_base:'100',supplier:'Isolated reporting supplier',rate:{amount:'999',currency:'IRT'},valid_from:'2026-10-19'},reason:'Synthetic reporting reference'})
 const opening=await put(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'material',reference_id:material,expected_version:0,action:'opening',quantity:'10',value:'100',reason:'Counted test material cost'})
 await put(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'material',reference_id:material,expected_version:1,action:'threshold',threshold:'10',reason:'Explicit replenishment threshold'})
 const before=new Date().toISOString()
 const waste=await put(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'material',reference_id:material,expected_version:2,action:'waste',quantity:'2',reason:`Warehouse damage ${tag}`})
 const damaged=new Date().toISOString()
 const reversed=await put(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'material',reference_id:material,expected_version:3,action:'reverse',reverses_id:waste.id,reason:'Corrected warehouse inspection'})
 const after=new Date().toISOString(),filters=new URLSearchParams({view:'inventory',as_of:before,q:`RPT-${tag}`,kind:'material',low:'true'})
 await page.goto(`/en/admin/reports/inventory?${filters}`)
 const table=page.getByRole('table',{name:'Inventory valuation',exact:true})
 await expect(table.getByRole('row').filter({hasText:`RPT-${tag}`})).toBeVisible()
 await expect(table.getByText('100',{exact:true})).toBeVisible();await expect(table.getByText('10',{exact:true})).toHaveCount(2)
 const historical=await (await page.request.get(`${origin}/api/v1/admin/reports/inventory?${new URLSearchParams({as_of:damaged,q:`RPT-${tag}`})}`)).json()
 expect(historical.items[0]).toMatchObject({quantity:'8.000000',value:'80.000000',average_cost:'10.000000'})
 expect(historical.reservation_history_available).toBe(false)
 const download=await page.request.get(await page.getByRole('link',{name:'Download report XLSX',exact:true}).getAttribute('href') as string)
 expect(download.status()).toBe(200);expect(download.headers()['content-type']).toContain('spreadsheetml.sheet');expect((await download.body()).subarray(0,2).toString()).toBe('PK')
 await page.getByRole('button',{name:"Report this item's movements",exact:true}).click()
 await expect(page.getByRole('table',{name:'Stock movements',exact:true}).getByText(opening.id,{exact:true})).toBeVisible()
 await page.goBack();await expect(page.getByRole('table',{name:'Inventory valuation',exact:true})).toBeVisible()
 await page.goto(`/en/admin/reports/inventory?${new URLSearchParams({view:'waste',as_of:after,from_time:before,q:`RPT-${tag}`})}`)
 const wasteTable=page.getByRole('table',{name:'Stock waste & corrections',exact:true})
 await expect(wasteTable.getByText(waste.id,{exact:true}).first()).toBeVisible();await expect(wasteTable.getByText(reversed.id,{exact:true})).toBeVisible()
 const recorded=await (await page.request.get(`${origin}/api/v1/admin/reports/waste?${new URLSearchParams({as_of:after,from_time:before,q:`RPT-${tag}`})}`)).json();expect(recorded.totals.value).toBe('0.000000')

 const product=randomUUID(),recipe=randomUUID(),revision=randomUUID(),batch=randomUUID(),bomLine=randomUUID()
 const created=await page.request.post(`${origin}/api/v1/admin/catalog/entries/products`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:{id:product,slug:`report-${tag.toLowerCase()}`,title_fa:'کالای گزارش',title_en:'Report product',description_fa:'آزمایش مستقل',description_en:'Isolated report test',reason:'Synthetic report production'}});expect(created.status()).toBe(201)
 const skuResponse=await page.request.post(`${origin}/api/v1/admin/catalog/products/${product}/skus`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:{code:`RSKU-${tag}`}});expect(skuResponse.status()).toBe(201);const sku=(await skuResponse.json()).sku_id
 await put(`/api/v1/admin/costing/recipes/${recipe}/versions/${revision}`,{expected_version:0,content:{sku_id:sku,title_fa:'فرمول گزارش',title_en:'Report BOM',valid_from:'2026-10-19',lines:[{id:bomLine,label:'Recorded paper',resource_id:material,resource_revision_id:materialRevision,quantity:'1',unit:'base',basis:'output',waste_fraction:'0'}]},reason:'Pinned report recipe'})
 await put(`/api/v1/admin/production/${batch}/commands/${randomUUID()}`,{expected_version:0,action:'draft',content:{recipe_id:recipe,revision_id:revision,batch_number:`RB-${tag}`,production_date:'2026-10-19',target_output:2},reason:'Synthetic report batch'})
 await put(`/api/v1/admin/production/${batch}/commands/${randomUUID()}`,{expected_version:1,action:'start',reason:'Start test batch'})
 await put(`/api/v1/admin/production/${batch}/commands/${randomUUID()}`,{expected_version:2,action:'issue',lines:[{line_id:bomLine,quantity:'2'}],reason:'Two sheets actual consumption'})
 const running=new Date().toISOString()
 await put(`/api/v1/admin/production/${batch}/commands/${randomUUID()}`,{expected_version:3,action:'complete',quality:{healthy_output:1,normal_waste:0,abnormal_damage:1},reason:'One healthy and one damaged'})
 const completed=new Date().toISOString()
 await page.goto(`/en/admin/reports/production?${new URLSearchParams({view:'production',as_of:running,q:`RB-${tag}`})}`)
 await expect(page.getByRole('table',{name:'Production cost & WIP',exact:true}).getByText('running',{exact:true})).toBeVisible()
 await page.goto(`/en/admin/reports/production?${new URLSearchParams({view:'production',as_of:completed,q:`RB-${tag}`})}`)
 const production=page.getByRole('table',{name:'Production cost & WIP',exact:true});await expect(production.getByText('completed',{exact:true})).toBeVisible();await expect(production.getByText('1,998',{exact:true})).toBeVisible()
 const final=(await (await page.request.get(`${origin}/api/v1/admin/reports/production?${new URLSearchParams({as_of:completed,q:`RB-${tag}`})}`)).json()).items[0];expect(final).toMatchObject({wip:'0',transferred_value:'10.000000',abnormal_loss:'10.000000',actual_recorded_total:'20.000000',estimated_total:'1998.000000',unit_cost:'10.000000'})

 await page.goto('/en/admin')
 await expect(page.getByRole('heading',{name:'Recorded inventory & production',exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Review low stock',exact:true}).click()
 await expect(page).toHaveURL(/\/admin\/reports\/inventory\?.*low=true/)
 await expect(page.getByRole('table',{name:'Inventory valuation',exact:true})).toBeVisible()
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/finance/inventory-value?${filters}`);await expect(page.getByRole('table',{name:language==='fa'?'ارزش موجودی':'Inventory valuation',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-reports-${language}-${width}.png`,fullPage:true})}
})
