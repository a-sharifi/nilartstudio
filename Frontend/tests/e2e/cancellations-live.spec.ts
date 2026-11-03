import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_CANCEL_FIXTURE,'Requires isolated imported paid/unshipped synthetic order')
test('owned cancellation request, staff approval, lost stock-release receipt and separate finance refund',async({page})=>{
 test.setTimeout(90000);page.on('dialog',d=>d.accept())
 const f=JSON.parse(process.env.NILART_CANCEL_FIXTURE!) as {order:string;line:string;phone:string;shipment:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 let csrf=''
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200);csrf=(await r.json()).csrf_token}
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 await login(f.phone)
 const own=await get(`/api/v1/account/orders/${f.order}`),request=randomUUID(),position=own.snapshot.items[0].stock_components[0].position_id
 const submitted=await page.request.put(`${origin}/api/v1/account/orders/${f.order}/requests/${request}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:{version:own.version,kind:'cancellation',reason:'Customer requests cancellation of the unshipped sandbox order',quantities:{}}});expect(submitted.status(),await submitted.text()).toBe(200)
 await login('+989121110001')
 const before=await get(`/api/v1/admin/inventory/positions/${position}`);expect(before).toMatchObject({quantity:'2.000000',reserved:'2.000000',value:'100.000000'})
 await page.goto(`/en/admin/order-requests/${request}`)
 for(const status of ['in_review','approved']){await page.getByRole('combobox',{name:'Decision',exact:true}).selectOption(status);await page.getByRole('textbox',{name:'Customer-visible reply',exact:true}).fill(`Staff explicitly ${status} the cancellation`);await page.getByRole('button',{name:'Record decision',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Decision recorded.'})).toBeVisible()}
 const processing=page.getByRole('region',{name:'Cancellation processing',exact:true})
 await processing.getByRole('textbox',{name:'Cancellation processing reason',exact:true}).fill('Explicit cancellation and release after customer approval')
 let lost=false,path='',body:unknown
 await page.route('**/api/v1/admin/order-requests/*/cancellations/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;path=new URL(route.request().url()).pathname;body=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await processing.getByRole('button',{name:'Cancel order and release stock',exact:true}).click()
 await expect(processing.getByRole('alert').filter({hasText:'Result unconfirmed'})).toBeVisible()
 await processing.getByRole('button',{name:'Check cancellation receipt',exact:true}).click()
 await expect(processing.getByRole('heading',{name:'Cancellation recorded; this action did not issue a refund.',exact:true})).toBeVisible()
 const receipt=await get(path);expect(receipt.result.cancelled_shipments).toEqual([f.shipment])
 csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 const replay=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:body});expect(replay.status(),await replay.text()).toBe(200)
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({payment:'paid',fulfillment:'cancelled',refunded_amount:'0'})
 const released=await get(`/api/v1/admin/inventory/positions/${position}`);expect(released).toMatchObject({quantity:before.quantity,value:before.value,version:before.version,reserved:'0.000000'})
 expect((await get(`/api/v1/admin/fulfillment/shipments/${f.shipment}`)).status).toBe('cancelled')
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${request}`);await expect(page.getByRole('region',{name:language==='fa'?'پردازش لغو سفارش':'Cancellation processing',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-cancellation-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/refunds/${request}`)
 await page.getByRole('spinbutton',{name:'Refund quantity: Imported sandbox item (1)',exact:true}).fill('2');await page.getByRole('checkbox',{name:'Complete this request after refunding all approved quantities.',exact:true}).check();await page.getByRole('button',{name:'Calculate exact refund quote',exact:true}).click();await expect(page.getByRole('region',{name:'Refund quote',exact:true})).toContainText('200.20 IRT');await page.getByRole('textbox',{name:'Refund reason',exact:true}).fill('Explicit finance refund after recorded cancellation');await page.getByRole('button',{name:'Confirm simulated refund',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'This request is complete'})).toBeVisible()
 expect(await get(`/api/v1/admin/inventory/positions/${position}`)).toEqual(released)
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({fulfillment:'cancelled',payment:'refunded',refunded_amount:'200.20'})
 await login(f.phone);await page.goto(`/en/account/orders/${f.order}`)
 await expect(page.getByText('The order was cancelled and stock released. Check payment status and refund receipts for financial resolution.',{exact:true})).toBeVisible()
 await expect(page.getByRole('region',{name:'Refund receipts',exact:true}).getByRole('heading',{name:'Simulated refund; no real funds were transferred.',exact:true})).toBeVisible()
 expect((await page.request.get(`${origin}${path}`)).status()).toBe(403)
})

test('completed cancellation stays traceable from stock and request screens in both languages',async({page})=>{
 const f=JSON.parse(process.env.NILART_CANCEL_FIXTURE!) as {order:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const requests=await(await page.request.get(`${origin}/api/v1/admin/order-requests?order_id=${f.order}`)).json(),request=requests.items[0].id
 expect(requests.items[0].status).toBe('completed')
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${request}`);const panel=page.getByRole('region',{name:language==='fa'?'پردازش لغو سفارش':'Cancellation processing',exact:true});await expect(panel.getByRole('heading',{name:language==='fa'?'لغو ثبت شد؛ بازپرداخت با این اقدام انجام نشده است.':'Cancellation recorded; this action did not issue a refund.',exact:true})).toBeVisible();await expect(panel.getByRole('textbox')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-cancellation-final-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/order-stock/${f.order}`);await expect(page.getByText('Released after order cancellation',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Load order requests',exact:true})).toBeVisible()
})
