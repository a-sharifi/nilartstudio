import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_RETURN_FIXTURE,'Requires explicitly approved synthetic return in isolated demo')
test('original-cost return inspection, uncertain response recovery and private customer outcome',async({page})=>{
 test.setTimeout(90000)
 const f=JSON.parse(process.env.NILART_RETURN_FIXTURE!) as {request:string;phone:string;sku:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200)}
 await login('+989121110001')
 const plan=await(await page.request.get(`${origin}/api/v1/admin/order-requests/${f.request}/return-plan`)).json();expect(plan.approved).toBe(true);expect(plan.items).toHaveLength(2)
 const costs=[] as string[];for(const item of plan.items){const s=await(await page.request.get(`${origin}/api/v1/admin/fulfillment/shipments/${item.shipment_id}`)).json();costs.push(s.state.actual_cost)}
 await page.goto(`/en/admin/returns/${f.request}`)
 const panel=page.getByRole('region',{name:'Return receipt and inspection',exact:true})
 await expect(panel.getByRole('heading',{name:'Return receipt and inspection',exact:true})).toBeVisible()
 await panel.getByRole('combobox',{name:'Item and parcel',exact:true}).click()
 await page.getByRole('option').filter({hasText:'Reservation test product'}).first().click()
 await panel.getByRole('spinbutton',{name:'Healthy quantity',exact:true}).fill('1')
 await panel.getByRole('textbox',{name:'Inspection reason',exact:true}).fill('Sandbox return received in healthy condition')
 let lost=false,path='',body:unknown
 await page.route('**/api/v1/admin/order-requests/*/inspections/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;path=new URL(route.request().url()).pathname;body=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await panel.getByRole('button',{name:'Record receipt and inspection',exact:true}).click()
 await expect(panel.getByRole('alert')).toContainText('Result unconfirmed')
 await panel.getByRole('button',{name:'Check saved result',exact:true}).click()
 await expect(panel.getByText('Sandbox return received in healthy condition',{exact:true})).toBeVisible()
 const first=await(await page.request.get(`${origin}${path}`)).json();expect(first.result.items[0].recovered_cost).toBe(costs[0])
 const token=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 const replay=await page.request.put(`${origin}${path}`,{headers:{Origin:origin,'X-CSRF-Token':token},data:body});expect(replay.status(),await replay.text()).toBe(200)
 await panel.getByRole('combobox',{name:'Item and parcel',exact:true}).click();await page.getByRole('option').filter({hasText:'Reservation test product'}).first().click()
 await panel.getByRole('spinbutton',{name:'Damaged quantity',exact:true}).fill('1');await panel.getByRole('textbox',{name:'Inspection reason',exact:true}).fill('Sandbox damaged item excluded from healthy stock')
 await panel.getByRole('button',{name:'Record receipt and inspection',exact:true}).click();await expect(panel.getByText('No delivered items remain eligible for receipt.',{exact:true})).toBeVisible()
 const history=await(await page.request.get(`${origin}/api/v1/admin/order-requests/${f.request}/inspections`)).json();expect(history.items).toHaveLength(2);expect(history.items.some((r:{result:{items:{damaged_cost:string}[]}})=>r.result.items[0].damaged_cost===costs[1])).toBe(true)
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/returns/${f.request}`);await expect(page.getByRole('region',{name:language==='fa'?'دریافت و کنترل مرجوعی':'Return receipt and inspection',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-return-${language}-${width}.png`,fullPage:true})}
 await login(f.phone);await page.goto(`/en/account/requests/${f.request}`);const customer=page.getByRole('region',{name:'Return receipt',exact:true});await expect(customer.getByText('Healthy: 1',{exact:false})).toBeVisible();expect(await customer.textContent()).not.toContain('50.000000');expect(await customer.textContent()).not.toContain('Sandbox return received');expect((await page.request.get(`${origin}/api/v1/admin/order-requests/${f.request}/inspections`)).status()).toBe(403)
})

test('completed inspection screens remain readable in Persian and English on mobile and desktop',async({page})=>{
 const f=JSON.parse(process.env.NILART_RETURN_FIXTURE!) as {request:string;phone:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 for(const language of ['fa','en'])for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/returns/${f.request}`)
  const panel=page.getByRole('region',{name:language==='fa'?'دریافت و کنترل مرجوعی':'Return receipt and inspection',exact:true})
  await expect(panel.getByText(language==='fa'?'قلم تحویل‌شده‌ای برای دریافت باقی نمانده است.':'No delivered items remain eligible for receipt.',{exact:true})).toBeVisible()
  await expect(panel.getByRole('button',{name:language==='fa'?'ثبت دریافت و کنترل':'Record receipt and inspection',exact:true})).toHaveCount(0)
  await expect(panel.getByText('Sandbox return received in healthy condition',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await page.screenshot({path:`/tmp/nilart-return-final-${language}-${width}.png`,fullPage:true})
 }
})
