import { expect, test } from "@playwright/test";

test("home uses published database products, categories, collections and bundles",async({page})=>{
 await page.goto("/en");
 await expect(page.locator(".collection-grid .collection-card")).toHaveCount(5);
 await expect(page.locator(".category-grid .category-card")).toHaveCount(4);
 await expect(page.locator(".collection-grid .collection-card").first()).toContainText("Cats");
 await expect(page.locator(".category-grid .category-card").first()).toContainText("Sketchbooks");
 await expect(page.getByRole("heading",{name:"127 gsm sketchbook",exact:true})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Bookmark",exact:true})).toBeVisible();
 await expect(page.locator(".bundle-grid .bundle-card")).toHaveCount(2);
 await expect(page.getByRole("heading",{name:"Cats bundle",exact:true})).toBeVisible();
 await expect(page.getByText("No bundles have been published yet.")).toHaveCount(0);
 await expect(page.locator(".category-grid .mockup.rose")).toBeVisible();
 await expect(page.locator(".collection-grid .mockup.lilac")).toBeVisible();
 await expect(page.locator(".product-card .favorite")).toHaveCount(0);
 await page.screenshot({path:"/tmp/nilart-home-live-reference-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa");
 await expect(page.locator(".bundle-grid .bundle-card")).toHaveCount(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"/tmp/nilart-home-live-reference-mobile.png",fullPage:true});
});

test("three database bundles keep reference galleries, exact components and product links",async({page})=>{
 await page.goto("/en/bundles");
 await expect(page.locator(".bundle-card")).toHaveCount(3);
 await page.getByRole("link",{name:"Cats everyday bundle",exact:true}).click();
 await expect(page.locator(".gallery-thumbnails button")).toHaveCount(4);
 await expect(page.locator(".bundle-component-thumb .mockup")).toHaveCount(3);
 await expect(page.locator(".bundle-component-card")).toHaveCount(3);
 await expect(page.locator(".bundle-component-card").filter({hasText:"Sticker — Cats"})).toContainText("2 per bundle");
 await page.getByRole("button",{name:"Two stickers",exact:true}).click();
 await page.getByRole("button",{name:"Enlarge image: Two stickers"}).click();
 await expect(page.locator("dialog[open] .bundle-sticker-pair")).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(page.getByRole("button",{name:"Enlarge image: Two stickers"})).toBeFocused();
 await expect(page.locator(".quantity-stepper input")).toBeDisabled();
 await expect(page.locator(".product-add-button")).toBeDisabled();
 await expect(page.locator(".bundle-detail-info")).toBeVisible();
 await expect(page.locator(".product-related .product-card")).toHaveCount(3);
 await page.locator("h1").click();
 await page.screenshot({path:"/tmp/nilart-bundle-detail-complete-desktop.png",fullPage:true});
 await page.locator(".bundle-component-card").getByRole("link",{name:"Ruled notebook — Cats",exact:true}).click();
 await expect(page).toHaveURL(/\/en\/products\/cat-ruled$/);
 await expect(page.locator("h1")).toHaveText("Ruled notebook — Cats");
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa/bundles/cat-keepsake-set");
 await expect(page.locator(".bundle-component-card")).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"/tmp/nilart-bundle-detail-complete-mobile.png",fullPage:true});
});

test("homepage bundle errors retry and empty results do not create sample bundles",async({page})=>{
 let valid=false;
 await page.route("**/api/v1/catalog/bundles**",route=>route.fulfill(valid?{json:{items:[],total:0,page:1,page_size:100}}:{status:503,json:{}}));
 await page.goto("/en");
 const section=page.locator(".bundle-section");
 await expect(section.getByText("Unable to load bundles.")).toBeVisible();
 valid=true;
 await section.getByRole("button",{name:"Try again"}).click();
 await expect(section.getByText("No bundles have been published yet.")).toBeVisible();
 await expect(section.locator(".bundle-card")).toHaveCount(0);
});
