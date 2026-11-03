import {test,expect} from "@playwright/test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
const origin="http://127.0.0.1:18080"
test.skip(process.env.NILART_RUN_DEMO_TESTS!=="true"||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_INQUIRY_PAYMENT,"Requires isolated demo payment fixture")
test("recorded sandbox inquiry, response loss recovery, immutable replay and bilingual layouts",async({page})=>{
 test.setTimeout(90000);page.setDefaultTimeout(12000)
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),"../.env.demo"),"utf8").split("\n").filter(l=>l&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return[l.slice(0,i),l.slice(i+1)]}))
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 const id=process.env.NILART_INQUIRY_PAYMENT!,order=process.env.NILART_INQUIRY_ORDER!
 await page.goto(`/en/admin/orders/${order}`)
 const row=page.getByRole('row').filter({hasText:id});await expect(row).toBeVisible();await row.getByRole('button',{name:'History and inquiry',exact:true}).click()
 await page.getByLabel('Inquiry reason',{exact:true}).fill('Sandbox inquiry browser verification')
 let lost=false,operation='',intent:unknown
 await page.route('**/api/v1/admin/payments/*/inquiries/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;operation=new URL(route.request().url()).pathname;intent=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);await route.abort('failed')}else await route.continue()})
 await page.getByRole('button',{name:'Inquire gateway result',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:'This action is not yet confirmed'})).toBeVisible({timeout:25000})
 await expect(page.getByRole('textbox',{name:'Inquiry reason',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'Check action receipt',exact:true}).click()
 await expect(page.getByText('Sandbox inquiry browser verification',{exact:true})).toBeVisible()
 const csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token
 const replay=await page.request.put(`${origin}${operation}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:intent});expect(replay.status()).toBe(200)
 expect((await(await page.request.get(`${origin}/api/v1/admin/payments/${id}/inquiries`)).json()).items).toHaveLength(1)
 const saved=await(await page.request.get(`${origin}/api/v1/admin/orders/${order}`)).json();expect(saved.state.fulfillment).toBe('on_hold');expect(saved.state.payment).not.toBe('paid')
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/payments`);await expect(page.getByRole('heading',{level:1,name:language==='fa'?'استعلام پرداخت‌ها':'Payment inquiries'})).toBeVisible();await expect(page.getByRole('table')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-payment-inquiries-${language}-${width}.png`,fullPage:true})}
 await page.goto('/en/admin/finance/payments');await expect(page.getByRole('heading',{level:1,name:'Payment inquiries'})).toBeVisible()
})
