import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_STOCK_FIXTURE,'Requires an isolated demo catalogue/customer fixture')
test('real partial parcels, dispatch response recovery, moving cost and owned delivery tracking',async({page})=>{
 test.setTimeout(120000);page.setDefaultTimeout(12000)
 const f=JSON.parse(process.env.NILART_STOCK_FIXTURE!) as {sku:string;customer:string;phone:string;address:string;tag:string}
 const env=Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
 let csrf=''
 async function login(phone:string){const r=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone,password:env.NILART_DEMO_ADMIN_PASSWORD}});expect(r.status(),await r.text()).toBe(200);csrf=(await r.json()).csrf_token}
 async function fresh(){csrf=(await(await page.request.post(`${origin}/api/v1/auth/session/csrf`,{headers:{Origin:origin}})).json()).csrf_token}
 async function write(path:string,data:unknown,method='PUT'){const r=await page.request.fetch(`${origin}${path}`,{method,headers:{Origin:origin,'X-CSRF-Token':csrf},data});expect(r.ok(),await r.text()).toBe(true);return r.json()}
 const get=async(path:string)=>(await(await page.request.get(`${origin}${path}`)).json())
 await login('+989121110001')
 const settings=await get('/api/v1/admin/settings')
 await write(`/api/v1/admin/settings/versions/${randomUUID()}`,{expected_version:settings.version,content:{...settings.content,reservation_minutes:15,return_days:7,return_policy_fa:'سیاست صریح ارسال آزمایشی؛ شرایط قبلی سفارش تغییر نمی‌کند.',return_policy_en:'Explicit sandbox dispatch policy; original order eligibility is unchanged.'},reason:'Explicit isolated shipment acceptance settings'})
 const opening=await write(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'sku',reference_id:f.sku,expected_version:0,action:'opening',quantity:'2',value:'100',threshold:null,reverses_id:null,reason:'Counted synthetic shipment stock'})
 const coupon=`SHIP-${f.tag.toUpperCase()}`
 await write(`/api/v1/admin/discounts/rules/${randomUUID()}/versions/${randomUUID()}`,{expected_version:0,reason:'No-charge sandbox shipment test',content:{kind:'percent',code:coupon,title_fa:'آزمایش ارسال',title_en:'Shipment test',value:'100',minimum:'0',maximum:null,valid_from:'2020-01-01',valid_to:'2099-12-31',total_limit:1,customer_limit:1,product_ids:[],category_ids:[],collection_ids:[],customer_phones:[f.phone],allow_bundle_stacking:false,active:true}})
 await login(f.phone)
 await page.request.post(`${origin}/api/v1/basket/bootstrap`,{headers:{Origin:origin}});await fresh()
 const basket=await get('/api/v1/basket')
 const added=await write('/api/v1/basket/commands',{command_id:randomUUID(),version:basket.version,action:'add',item:{kind:'product',item_id:f.sku,quantity:2}},'POST')
 const stock=await get(`/api/v1/payments/stock-review?basket_version=${added.version}`)
 const p=await write('/api/v1/payments/sandbox/checkout',{command_id:randomUUID(),basket_version:added.version,address_id:f.address,language:'en',sandbox_confirmed:true,discount_code:coupon,discount_version:1,expected_total:'0',stock_fingerprint:stock.fingerprint},'POST')
 expect(p.status).toBe('paid')
 const order=p.order_id,line=(await get(`/api/v1/account/orders/${order}`)).snapshot.items[0].id
 await login('+989121110001')
 const reason=async(value:string)=>page.getByRole('textbox',{name:'Shipment action reason',exact:true}).fill(value)
 async function prepare(){await page.goto(`/en/admin/shipments/new?order=${order}`);await page.getByRole('spinbutton',{name:'Parcel quantity for Reservation test product',exact:true}).fill('1');await reason('Partial parcel selection');await page.getByRole('button',{name:'Save parcel draft',exact:true}).click();await expect(page).toHaveURL(/\/shipments\/[0-9a-f-]{36}$/);const id=page.url().split('/').at(-1)!
  await page.getByRole('checkbox',{name:'All items and quantities for this parcel were picked and matched.',exact:true}).check();await reason('Picked actual parcel');await page.getByRole('button',{name:'Record picking',exact:true}).click();await expect(page.getByRole('group',{name:'Quality checklist',exact:true})).toBeVisible()
  for(const name of ['Items and options are correct.','Goods are intact.','Quantities and components are complete.'])await page.getByRole('checkbox',{name,exact:true}).check();await reason('QC confirmed actual goods');await page.getByRole('button',{name:'Record QC result',exact:true}).click();await page.getByLabel('Packaging note',{exact:true}).fill('Protected sandbox parcel');await page.getByLabel('Actual parcel weight (grams)',{exact:true}).fill('200');await reason('Packing completed');await page.getByRole('button',{name:'Record packing',exact:true}).click();await page.getByLabel('Carrier',{exact:true}).fill('Sandbox post');await page.getByLabel('Tracking number',{exact:true}).fill(`TRACK-${id.slice(0,8)}`);await page.getByLabel('Actual shipping cost (toman)',{exact:true}).fill('25');await page.getByRole('checkbox',{name:'I confirm sandbox dispatch and physical stock deduction for this parcel.',exact:true}).check();await reason('Explicit sandbox dispatch');return id}
 let lost=false,operation='',intent:unknown
 await page.route('**/api/v1/admin/fulfillment/shipments/*/commands/*',async route=>{if(route.request().method()==='PUT'&&route.request().postDataJSON().action==='dispatch'&&!lost){lost=true;operation=new URL(route.request().url()).pathname;intent=route.request().postDataJSON();const r=await route.fetch();expect(r.status(),await r.text()).toBe(200);return route.abort('failed')}await route.continue()})
 const first=await prepare();await page.getByRole('button',{name:'Dispatch and deduct stock',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Action result is unconfirmed'})).toBeVisible();await page.getByRole('button',{name:'Check shipment receipt',exact:true}).click();await expect(page.getByText('Historical dispatched goods cost (toman): 50.000000',{exact:true})).toBeVisible()
 await fresh();await write(operation,intent)
 expect((await get(`/api/v1/admin/inventory/positions/${opening.position_id}`))).toMatchObject({quantity:'1.000000',reserved:'1.000000',value:'50.000000'})
 await page.getByRole('checkbox',{name:'Delivery of this parcel to the customer is confirmed.',exact:true}).check();await reason('First parcel delivered');await page.getByRole('button',{name:'Record parcel delivery',exact:true}).click();await expect(page.getByText('Delivered',{exact:true})).toBeVisible()
 expect((await get(`/api/v1/admin/orders/${order}`)).state).toMatchObject({fulfillment:'partial',delivered:{[line]:1}})
 await fresh();const position=await get(`/api/v1/admin/inventory/positions/${opening.position_id}`)
 await write(`/api/v1/admin/inventory/commands/${randomUUID()}`,{kind:'sku',reference_id:f.sku,expected_version:position.version,action:'increase',quantity:'2',value:'300',threshold:null,reverses_id:null,reason:'Explicit newer synthetic stock cost'})
 const second=await prepare();await page.getByRole('button',{name:'Dispatch and deduct stock',exact:true}).click();await expect(page.getByText('Historical dispatched goods cost (toman): 116.666667',{exact:true})).toBeVisible();await page.getByRole('checkbox',{name:'Delivery of this parcel to the customer is confirmed.',exact:true}).check();await reason('Second parcel delivered');await page.getByRole('button',{name:'Record parcel delivery',exact:true}).click();await expect(page.getByText('Delivered',{exact:true})).toBeVisible()
 expect((await get(`/api/v1/admin/orders/${order}`)).state).toMatchObject({fulfillment:'delivered',delivered:{[line]:2}})
 expect((await get(`/api/v1/admin/fulfillment/shipments/${first}`)).state.actual_cost).toBe('50.000000')
 expect((await get(`/api/v1/admin/inventory/positions/${opening.position_id}`))).toMatchObject({quantity:'2.000000',reserved:'0.000000',value:'233.333333'})
 for(const language of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${language}/admin/shipments/${second}`);await expect(page.getByRole('heading',{level:1,name:language==='fa'?'آماده‌سازی و ارسال':'Shipment preparation'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.screenshot({path:`/tmp/nilart-shipment-${language}-${width}.png`,fullPage:true})}
 await page.goto(`/en/admin/shipments/${second}/label`);await expect(page.getByRole('article').filter({hasText:'Sandbox parcel label'})).toBeVisible();expect(await page.getByRole('article').textContent()).not.toContain('116.666667');await page.emulateMedia({media:'print'});await expect(page.locator('.ad-sidebar')).toBeHidden();await page.screenshot({path:'/tmp/nilart-shipment-label-print.png',fullPage:true});await page.emulateMedia({media:null})
 await page.goto(`/en/admin/inventory/positions/${opening.position_id}`);await expect(page.getByText('fulfillment_dispatch',{exact:false}).first()).toBeVisible()
 await login(f.phone);await page.goto(`/en/account/orders/${order}`);const tracking=page.getByRole('region',{name:'Order parcel tracking',exact:true});await expect(tracking.getByRole('heading',{name:'Delivered',exact:true})).toHaveCount(2);expect(await tracking.textContent()).not.toContain('116.666667');expect((await page.request.get(`${origin}/api/v1/account/orders/${randomUUID()}/shipments`)).status()).toBe(404)
 const notices=await get('/api/v1/account/panel/notification');expect(notices.items.filter((n:{data:{order_id?:string}})=>n.data.order_id===order)).toHaveLength(4)
})
