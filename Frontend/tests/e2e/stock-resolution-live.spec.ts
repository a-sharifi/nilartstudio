import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_RESOLUTION_FIXTURE,'Requires isolated imported late-paid shortage fixture')
test('staff shortage review, lost result recovery, explicit provenance and independent cancellation/refund',async({page})=>{
 test.setTimeout(90000);page.on('dialog',d=>d.accept())
 const f=JSON.parse(process.env.NILART_RESOLUTION_FIXTURE!) as {order:string;phone:string;line:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200)}
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 await login('+989121110001');const order=await get(`/api/v1/admin/orders/${f.order}`),position=order.snapshot.items[0].stock_components[0].position_id,before=await get(`/api/v1/admin/inventory/positions/${position}`)
 expect(before).toMatchObject({quantity:'0.000000',reserved:'0.000000',value:'0.000000'})
 await page.goto(`/en/admin/order-stock/${f.order}`)
 const panel=page.getByRole('region',{name:'Staff cancellation review',exact:true})
 await panel.getByRole('textbox',{name:'Customer-visible review reason',exact:true}).fill('Staff cannot supply the confirmed shortage; review cancellation explicitly')
 let lost=false,path='',body:unknown,request=''
 await page.route('**/api/v1/admin/order-stock/*/resolution-reviews/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;path=new URL(route.request().url()).pathname;request=path.split('/').at(-1)!;body=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await panel.getByRole('button',{name:'Open cancellation review',exact:true}).click();await expect(panel.getByRole('alert').filter({hasText:'Result unconfirmed'})).toBeVisible();await panel.getByRole('button',{name:'Check review receipt',exact:true}).click();await expect(panel.getByRole('button',{name:'Open existing request',exact:true})).toBeVisible()
 const token=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 const replay=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':token},data:body});expect(replay.status(),await replay.text()).toBe(200)
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({payment:'paid',fulfillment:'on_hold',refunded_amount:'0'})
 expect(await get(`/api/v1/admin/inventory/positions/${position}`)).toEqual(before)
 const submitted=await get(`/api/v1/admin/order-requests/${request}`);expect(submitted).toMatchObject({status:'submitted',initiated_by_staff:true})
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-stock/${f.order}`);await expect(page.getByRole('region',{name:language==='fa'?'آغاز بررسی لغو توسط کارکنان':'Staff cancellation review',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-resolution-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/order-requests/${request}`);await expect(page.getByText('Staff initiated this review due to stock shortage.',{exact:true})).toBeVisible()
 for(const status of ['in_review','approved']){await page.getByRole('combobox',{name:'Decision',exact:true}).selectOption(status);await page.getByRole('textbox',{name:'Customer-visible reply',exact:true}).fill(`Staff explicitly ${status} this shortage review`);await page.getByRole('button',{name:'Record decision',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Decision recorded.'})).toBeVisible()}
 const cancellation=page.getByRole('region',{name:'Cancellation processing',exact:true});await cancellation.getByRole('textbox',{name:'Cancellation processing reason',exact:true}).fill('Approved shortage cancellation without physical stock');await cancellation.getByRole('button',{name:'Cancel order and release stock',exact:true}).click();await expect(cancellation.getByRole('heading',{name:'Cancellation recorded; this action did not issue a refund.',exact:true})).toBeVisible()
 await page.goto(`/en/admin/refunds/${request}`);await page.getByRole('spinbutton',{name:'Refund quantity: Imported sandbox item (1)',exact:true}).fill('2');await page.getByRole('checkbox',{name:'Complete this request after refunding all approved quantities.',exact:true}).check();await page.getByRole('button',{name:'Calculate exact refund quote',exact:true}).click();await expect(page.getByRole('region',{name:'Refund quote',exact:true})).toContainText('200.20 IRT');await page.getByRole('textbox',{name:'Refund reason',exact:true}).fill('Separate finance resolution of imported late-paid shortage');await page.getByRole('button',{name:'Confirm simulated refund',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'This request is complete'})).toBeVisible()
 const after=await get(`/api/v1/admin/inventory/positions/${position}`);expect(after).toMatchObject({quantity:before.quantity,value:before.value,version:before.version,reserved:'0.000000'})
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({fulfillment:'cancelled',payment:'refunded',refunded_amount:'200.20'})
 await login(f.phone);await page.goto(`/en/account/requests/${request}`);await expect(page.getByText('Staff initiated this review due to stock shortage.',{exact:true})).toBeVisible();const own=await get(`/api/v1/account/requests/${request}`);expect(own.initiated_by_staff).toBe(true);expect(own.actor_id).toBeUndefined();expect((await page.request.get(`${origin}${path}`)).status()).toBe(403)
})

test('staff origin remains visible after completion in Persian and English and through stock history',async({page})=>{
 const f=JSON.parse(process.env.NILART_RESOLUTION_FIXTURE!) as {order:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const records=await(await page.request.get(`${origin}/api/v1/admin/order-requests?order_id=${f.order}`)).json(),request=records.items.find((r:{initiated_by_staff?:boolean})=>r.initiated_by_staff)
 expect(request.status).toBe('completed')
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-requests/${request.id}`);await expect(page.getByText(language==='fa'?'این بررسی به دلیل کمبود موجودی توسط کارکنان آغاز شده است.':'Staff initiated this review due to stock shortage.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-resolution-final-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/order-stock/${f.order}`);await page.getByRole('button',{name:'Load order requests',exact:true}).click();await page.getByRole('button',{name:'Open request review',exact:true}).click();await expect(page.getByText('Staff initiated this review due to stock shortage.',{exact:true})).toBeVisible()
})
