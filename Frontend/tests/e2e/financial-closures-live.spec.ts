import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_CLOSURE_FIXTURE,'Requires isolated new synthetic imported rejection evidence')
test('cancelled rejected order closes without money and recovers a lost receipt',async({page})=>{
 test.setTimeout(90000);page.on('dialog',d=>d.accept())
 const f=JSON.parse(process.env.NILART_CLOSURE_FIXTURE!) as {order:string;phone:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200);return(await r.json()).csrf_token}
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 let csrf=await login(f.phone)
 const own=await get(`/api/v1/account/orders/${f.order}`),id=randomUUID(),position=own.snapshot.items[0].stock_components[0].position_id
 expect(own.state.payment).toBe('failed');expect(own.snapshot.receipt).toBeNull()
 const submitted=await page.request.put(`${origin}/api/v1/account/orders/${f.order}/requests/${id}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:{version:own.version,kind:'cancellation',reason:'Cancel after synthetic imported sandbox rejection evidence',quantities:{}}});expect(submitted.status(),await submitted.text()).toBe(200)
 await login('+989121110001')
 const before=await get(`/api/v1/admin/inventory/positions/${position}`)
 await page.goto(`/en/admin/order-requests/${id}`)
 for(const status of ['in_review','approved']){await page.getByRole('combobox',{name:'Decision',exact:true}).selectOption(status);await page.getByRole('textbox',{name:'Customer-visible reply',exact:true}).fill(`Staff explicitly ${status} rejected cancellation`);await page.getByRole('button',{name:'Record decision',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Decision recorded.'})).toBeVisible()}
 const cancellation=page.getByRole('region',{name:'Cancellation processing',exact:true})
 await cancellation.getByRole('textbox',{name:'Cancellation processing reason',exact:true}).fill('Stop unshipped fulfillment before financial closure')
 await cancellation.getByRole('button',{name:'Cancel order and release stock',exact:true}).click()
 await expect(cancellation.getByRole('heading',{name:'Cancellation recorded; this action did not issue a refund.',exact:true})).toBeVisible()
 const panel=page.getByRole('region',{name:'Close financial review without payment',exact:true})
 await panel.getByRole('button',{name:'Refresh financial review',exact:true}).click()
 await panel.getByRole('textbox',{name:'Financial closure reason',exact:true}).fill('Review synthetic imported rejection and close without funds')
 let lost=false,path='',body:unknown
 await page.route('**/api/v1/admin/order-requests/*/financial-closures/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;path=new URL(route.request().url()).pathname;body=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await panel.getByRole('button',{name:'Close without payment or refund',exact:true}).click()
 await expect(panel.getByRole('alert').filter({hasText:'Result unconfirmed'})).toBeVisible()
 await panel.getByRole('button',{name:'Check closure receipt',exact:true}).click()
 await expect(panel.getByRole('heading',{name:'Review closed after payment rejection; no money moved.',exact:true})).toBeVisible()
 const receipt=await get(path);expect(receipt.result).toMatchObject({payment_status:'failed',refund_issued:false})
 csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 const replay=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:body});expect(replay.status(),await replay.text()).toBe(200);expect(await replay.json()).toEqual(receipt)
 expect((await get(`/api/v1/admin/order-requests/${id}`)).status).toBe('completed')
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({payment:'failed',fulfillment:'cancelled',refunded_amount:'0'})
 expect(await get(`/api/v1/admin/inventory/positions/${position}`)).toMatchObject({quantity:before.quantity,value:before.value,version:before.version,reserved:'0.000000'})
 expect((await get(`/api/v1/admin/refunds?order_id=${f.order}`)).items).toHaveLength(0)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${id}`);await expect(page.getByRole('region',{name:language==='fa'?'بستن بررسی مالی بدون پرداخت':'Close financial review without payment',exact:true})).toContainText(language==='fa'?'پولی جابه‌جا نشد':'no money moved');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-closure-${language}-${width}.png`,fullPage:true})}
 await login(f.phone)
 expect((await get(`/api/v1/account/requests/${id}`)).status).toBe('completed')
 expect((await get(`/api/v1/account/orders/${f.order}`)).state.payment).toBe('failed')
 expect((await page.request.get(`${origin}${path}`)).status()).toBe(403)
})

test('recorded closure remains traceable without claiming an open financial review',async({page})=>{
 const f=JSON.parse(process.env.NILART_CLOSURE_FIXTURE!) as {order:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const requests=await(await page.request.get(`${origin}/api/v1/admin/order-requests?order_id=${f.order}`)).json(),id=requests.items[0].id
 expect(requests.items[0].status).toBe('completed')
 const plan=await(await page.request.get(`${origin}/api/v1/admin/order-requests/${id}/cancellation-plan`)).json();expect(plan.financial_closed).toBe(true)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${id}`);const panel=page.getByRole('region',{name:language==='fa'?'بستن بررسی مالی بدون پرداخت':'Close financial review without payment',exact:true});await expect(panel).toContainText(language==='fa'?'پولی جابه‌جا نشد':'no money moved');await expect(panel.getByRole('textbox')).toHaveCount(0);await expect(page.getByText(language==='fa'?'سفارش لغو شده است؛ تا تعیین نتیجه پرداخت، بررسی مالی باز می‌ماند.':'The order is cancelled; financial review remains open until payment is reconciled.',{exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-closure-final-${language}-${width}.png`,fullPage:true})}
})
