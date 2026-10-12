import {expect,test} from "@playwright/test";
const product = {id:"product-test",slug:"test-item",title_fa:"محصول تست",title_en:"Test item",description_fa:"شرح تست",description_en:"Test description",collection_ids:[],category_ids:[]};
test("published SKU selection preserves exact price without enabling checkout",async({page})=>{
 await page.route("**/api/v1/catalog/products/test-item",route=>route.fulfill({json:product}));
 await page.route("**/api/v1/catalog/products/test-item/skus",route=>route.fulfill({json:[{id:"s-1",product_id:product.id,code:"SKU-ONE",price:{amount:"123456789012345678.123456",currency:"IRT"}},{id:"s-2",product_id:product.id,code:"SKU-TWO",price:null}]}));
 await page.goto("/en/products/test-item");
 await expect(page.getByRole("heading",{name:"Test item"})).toBeVisible();
 await page.getByRole("radio",{name:"SKU-ONE"}).check();
 await expect(page.getByText("123456789012345678.123456 toman")).toBeVisible();
 await page.getByRole("radio",{name:"SKU-TWO"}).check();
 await expect(page.getByText("Price unavailable")).toBeVisible();
 await expect(page.locator(".product-add-button")).toBeDisabled();
 await page.screenshot({path:"/tmp/nilart-product-reference-desktop.png",fullPage:true});
});
test("malformed/foreign SKU responses retry; missing product stays distinct",async({page})=>{
 let valid=false;
 await page.route("**/api/v1/catalog/products/test-item",route=>route.fulfill({json:product}));
 await page.route("**/api/v1/catalog/products/test-item/skus",route=>route.fulfill({json:valid ? [] : [{id:"s",product_id:"foreign",code:"BAD",price:null}]}));
 await page.goto("/en/products/test-item");
 await expect(page.getByRole("heading",{name:"Unable to load product."})).toBeVisible();
 valid=true;
 await page.getByRole("button",{name:"Try again"}).click();
 await expect(page.getByText("No published options yet.")).toBeVisible();
 await page.route("**/api/v1/catalog/products/missing",route=>route.fulfill({status:404,json:{}}));
 await page.goto("/en/products/missing");
 await expect(page.getByRole("heading",{name:"Product not found."})).toBeVisible();
});
test("reference products open from shop in both languages and fit mobile",async({page})=>{
 const sketch = {...product,id:"sketch",slug:"cats-sketchbook-127gsm",title_fa:"دفتر طراحی ۱۲۷ گرم",title_en:"127 gsm sketchbook"};
 const sticker = {...product,id:"sticker",slug:"sticker-cows",title_fa:"ست استیکر",title_en:"Sticker set"};
 await page.route("**/api/v1/catalog/collections**",route=>route.fulfill({json:{items:[],total:0}}));
 await page.route("**/api/v1/catalog/categories**",route=>route.fulfill({json:{items:[],total:0}}));
 await page.route("**/api/v1/catalog/products**",route=>{
   const path=new URL(route.request().url()).pathname;
   return route.fulfill({json:path.endsWith("/skus") ? [] : path.endsWith("/cats-sketchbook-127gsm") ? sketch : path.endsWith("/sticker-cows") ? sticker : {items:[sketch,sticker],total:2}});
 });
 await page.goto("/en/shop");
 await page.getByRole("link",{name:"127 gsm sketchbook",exact:true}).first().click();
 await expect(page).toHaveURL(/\/en\/products\/cats-sketchbook-127gsm$/);
 await expect(page.getByRole("heading",{name:"127 gsm sketchbook"})).toBeVisible();
 await expect(page.getByText("No published options yet.")).toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa/products/sticker-cows");
 await expect(page.getByRole("heading",{name:"ست استیکر"})).toBeVisible();
 await expect(page.locator(".product-add-button")).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:"/tmp/nilart-product-reference-mobile.png",fullPage:true});
});
