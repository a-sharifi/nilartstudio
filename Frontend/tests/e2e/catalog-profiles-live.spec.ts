import {test,expect} from '@playwright/test'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
const origin='http://127.0.0.1:18080'
test.skip(process.env.NILART_RUN_DEMO_TESTS!=='true'||process.env.PLAYWRIGHT_BASE_URL!==origin||!process.env.NILART_PROFILE_FIXTURE,'Isolated fresh demo fixture required')
const config=()=>Object.fromEntries(readFileSync(resolve(process.cwd(),'../.env.demo'),'utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)]}))
test('approved product and independent SKU profiles persist and render without exposing drafts',async({page})=>{
 test.setTimeout(120000);page.on('dialog',d=>d.accept())
 const f=JSON.parse(process.env.NILART_PROFILE_FIXTURE!) as {sku:string;product:string;tag:string;phone:string}
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200);const csrf=(await login.json()).csrf_token
 const asset=randomUUID(),revision=randomUUID(),title='Profile image '+f.tag
 const uploaded=await page.request.put(`${origin}/api/v1/admin/media/${asset}/versions/${revision}`,{headers:{Origin:origin,'X-CSRF-Token':csrf},data:{expected_version:0,action:'publish',purpose:'public_image',metadata:{title_fa:'تصویر '+f.tag,title_en:title,alt_fa:'تصویر محصول',alt_en:'Approved product image',sku_id:null,print_size:'',notes:'Private profile fixture'},file_name:'profile.png',content_base64:'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNkaGBgYGBgYmBgYGBgAAAGKgCE5tEtPAAAAABJRU5ErkJggg==',reason:'Approved isolated profile image'}});expect(uploaded.status(),await uploaded.text()).toBe(200)
 await page.goto(`/en/admin/products/${f.product}/profile`)
 await page.getByLabel('Search images',{exact:true}).fill(title);await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:'Add: '+title,exact:true}).click()
 await page.getByRole('button',{name:'Add specification',exact:true}).click();await page.getByLabel('Persian label',{exact:true}).fill('جنس');await page.getByLabel('English label',{exact:true}).fill('Material');await page.getByLabel('Persian value',{exact:true}).fill('کاغذ');await page.getByLabel('English value',{exact:true}).fill('Reviewed paper '+f.tag)
 const acknowledge=async(reason:string)=>{await page.getByLabel('Reason',{exact:true}).fill(reason);await page.getByRole('checkbox',{name:'I reviewed the profile and publication effect.',exact:true}).check()}
 await acknowledge('Reviewed isolated product draft');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Version saved.'})).toBeVisible();expect((await page.request.get(`${origin}/api/v1/catalog/profiles/products/${f.product}`)).status()).toBe(404)
 await acknowledge('Approve isolated product profile publication');await page.getByRole('button',{name:'Publish profile',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Version saved.'})).toBeVisible()
 await page.goto(`/en/products/stock-live-${f.tag}`);await expect(page.locator('body')).toContainText('Reviewed paper '+f.tag);await expect(page.locator(`img[src="/api/v1/media/${asset}/versions/${revision}/content"]`).first()).toBeVisible()
 await page.goto(`/en/admin/skus/${f.sku}/profile`);await page.getByLabel('Search images',{exact:true}).fill(title);await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('button',{name:'Add: '+title,exact:true}).click();await page.getByLabel('English alternative text',{exact:true}).fill('Independent SKU image')
 await page.getByRole('combobox',{name:'Delivery type',exact:true}).click();await page.getByRole('option',{name:'Physical',exact:true}).click();await page.getByLabel('Shipping weight (grams)',{exact:true}).fill('125');await page.getByRole('combobox',{name:'Return eligibility under policy',exact:true}).click();await page.getByRole('option',{name:'Eligible under policy',exact:true}).click();await acknowledge('Approve explicit SKU shipping profile')
 let lost=false
 await page.route('**/api/v1/admin/catalog/profiles/skus/*/commands/*',async route=>{if(route.request().method()==='PUT'&&!lost){lost=true;const response=await route.fetch();expect(response.status(),await response.text()).toBe(200);return route.abort('failed')}await route.continue()})
 await page.getByRole('button',{name:'Publish profile',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Result unknown'})).toBeVisible();await page.getByRole('button',{name:'Check receipt',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Version saved.'})).toBeVisible()
 await page.reload();await expect(page.getByLabel('Shipping weight (grams)',{exact:true})).toHaveValue('125')
 await page.getByLabel('Shipping weight (grams)',{exact:true}).fill('250');await acknowledge('Retain unpublished changed SKU weight');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Version saved.'})).toBeVisible();expect((await(await page.request.get(`${origin}/api/v1/catalog/profiles/skus/${f.sku}`)).json()).weight_grams).toBe(125)
 for(const lang of ['fa','en'])for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.goto(`/${lang}/admin/skus/${f.sku}/profile`);await expect(page.locator('input[type="number"]')).toHaveValue('250');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)}
 await page.goto(`/en/products/stock-live-${f.tag}`);await page.getByRole('radio',{name:'RSV-'+f.tag,exact:true}).check();await expect(page.getByAltText('Independent SKU image').first()).toBeVisible()
 const customer=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:f.phone,password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(customer.status()).toBe(200);expect((await page.request.get(`${origin}/api/v1/admin/catalog/profiles/skus/${f.sku}`)).status()).toBe(403)
})

test('profile navigation retains edits and shared controls remain accessible',async({page})=>{
 const f=JSON.parse(process.env.NILART_PROFILE_FIXTURE!) as {sku:string;product:string}
 const login=await page.request.post(`${origin}/api/v1/auth/login/password`,{headers:{Origin:origin},data:{phone:'+989121110001',password:config().NILART_DEMO_ADMIN_PASSWORD}});expect(login.status()).toBe(200)
 await page.goto(`/en/admin/skus/${f.sku}/profile`);await expect(page.getByLabel('Shipping weight (grams)',{exact:true})).toHaveValue('250');await page.getByLabel('Shipping weight (grams)',{exact:true}).fill('999')
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Back to list',exact:true}).click();await expect(page.getByLabel('Shipping weight (grams)',{exact:true})).toHaveValue('999');expect(page.url()).toContain(`/skus/${f.sku}/profile`)
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Use saved version',exact:true}).click();await expect(page.getByLabel('Shipping weight (grams)',{exact:true})).toHaveValue('250')
 await page.getByRole('combobox',{name:'Delivery type',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('listbox')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('listbox')).toHaveCount(0)
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/nilart-profile-en-desktop.png',fullPage:true})
 await page.setViewportSize({width:390,height:900});await page.goto(`/fa/admin/skus/${f.sku}/profile`);await expect(page.locator('input[type="number"]')).toHaveValue('250');await page.screenshot({path:'/tmp/nilart-profile-fa-mobile.png',fullPage:true})
})
