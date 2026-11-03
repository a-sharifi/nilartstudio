import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_REFUND_FIXTURE,'Requires isolated synthetic imported paid-order fixture')
test('simulated partial/full refund, lost receipt recovery, original shares and private customer receipts',async({page})=>{
 test.setTimeout(90000)
 const f=JSON.parse(process.env.NILART_REFUND_FIXTURE!) as {request:string;order:string;phone:string;sku:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200)}
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 await login('+989121110001')
 const positions=await get(`/api/v1/admin/inventory/positions?kind=sku&q=${f.sku}`)
 // Source trace is checked directly using frozen component position, independent of search behavior.
 const order=await get(`/api/v1/admin/orders/${f.order}`),position=order.snapshot.items[0].stock_components[0].position_id
 const before=await get(`/api/v1/admin/inventory/positions/${position}`)
 expect(before).toMatchObject({quantity:'0.000000',value:'0.000000'})
 expect(positions).toBeTruthy()
 await page.goto(`/en/admin/finance/refunds/${f.request}`)
 await page.getByRole('spinbutton',{name:'Refund quantity: Imported sandbox item (1)',exact:true}).fill('1')
 await page.getByRole('button',{name:'Calculate exact refund quote',exact:true}).click()
 const quote=page.getByRole('region',{name:'Refund quote',exact:true});await expect(quote).toContainText('100.10 IRT')
 await page.getByRole('textbox',{name:'Refund reason',exact:true}).fill('Explicit partial sandbox refund')
 let lost=false,path='',intent:unknown
 await page.route('**/api/v1/admin/refunds/commands/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;path=new URL(route.request().url()).pathname;intent=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await page.getByRole('button',{name:'Confirm simulated refund',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:'Result unconfirmed'})).toBeVisible()
 await page.getByRole('button',{name:'Check refund receipt',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'Simulated refund recorded'})).toBeVisible()
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({payment:'partially_refunded',refunded_amount:'100.10',fulfillment:'delivered'})
 const csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 const replay=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:intent});expect(replay.status(),await replay.text()).toBe(200)
 await page.getByRole('spinbutton',{name:'Refund quantity: Imported sandbox item (1)',exact:true}).fill('1')
 await page.getByRole('checkbox',{name:'Complete this request after refunding all approved quantities.',exact:true}).check()
 await page.getByRole('button',{name:'Calculate exact refund quote',exact:true}).click();await expect(quote).toContainText('100.10 IRT')
 await page.getByRole('textbox',{name:'Refund reason',exact:true}).fill('Explicit final sandbox refund')
 await page.getByRole('button',{name:'Confirm simulated refund',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'This request is complete'})).toBeVisible()
 expect((await get(`/api/v1/admin/orders/${f.order}`)).state).toMatchObject({payment:'refunded',refunded_amount:'200.20',fulfillment:'delivered'})
 expect((await get(`/api/v1/admin/refunds?request_id=${f.request}`)).items).toHaveLength(2)
 const after=await get(`/api/v1/admin/inventory/positions/${position}`);expect(after).toEqual(before)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/refunds/${f.request}`);await expect(page.getByRole('heading',{name:language==='fa'?'بازپرداخت‌ها':'Refunds',level:1,exact:true})).toBeVisible();await expect(page.getByText('Explicit final sandbox refund',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-refunds-${language}-${width}.png`,fullPage:true})}
 await login(f.phone);await page.goto(`/en/account/orders/${f.order}`)
 const receipts=page.getByRole('region',{name:'Refund receipts',exact:true});await expect(receipts.getByRole('heading',{name:'Simulated refund; no real funds were transferred.',exact:true})).toHaveCount(2)
 expect(await receipts.textContent()).not.toContain('Explicit partial sandbox refund')
 expect((await page.request.get(`${origin}/api/v1/admin/refunds`)).status()).toBe(403)
})

test('completed refund receipts remain readable across aliases, languages and screen sizes',async({page})=>{
 const f=JSON.parse(process.env.NILART_REFUND_FIXTURE!) as {request:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status()).toBe(200)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/finance/refunds/${f.request}`);await expect(page.getByText('Explicit final sandbox refund',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await expect(page.getByRole('spinbutton')).toHaveCount(0);await page.screenshot({path:`/tmp/nilart-refunds-final-${language}-${width}.png`,fullPage:true})}
 await page.goto('/en/admin/refunds');await expect(page.getByRole('heading',{name:'Refunds',level:1,exact:true})).toBeVisible()
})
