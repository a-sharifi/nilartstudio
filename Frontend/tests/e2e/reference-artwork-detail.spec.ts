import { expect, test } from "@playwright/test";
const artwork={id:"art",slug:"verified",title_fa:"اثر بررسی‌شده",title_en:"Verified artwork",description_fa:"توضیح اثر از کاتالوگ",description_en:"Description from the catalog"};

test("published artwork detail keeps the reference sections and unknown metadata",async({page})=>{
 await page.route("**/api/v1/catalog/artworks**",route=>route.fulfill({json:artwork}));
 await page.goto("/en/artworks/verified");
 await expect(page.locator(".ad-layout")).toBeVisible();
 await expect(page.locator(".ad-summary")).toHaveText(artwork.description_en);
 await expect(page.locator(".ad-stock")).toHaveText("Availability unconfirmed");
 await expect(page.locator(".ad-key-specs")).toContainText("Not provided");
 await expect(page.locator(".ad-spec-table")).toBeVisible();
 await expect(page.locator(".ad-section-nav a")).toHaveCount(3);
 await expect(page.locator(".ad-frame-options")).toHaveCount(0);
 await expect(page.locator(".demo-painting")).toHaveCount(0);
 await expect(page.getByRole("button",{name:"View larger",exact:true})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Add to cart",exact:true})).toBeDisabled();
 await expect(page.locator(".art-breadcrumb a").first()).toHaveAttribute("href","/en");
 await expect(page.locator('.art-breadcrumb [aria-current="page"]')).toHaveText(artwork.title_en);
 await page.screenshot({path:"/tmp/nilart-artwork-detail-reference-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa/artworks/verified");
 await expect(page.locator(".ad-summary")).toHaveText(artwork.description_fa);
 await expect(page.locator(".ad-stock")).toHaveText("موجودی تأیید نشده");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"/tmp/nilart-artwork-detail-reference-mobile.png",fullPage:true});
});

test("reference artwork detail distinguishes failed and missing records",async({page})=>{
 let missing=false;
 await page.route("**/api/v1/catalog/artworks**",route=>route.fulfill({status:missing?404:503,json:{}}));
 await page.goto("/en/artworks/missing");
 await expect(page.getByRole("heading",{name:"Unable to load the artwork.",exact:true})).toBeVisible();
 missing=true;
 await page.getByRole("button",{name:"Try again",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Artwork not found",exact:true})).toBeVisible();
 await expect(page.locator(".ad-purchase")).toHaveCount(0);
});

test("reference artwork detail shows its loading skeleton before a record arrives",async({page})=>{
 let release:()=>void=()=>{};
 const ready=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/api/v1/catalog/artworks**",async route=>{await ready;await route.fulfill({json:artwork});});
 await page.goto("/en/artworks/verified");
 await expect(page.locator(".ad-image-skeleton")).toBeVisible();
 await expect(page.locator(".ad-info-skeleton .skeleton")).toHaveCount(6);
 release();
 await expect(page.getByRole("heading",{name:"Verified artwork",exact:true})).toBeVisible();
 await expect(page.locator(".ad-image-skeleton")).toHaveCount(0);
});
