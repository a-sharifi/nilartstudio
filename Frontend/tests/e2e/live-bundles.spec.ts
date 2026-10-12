import { expect, test } from "@playwright/test";
test("bundle list and detail show real components without purchase claims", async ({ page }) => {
  const bundle = { id: "b", slug: "set", title_fa: "پکیج واقعی", title_en: "Real bundle", description_fa: "شرح", description_en: "Description", components: [{ sku_id: "s", code: "SKU-A", quantity: 2, title_fa: "محصول", title_en: "Product" }] };
  await page.route("**/api/v1/catalog/bundles**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/set") ? bundle : { items: [bundle], total: 1 } }));
  await page.goto("/bundles?language=en");
  await expect(page.getByRole("heading", { name: "Real bundle" })).toBeVisible();
  await page.getByRole("link", { name: "Real bundle" }).click();
  await expect(page.locator(".bundle-component-card")).toContainText("2 per bundle");
  await expect(page.locator(".bundle-component-card")).toContainText("Product");
  await expect(page.locator(".bundle-component-card")).toContainText("SKU-A");
  await expect(page.locator(".bundle-detail-page")).toBeVisible();
  await expect(page.locator(".product-add-button")).toBeDisabled();
  await page.screenshot({path:"/tmp/nilart-bundle-reference-desktop.png",fullPage:true});
  await expect(page.getByText("Purchase details unconfirmed")).toBeVisible();
});

test("footer routes render their supplied reference layouts", async ({ page }) => {
  for (const [path, selector] of [["/guides/buying", ".buying-guide"], ["/faq", ".faq-page"], ["/en/about", ".about-page"], ["/en/contact", ".contact-page"], ["/en/terms", ".terms-page"], ["/privacy", ".privacy-page"], ["/en/returns", ".returns-page"], ["/en/track-order", ".tracking-page"]]) {
    await page.goto(path);
    await expect(page.locator(selector)).toBeVisible();
    await expect(page.locator(".static-info-page")).toHaveCount(0);
  }
});

test("reference footer layouts remain readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/fa/contact", "/fa/about", "/fa/terms", "/fa/returns", "/fa/track-order", "/fa/faq", "/fa/guides/buying", "/fa/privacy"]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto("/fa/contact");
  await expect(page.locator(".contact-page")).toBeVisible();
  await page.screenshot({ path: "/tmp/nilart-restored-contact-mobile.png", fullPage: true });
});

test("reference bundle states distinguish malformed responses, empty catalog and missing details", async ({ page }) => {
  let valid = false;
  await page.route("**/api/v1/catalog/bundles**", route => {
    if (new URL(route.request().url()).pathname.endsWith("/missing")) return route.fulfill({ status:404,json:{} });
    return route.fulfill({json:valid ? {items:[],total:0} : {items:[{id:"bad"}],total:1}});
  });
  await page.goto("/en/bundles");
  await expect(page.getByText("Unable to load bundles.")).toBeVisible();
  valid = true;
  await page.getByRole("button",{name:"Try again"}).click();
  await expect(page.getByText("No published bundles yet.")).toBeVisible();
  await page.goto("/en/bundles/missing");
  await expect(page.getByRole("heading",{name:"Bundle not found."})).toBeVisible();
  await expect(page.getByRole("link",{name:"Browse bundles"})).toBeVisible();
});

test("reference Persian bundle cards and details fit mobile without commercial fixtures", async ({ page }) => {
  const bundle = {id:"mobile-b",slug:"mobile-set",title_fa:"پکیج تست موبایل",title_en:"Mobile test bundle",description_fa:"توضیحات پکیج",description_en:"Bundle description",components:[{sku_id:"mobile-s",code:"MOBILE-SKU",quantity:3,title_fa:"استیکر",title_en:"Sticker"}]};
  await page.route("**/api/v1/catalog/bundles**",route=>route.fulfill({json:new URL(route.request().url()).pathname.endsWith("/mobile-set") ? bundle : {items:[bundle],total:1}}));
  await page.setViewportSize({width:390,height:844});
  await page.goto("/fa/bundles");
  await expect(page.locator(".bundle-card")).toHaveCount(1);
  await page.screenshot({path:"/tmp/nilart-bundle-reference-list-mobile.png",fullPage:true});
  await page.getByRole("link",{name:"پکیج تست موبایل",exact:true}).click();
  await expect(page.locator(".bundle-component-card")).toContainText("۳ عدد در هر پکیج");
  await expect(page.locator(".product-add-button")).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:"/tmp/nilart-bundle-reference-mobile.png",fullPage:true});
});
