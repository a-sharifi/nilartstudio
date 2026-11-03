import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin,'Isolated demo only')
const config=()=>Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
test('opening payments recover lost receipts, preserve cash bounds and support linked reversal',async({page})=>{
 test.setTimeout(120000);page.on('dialog',d=>d.accept())
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200);let csrf=(await login.json()).csrf_token
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 async function put(path:string,data:unknown){const r=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.status(),await r.text()).toBe(200);return r.json()}
 const supplier=randomUUID(),account=randomUUID(),code='SETTLE-'+supplier.slice(0,8).toUpperCase()
 await put(`/api/v1/admin/procurement/suppliers/${supplier}/versions/${randomUUID()}`,{expected_version:0,content:{code,title_fa:'تأمین‌کننده آزمایشی تسویه',title_en:'Synthetic settlement supplier',kind:'supplier',contact_name:'',phone:'',email:'',address:'',notes:'Isolated demo only',active:true},reason:'Create isolated opening settlement fixture'})
 await put(`/api/v1/admin/finance/accounts/${account}/commands/${randomUUID()}`,{expected_version:0,content:{code,title_fa:'صندوق آزمایشی تسویه',title_en:'Synthetic settlement cash',kind:'cash',active:true},opening_amount:'500',opening_date:'2026-10-20',reason:'Counted synthetic demo cash'})
 await put(`/api/v1/admin/finance/suppliers/${supplier}/opening/commands/${randomUUID()}`,{currency:'IRT',expected_version:0,amount:'100',as_of_date:'2020-01-01',corrects_id:null,source_reference:'DEMO external statement excluding recorded activity',excludes_recorded_activity:true,reason:'Confirmed synthetic supplier opening debt'})
 await page.goto(`/en/admin/finance/suppliers/${supplier}/settlements`)
 await expect(page.getByRole('heading',{name:'Record opening debt payment',exact:true})).toBeVisible()
 const fill=async(number:string)=>{await page.getByLabel('Financial document number',{exact:true}).fill(number);await page.getByLabel('Financial date',{exact:true}).fill('2026-10-20');await page.getByLabel('Document description',{exact:true}).fill('Synthetic recorded opening cash');await page.getByLabel('Supporting document reference',{exact:true}).fill('DEMO-ONLY');await page.getByLabel('Posting reason',{exact:true}).fill('Confirmed demo evidence');await page.getByRole('checkbox').check()}
 await page.getByRole('combobox',{name:'Cash or bank account',exact:true}).click();await page.getByRole('option').filter({hasText:code}).click();await page.getByLabel('Amount (toman)',{exact:true}).fill('40');await fill(code+'-PAY')
 let lost=false,path='',body:unknown
 await page.route('**/api/v1/admin/finance/documents/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;path=new URL(route.request().url()).pathname;body=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await page.getByRole('button',{name:'Confirm cash and allocation',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Result unconfirmed'})).toBeVisible();await page.getByRole('button',{name:'Check payment receipt',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Cash record and opening allocation confirmed'})).toBeVisible()
 expect((await get(`/api/v1/admin/finance/accounts/${account}`)).balance).toBe('460.000000');expect((await get(`/api/v1/admin/finance/suppliers/${supplier}/opening/settlement`)).outstanding).toBe('60.000000')
 csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token;await put(path,body);expect((await get(`/api/v1/admin/finance/accounts/${account}`)).balance).toBe('460.000000')
 await page.getByRole('button',{name:'Prepare linked reversal',exact:true}).click();await expect(page.getByRole('heading',{name:'Linked document reversal',exact:true})).toBeVisible();await fill(code+'-REV');await page.getByRole('button',{name:'Confirm cash and allocation',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Cash record and opening allocation confirmed'})).toBeVisible()
 expect((await get(`/api/v1/admin/finance/accounts/${account}`)).balance).toBe('500.000000');expect((await get(`/api/v1/admin/finance/suppliers/${supplier}/opening/settlement`)).outstanding).toBe('100.000000');const report=await get(`/api/v1/admin/finance/suppliers/${supplier}/statement?from_date=1970-01-01&to_date=2099-12-31`);expect(report.closing_recorded_balance).toBe('100.000000')
 for(const lang of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${lang}/admin/finance/suppliers/${supplier}/settlements`);await expect(page.getByRole('heading',{name:lang==='en'?'Record opening debt payment':'ثبت پرداخت بدهی افتتاحیه',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-opening-settlements-${lang}-${width}.png`,fullPage:true})}
})
