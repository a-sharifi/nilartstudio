import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_UNPAID_FIXTURE,'Requires isolated new unpaid synthetic order')
test('approved unpaid cancellation releases stock while preserving open payment review',async({page})=>{
 test.setTimeout(90000);page.on('dialog',d=>d.accept())
 const f=JSON.parse(process.env.NILART_UNPAID_FIXTURE!) as {order:string;phone:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200);return(await r.json()).csrf_token}
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 const csrf=await login(f.phone),own=await get(`/api/v1/account/orders/${f.order}`),id=randomUUID(),position=own.snapshot.items[0].stock_components[0].position_id
 expect(own.state.payment).toBe('pending');expect(own.snapshot.receipt).toBeNull()
 const submitted=await page.request.put(`${origin}/api/v1/account/orders/${f.order}/requests/${id}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:{version:own.version,kind:'cancellation',reason:'Customer requests cancellation before payment is confirmed',quantities:{}}});expect(submitted.status(),await submitted.text()).toBe(200)
 await login('+989121110001')
 const before=await get(`/api/v1/admin/inventory/positions/${position}`)
 await page.goto(`/en/admin/order-requests/${id}`)
 for(const status of ['in_review','approved']){await page.getByRole('combobox',{name:'Decision',exact:true}).selectOption(status);await page.getByRole('textbox',{name:'Customer-visible reply',exact:true}).fill(`Staff explicitly ${status} unpaid cancellation`);await page.getByRole('button',{name:'Record decision',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Decision recorded.'})).toBeVisible()}
 const panel=page.getByRole('region',{name:'Cancellation processing',exact:true})
 await expect(panel).toContainText('A late successful payment requires refund review.')
 await panel.getByRole('textbox',{name:'Cancellation processing reason',exact:true}).fill('Stop fulfillment while payment reconciliation remains open')
 await panel.getByRole('button',{name:'Cancel order and release stock',exact:true}).click()
 await expect(panel).toContainText('The order is cancelled; financial review remains open until payment is reconciled.')
 await expect(panel.getByRole('button',{name:'Review sandbox refund',exact:true})).toHaveCount(0)
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({payment:'pending',fulfillment:'cancelled',refunded_amount:'0'})
 const after=await get(`/api/v1/admin/inventory/positions/${position}`)
 expect(after).toMatchObject({quantity:before.quantity,value:before.value,version:before.version,reserved:'0.000000'})
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${id}`);await expect(page.getByRole('region',{name:language==='fa'?'پردازش لغو سفارش':'Cancellation processing',exact:true})).toContainText(language==='fa'?'تا تعیین نتیجه پرداخت':'financial review remains open');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-unpaid-${language}-${width}.png`,fullPage:true})}
 await login(f.phone);await page.goto(`/en/account/orders/${f.order}`)
 await expect(page.getByText('The order was cancelled and stock released. Check payment status and refund receipts for financial resolution.',{exact:true})).toBeVisible()
 expect((await get(`/api/v1/account/orders/${f.order}`)).snapshot.receipt).toBeNull()
})

test('recorded unpaid cancellation remains pending financial review after deployment',async({page})=>{
 const f=JSON.parse(process.env.NILART_UNPAID_FIXTURE!) as {order:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const requests=await(await page.request.get(`${origin}/api/v1/admin/order-requests?order_id=${f.order}`)).json(),id=requests.items[0].id
 expect(requests.items[0].status).toBe('approved')
 const order=await(await page.request.get(`${origin}/api/v1/admin/orders/${f.order}`)).json()
 const refunds=await(await page.request.get(`${origin}/api/v1/admin/refunds/requests?q=${encodeURIComponent(order.snapshot.reference)}`)).json()
 expect(refunds.items.some((r:{id:string})=>r.id===id)).toBe(false)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${id}`);const panel=page.getByRole('region',{name:language==='fa'?'پردازش لغو سفارش':'Cancellation processing',exact:true});await expect(panel).toContainText(language==='fa'?'تا تعیین نتیجه پرداخت':'financial review remains open');await expect(panel.getByRole('textbox')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()}
})
