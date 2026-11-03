import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_STOCK_FIXTURE,'Requires an isolated demo stock fixture')
test('real stock opening, reviewed zero-payment checkout, frozen commitment and bilingual staff/customer views',async({page})=>{
 test.setTimeout(90000);page.setDefaultTimeout(12000)
 const fixture=JSON.parse(process.env.NILART_STOCK_FIXTURE!) as {sku:string;phone:string;customer:string;address:string;tag:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200)}
 let csrf=''
 async function write(path:string,data:unknown,method='PUT'){if(!csrf)csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token;const r=await page.request.fetch(`${origin}${path}`,{method,headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.ok(),await r.text()).toBe(true);return r.json()}
 await login('+989121110001')
 const settings=await(await page.request.get(`${origin}/api/v1/admin/settings`)).json()
 if(settings.content.reservation_minutes===null)await write(`/api/v1/admin/settings/versions/${randomUUID()}`,{expected_version:settings.version,content:{...settings.content,reservation_minutes:15},reason:'Explicit isolated demo reservation policy'})
 const opening=await write(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'sku',reference_id:fixture.sku,expected_version:0,action:'opening',quantity:'2',value:'100',threshold:null,reverses_id:null,reason:'Counted synthetic demo stock'})
 const coupon=`RSV-${fixture.tag.toUpperCase()}`
 await write(`/api/v1/admin/discounts/rules/${randomUUID()}/versions/${randomUUID()}`,{expected_version:0,reason:'Explicit no-charge sandbox journey',content:{kind:'percent',code:coupon,title_fa:'تخفیف آزمایش رزرو',title_en:'Reservation test discount',value:'100',minimum:'0',maximum:null,valid_from:'2020-01-01',valid_to:'2099-12-31',total_limit:1,customer_limit:1,product_ids:[],category_ids:[],collection_ids:[],customer_phones:[fixture.phone],allow_bundle_stacking:false,active:true}})
 await login(fixture.phone);csrf=''
 await page.request.post(`${origin}/api/v1/basket/bootstrap`,{headers:{Origin:origin}})
 const basket=await(await page.request.get(`${origin}/api/v1/basket`)).json()
 await write('/api/v1/basket/commands',{command_id:randomUUID(),version:basket.version,action:'add',item:{kind:'product',item_id:fixture.sku,quantity:2}},'POST')
 await page.goto('/en/checkout/sandbox')
 await expect(page.getByText(/Reservation after starting payment/)).toBeVisible()
 await page.getByLabel('Discount code',{exact:true}).fill(coupon)
 await page.getByRole('button',{name:'Check and apply code',exact:true}).click()
 await expect(page.getByRole('button',{name:'Remove code',exact:true})).toBeVisible()
 await page.getByRole('checkbox').check()
 await page.getByRole('button',{name:'Pay with Zarinpal sandbox',exact:true}).click()
 await expect(page).toHaveURL(/payment\/result\?id=/)
 await expect(page.getByText('Order completed with no payment required',{exact:true})).toBeVisible()
 await expect(page.getByText('Stock is committed to your paid order; shipment has not yet been confirmed.',{exact:true})).toBeVisible()
 const paymentId=new URL(page.url()).searchParams.get('id')!
 const p=await(await page.request.get(`${origin}/api/v1/payments/sandbox/${paymentId}`)).json()
 expect(p).toMatchObject({status:'paid',stock_managed:true,amount_rial:'0'})
 const owned=await(await page.request.get(`${origin}/api/v1/account/orders/${p.order_id}`)).json()
 expect(owned.snapshot.items[0].stock_components[0]).toMatchObject({reference_id:fixture.sku,quantity:2,per_unit:1})
 expect(owned.state.fulfillment).toBe('on_hold')
 await page.goto(`/en/account/orders/${p.order_id}`);await expect(page.getByRole('region',{name:'Order stock confirmation'})).toBeVisible()
 expect((await page.request.get(`${origin}/api/v1/admin/order-stock`)).status()).toBe(403)
 await login('+989121110001');csrf=''
 const position=await(await page.request.get(`${origin}/api/v1/admin/inventory/positions/${opening.position_id}`)).json()
 expect(position).toMatchObject({quantity:'2.000000',reserved:'2.000000',available:'0.000000',value:'100.000000'})
 const history=await(await page.request.get(`${origin}/api/v1/admin/order-stock/${p.order_id}/events`)).json()
 expect(history.items.map((e:{action:string})=>e.action)).toEqual(['commit','reserve'])
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/order-stock/${p.order_id}`);await expect(page.getByRole('table',{name:language==='fa'?'اجزای ثابت سفارش':'Frozen order components'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-order-stock-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/orders/${p.order_id}`);await expect(page.getByRole('heading',{name:'Order stock commitments',exact:true})).toBeVisible()
 await page.goto('/en/admin/order-stock');await page.getByLabel('Order reference',{exact:true}).fill(owned.snapshot.reference);await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.getByRole('row').filter({hasText:owned.snapshot.reference})).toBeVisible()
})
