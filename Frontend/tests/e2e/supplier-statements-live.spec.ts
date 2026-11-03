import {test,expect} from '@playwright/test'
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_SUPPLIER_STATEMENT_FIXTURE,'Requires isolated fresh synthetic SKU/customer')
const config=()=>Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
test('purchase, partial receipt, return, payment and correction feed supplier statement',async({page})=>{
 test.setTimeout(90000)
 const f=JSON.parse(process.env.NILART_SUPPLIER_STATEMENT_FIXTURE!) as {sku:string;phone:string}
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(login.status(),await login.text()).toBe(200);const csrf=(await login.json()).csrf_token
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 async function put(path:string,data:unknown){const r=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.status(),await r.text()).toBe(200);return r.json()}
 const supplier=randomUUID(),purchase=randomUUID(),line=randomUUID(),account=randomUUID(),code='STATEMENT-'+supplier.slice(0,8).toUpperCase()
 await put(`/api/v1/admin/procurement/suppliers/${supplier}/versions/${randomUUID()}`,{expected_version:0,content:{code,title_fa:'تأمین‌کننده آزمایشی صورتحساب',title_en:'Synthetic statement supplier',kind:'supplier',contact_name:'',phone:'',email:'',address:'',notes:'Explicit isolated demo fixture',active:true},reason:'Create isolated supplier statement fixture'})
 const command=async(version:number,action:string,extra={})=>put(`/api/v1/admin/procurement/purchases/${purchase}/commands/${randomUUID()}`,{expected_version:version,action,reason:'Isolated recorded supplier statement journey',...extra})
 await command(0,'draft',{content:{supplier_id:supplier,document_number:code,document_date:'2026-10-20',currency:'IRT',notes:'Synthetic demo purchase',lines:[{id:line,kind:'sku',reference_id:f.sku,quantity:'10',unit_price:'10',discount:'0',supplier_acquisition_cost:'0'}]}})
 await command(1,'post')
 await put(`/api/v1/admin/finance/accounts/${account}/commands/${randomUUID()}`,{expected_version:0,content:{code,title_fa:'صندوق آزمایشی',title_en:'Synthetic cash',kind:'cash',active:true},opening_amount:'500',opening_date:'2026-10-20',reason:'Explicit counted isolated demo cash'})
 const payment=randomUUID()
 await put(`/api/v1/admin/finance/documents/${payment}`,{kind:'supplier_payment',document_number:code+'-PAY',document_date:'2026-10-20',amount:'40',source_account_id:account,expected_versions:{[account]:1},purchase_id:purchase,expected_purchase_version:2,description:'Synthetic supplier payment for statement',supporting_reference:'DEMO-ONLY',reason:'Recorded isolated cash movement'})
 const received=await command(2,'receive',{lines:[{line_id:line,quantity:'5'}]})
 await command(3,'return',{receipt_id:received.id,lines:[{line_id:line,quantity:'2'}]})
 const reversal=randomUUID()
 await put(`/api/v1/admin/finance/documents/${reversal}`,{kind:'reversal',document_number:code+'-REV',document_date:'2026-10-20',amount:null,expected_versions:{[account]:2},reverses_id:payment,description:'Synthetic supplier payment correction',supporting_reference:'DEMO-REVERSAL',reason:'Correct isolated payment with a linked reversal'})
 const query='from_date=1970-01-01&to_date=2099-12-31',before=await get(`/api/v1/admin/finance/suppliers/${supplier}/statement?${query}`)
 expect(Number(before.closing_recorded_balance)).toBe(80);expect(before.total_entries).toBe(4);expect(before.opening_balance_configured).toBe(false)
 await page.goto(`/en/admin/inventory/suppliers/${supplier}`)
 const report=page.getByRole('region',{name:'Recorded supplier financial statement',exact:true})
 await report.getByRole('button',{name:'Load financial statement',exact:true}).click();await expect(report.getByRole('table')).toBeVisible();await expect(report).toContainText('Supplier opening balance is not configured.')
 const csv=await page.request.get(await report.getByRole('link',{name:'Download statement CSV',exact:true}).getAttribute('href') as string);expect(csv.status()).toBe(200);expect(await csv.text()).toContain('opening_balance_configured')
 const excel=await page.request.get(await report.getByRole('link',{name:'Download statement XLSX',exact:true}).getAttribute('href') as string);expect(excel.status()).toBe(200);expect(excel.headers()['content-type']).toContain('spreadsheetml')
 const paymentRow=report.getByRole('row').filter({hasText:code+'-PAY'})
 await paymentRow.getByRole('button',{name:'View source document',exact:true}).click();await expect(page.getByRole('heading',{name:'Financial document details · '+code+'-PAY',exact:true})).toBeVisible()
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/finance/suppliers/${supplier}`);const section=page.getByRole('region',{name:language==='fa'?'گردش مالی ثبت‌شده تأمین‌کننده':'Recorded supplier financial statement',exact:true});await section.getByRole('button',{name:language==='fa'?'دریافت صورتحساب مالی':'Load financial statement',exact:true}).click();await expect(section.getByRole('table')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-supplier-statement-${language}-${width}.png`,fullPage:true})}
 expect(await get(`/api/v1/admin/finance/suppliers/${supplier}/statement?${query}`)).toEqual(before)
 writeFileSync('/tmp/nilart-supplier-statement-completed.json',JSON.stringify({...f,supplier,purchase,payment,reversal,code}))
 const customer=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:f.phone,password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(customer.status()).toBe(200)
 expect((await page.request.get(`${origin}/api/v1/admin/finance/suppliers/${supplier}/statement?${query}`)).status()).toBe(403)
})

test('recorded supplier statement stays identifiable and exact after deployment',async({page})=>{
 const f=JSON.parse(readFileSync('/tmp/nilart-supplier-statement-completed.json','utf8')) as {supplier:string;code:string;payment:string}
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const before=await(await page.request.get(`${origin}/api/v1/admin/finance/suppliers/${f.supplier}/statement?from_date=1970-01-01&to_date=2099-12-31`)).json();expect(Number(before.closing_recorded_balance)).toBe(80);expect(before.total_entries).toBe(4)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/finance/suppliers/${f.supplier}`);const section=page.getByRole('region',{name:language==='fa'?'گردش مالی ثبت‌شده تأمین‌کننده':'Recorded supplier financial statement',exact:true});await section.getByRole('button',{name:language==='fa'?'دریافت صورتحساب مالی':'Load financial statement',exact:true}).click();await expect(section.getByRole('heading',{level:4})).toContainText(f.code);await expect(section.getByRole('table')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-supplier-statement-final-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/finance/movements/${f.payment}`);await expect(page.getByRole('heading',{name:'Financial document details · '+f.code+'-PAY',exact:true})).toBeVisible()
})
