import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {randomUUID} from "node:crypto"
const origin="http://127.0.0.1:18080"
test.skip(process.env.NILART_RUN_DEMO_TESTS!=="true"||process.env.PLAYWRIGHT_BASE_URL!==origin,"Synthetic financial records require isolated demo resources")
test("real financial accounts, transfer, expense, uncertain recovery and linked correction",async({page})=>{
 test.setTimeout(90000);page.setDefaultTimeout(8000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}))
 expect((await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:"+989121110001",password:env.NILART_DEMO_ADMIN_PASSWORD}})).status()).toBe(200)
 page.on("dialog",d=>d.accept())
 const tag=randomUUID().slice(0,8).toUpperCase()
 await page.goto('/en/admin/finance/accounts')
 for(const [code,amount] of [[`C-${tag}`,"500"],[`B-${tag}`,"0"]]){
  await page.getByRole('button',{name:'New account',exact:true}).click()
  for(const [label,value] of [['Account code',code],['Persian account name',`حساب ${tag}`],['English account name',code],['Opening balance (toman)',amount],['Opening date','2026-10-19'],['Financial posting reason','Counted isolated sandbox opening']])await page.getByLabel(label,{exact:true}).fill(value)
  if(code.startsWith('B-')){await page.getByRole('combobox',{name:'Account type',exact:true}).click();await page.getByRole('option',{name:'Bank',exact:true}).click()}
  await page.getByRole('button',{name:'Confirm financial posting',exact:true}).click()
  await expect(page.getByText('Financial record and related balances confirmed.',{exact:true})).toBeVisible()
 }
 let lost=false,operation='';let intent:unknown
 await page.goto('/en/admin/finance/receipts-payments')
 await page.getByRole('button',{name:'New financial record',exact:true}).click()
 await page.getByRole('combobox',{name:'Financial record type',exact:true}).click();await page.getByRole('option',{name:'Internal transfer',exact:true}).click()
 for(const [label,value] of [['Financial document number',`T-${tag}`],['Financial date','2026-10-19'],['Amount (toman)','30'],['Document description','Isolated internal transfer'],['Supporting document reference',`PROOF-${tag}`],['Financial posting reason','Reviewed sandbox movement']])await page.getByLabel(label,{exact:true}).fill(value)
 for(const [label,code] of [['Source account',`C-${tag}`],['Target account',`B-${tag}`]]){await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:new RegExp(code)}).click()}
 await page.route('**/api/v1/admin/finance/documents/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;operation=new URL(route.request().url()).pathname;intent=route.request().postDataJSON();const response=await route.fetch();expect(response.status()).toBe(200);return route.abort('failed')}return route.continue()})
 await page.getByRole('button',{name:'Confirm financial posting',exact:true}).click()
 await expect(page.getByText('Posting result is unknown. Check or retry the same operation.',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Check financial posting result',exact:true}).click()
 await expect(page.getByText('Financial record and related balances confirmed.',{exact:true})).toBeVisible()
 const csrf=(await (await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 expect((await page.request.put(`${origin}${operation}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:intent})).status()).toBe(200)
 const accounts=(await (await page.request.get(`${origin}/api/v1/admin/finance/accounts?q=${tag}`)).json()).items
 expect(accounts.find((a:{code:string})=>a.code===`C-${tag}`).balance).toBe('470.000000');expect(accounts.find((a:{code:string})=>a.code===`B-${tag}`).balance).toBe('30.000000')
 await page.goto('/en/admin/finance/expenses');await page.getByRole('button',{name:'New financial record',exact:true}).click()
 for(const [label,value] of [['Financial document number',`E-${tag}`],['Financial date','2026-10-19'],['Amount (toman)','10'],['Expense category','Workshop supplies'],['Document description','Isolated expense'],['Supporting document reference',`PROOF-E-${tag}`],['Financial posting reason','Counted workshop expense']])await page.getByLabel(label,{exact:true}).fill(value)
 await page.getByRole('combobox',{name:'Source account',exact:true}).click();await page.getByRole('option',{name:new RegExp(`C-${tag}`)}).click()
 await page.getByRole('button',{name:'Confirm financial posting',exact:true}).click();await expect(page.getByText('Financial record and related balances confirmed.',{exact:true})).toBeVisible()
 await page.getByLabel('Search document or reference',{exact:true}).fill(`E-${tag}`);await page.getByRole('button',{name:'Search',exact:true}).click()
 await page.getByRole('button',{name:'Prepare financial reversal',exact:true}).click()
 for(const [label,value] of [['Financial document number',`R-${tag}`],['Financial date','2026-10-19'],['Document description','Correction of isolated expense'],['Supporting document reference',`CORR-${tag}`],['Financial posting reason','Linked sandbox correction']])await page.getByLabel(label,{exact:true}).fill(value)
 await page.getByRole('button',{name:'Confirm financial posting',exact:true}).click();await expect(page.getByText('Financial record and related balances confirmed.',{exact:true})).toBeVisible()
 const cash=(await (await page.request.get(`${origin}/api/v1/admin/finance/accounts?q=C-${tag}`)).json()).items[0];expect(cash.balance).toBe('470.000000')
 await page.goto('/en/admin/finance/cash-flow')
 await page.getByLabel('From date',{exact:true}).fill('2026-10-19');await page.getByLabel('To date',{exact:true}).fill('2026-10-19');await page.getByRole('button',{name:'Calculate cash flow',exact:true}).click();await expect(page.getByText('Operating expenses after corrections',{exact:true})).toBeVisible()
 const csv=await page.request.get(`${origin}/api/v1/admin/finance/export?from_date=2026-10-19&to_date=2026-10-19`);expect(csv.status()).toBe(200);expect(await csv.text()).toContain(`R-${tag}`)
 for(const language of ['fa','en']){await page.setViewportSize({width:390,height:844});await page.goto(`/${language}/admin/finance/accounts`);await page.getByLabel(language==='fa'?'جست‌وجوی حساب':'Search account',{exact:true}).fill(tag);await page.getByRole('button',{name:language==='fa'?'جست‌وجو':'Search',exact:true}).click();await expect(page.getByRole('row').filter({has:page.locator('bdi').filter({hasText:`C-${tag}`})})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-finance-${language}-mobile.png`,fullPage:true})}
})
test("real supplier partial payments and purchase return refund remain separate from stock",async({page})=>{
 test.setTimeout(60000);page.setDefaultTimeout(7000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:"+989121110001",password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 let csrf=(await login.json()).csrf_token
 async function put(path:string,data:unknown){if(!csrf)csrf=(await (await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token;const r=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.status(),await r.text()).toBe(200);return r.json()}
 const tag=randomUUID().slice(0,8).toUpperCase(),supplier=randomUUID(),material=randomUUID(),purchase=randomUUID(),line=randomUUID(),account=randomUUID()
 await put(`/api/v1/admin/procurement/suppliers/${supplier}/versions/${randomUUID()}`,{expected_version:0,content:{kind:'supplier',code:`FS-${tag}`,title_fa:'تأمین‌کننده مالی آزمایش',title_en:'Finance test supplier'},reason:'Synthetic financial journey'})
 await put(`/api/v1/admin/costing/resources/${material}/versions/${randomUUID()}`,{expected_version:0,content:{kind:'material',code:`FM-${tag}`,title_fa:'ماده آزمایش مالی',title_en:'Finance test material',base_unit:'piece',purchase_unit:'pack',purchase_to_base:'10',supplier:'Finance test supplier',rate:{amount:'10',currency:'IRT'},valid_from:'2026-10-19'},reason:'Synthetic financial journey'})
 await put(`/api/v1/admin/procurement/purchases/${purchase}/commands/${randomUUID()}`,{expected_version:0,action:'draft',content:{supplier_id:supplier,document_number:`FP-${tag}`,document_date:'2026-10-19',currency:'IRT',lines:[{id:line,kind:'material',reference_id:material,quantity:'10',unit_price:'10',discount:'0',supplier_acquisition_cost:'0'}]},reason:'Synthetic financial journey'})
 await put(`/api/v1/admin/procurement/purchases/${purchase}/commands/${randomUUID()}`,{expected_version:1,action:'post',reason:'Synthetic posted invoice'})
 await put(`/api/v1/admin/finance/accounts/${account}/commands/${randomUUID()}`,{expected_version:0,content:{code:`FC-${tag}`,title_fa:'صندوق مالی آزمایش',title_en:`FC-${tag}`,kind:'cash',active:true},opening_amount:'200',opening_date:'2026-10-19',reason:'Counted synthetic cash'})
 page.on('dialog',d=>d.accept())
 async function financial(amount:string,kind:string,number:string){
  await page.goto('/en/admin/finance/balances');await page.getByLabel('Search purchase or supplier',{exact:true}).fill(`FP-${tag}`);await page.getByRole('button',{name:'Search',exact:true}).click()
  await page.getByRole('row').filter({has:page.getByText(`FP-${tag}`,{exact:true})}).getByRole('button',{name:'Record related payment or refund',exact:true}).click()
  await expect(page.getByRole('combobox',{name:'Financial record type',exact:true})).toHaveValue(kind)
  for(const [label,value] of [['Financial document number',number],['Financial date','2026-10-19'],['Amount (toman)',amount],['Document description','Supplier allocation verification'],['Supporting document reference',`PROOF-${tag}`],['Financial posting reason','Reviewed supplier allocation']])await page.getByLabel(label,{exact:true}).fill(value)
  await page.getByRole('combobox',{name:kind==='Supplier payment'?'Source account':'Target account',exact:true}).click();await page.getByRole('option',{name:new RegExp(`FC-${tag}`)}).click()
  await page.getByRole('button',{name:'Confirm financial posting',exact:true}).click();await expect(page.getByText('Financial record and related balances confirmed.',{exact:true})).toBeVisible()
 }
 await financial('40','Supplier payment',`PAY1-${tag}`);await financial('60','Supplier payment',`PAY2-${tag}`)
 expect((await (await page.request.get(`${origin}/api/v1/admin/inventory?q=FM-${tag}`)).json()).items).toHaveLength(0)
 csrf=null
 const receipt=await put(`/api/v1/admin/procurement/purchases/${purchase}/commands/${randomUUID()}`,{expected_version:2,action:'receive',lines:[{line_id:line,quantity:'10'}],reason:'Receive material separately from payment'})
 const receiptId=receipt.id
 await put(`/api/v1/admin/procurement/purchases/${purchase}/commands/${randomUUID()}`,{expected_version:3,action:'return',receipt_id:receiptId,lines:[{line_id:line,quantity:'2'}],reason:'Return two original received units'})
 await financial('20','Supplier refund received',`REF-${tag}`)
 const result=(await (await page.request.get(`${origin}/api/v1/admin/finance/balances?q=FP-${tag}`)).json()).items[0];expect(result).toMatchObject({liability:'80.000000',paid_net:'80.000000',outstanding:'0.000000'})
 const stock=(await (await page.request.get(`${origin}/api/v1/admin/inventory?q=FM-${tag}`)).json()).items[0];expect(stock.quantity).toBe('8.000000')
 const cash=await (await page.request.get(`${origin}/api/v1/admin/finance/accounts/${account}`)).json();expect(cash.balance).toBe('120.000000')
})
