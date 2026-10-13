import { expect, test } from "@playwright/test";
test("live gallery and artwork detail use API data", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "شرح", description_en: "Real description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.goto("/en/artworks");
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("link", { name: "View artwork" }).click();
  await expect(page).toHaveURL(/\/en\/artworks\/real/);
  await expect(page.locator(".ad-summary")).toHaveText("Real description");
  await expect(page.locator(".ad-layout")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  await expect(page.locator(".demo-painting")).toHaveCount(0);
  await page.goto("/fa/artworks");
  await expect(page.getByRole("heading", { name: "نقاشی واقعی" })).toBeVisible();
});

test("reference search survives detail navigation, back and reload", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "شرح", description_en: "Published description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.goto("/en/artworks");
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("textbox", { name: "Search artworks" }).fill("real");
  await page.locator(".art-search").getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=real/);
  await page.getByRole("link", { name: "View artwork" }).click();
  await expect(page.locator(".ad-summary")).toHaveText("Published description");
  await page.goBack();
  await expect(page.getByRole("textbox", { name: "Search artworks" })).toHaveValue("real");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Real artwork" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Available works only" }).check();
  await expect(page.getByRole("heading", { name: "No artworks match your selection." })).toBeVisible();
});

test("reference mobile gallery and detail have no horizontal overflow", async ({ page }) => {
  const artwork = { id: "a", slug: "real", title_fa: "نقاشی واقعی", title_en: "Real artwork", description_fa: "توضیح منتشرشده", description_en: "Published description" };
  await page.route("**/api/v1/catalog/artworks**", route => route.fulfill({ json: new URL(route.request().url()).pathname.endsWith("/real") ? artwork : { items: [artwork], total: 1 } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fa/artworks");
  await expect(page.getByRole("heading", { name: "نقاشی واقعی" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/nilart-reference-artworks-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "مشاهده اثر" }).click();
  await expect(page.locator(".ad-summary")).toHaveText("توضیح منتشرشده");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "/tmp/nilart-reference-artwork-detail-mobile.png", fullPage: true });
});

test("reference artwork cards, search, filters and pagination use published records", async ({ page }) => {
  const items = Array.from({length:9},(_,index)=>({id:`a-${index}`,slug:`work-${index}`,title_fa:`اثر ${index}`,title_en:`Published work ${index}`,description_fa:"شرح",description_en:`Description ${index}`}));
  await page.route("**/api/v1/catalog/artworks**",route=>route.fulfill({json:{items,total:items.length}}));
  await page.goto("/en/artworks");
  await expect(page.locator(".art-grid .art-card")).toHaveCount(6);
  await expect(page.locator(".art-card-status").first()).toHaveText("Availability unconfirmed");
  await expect(page.locator(".art-card .demo-painting")).toHaveCount(0);
  await expect(page.locator(".art-card .art-favorite")).toHaveCount(0);
  await expect(page.locator("aside .art-filter-panel")).toBeVisible();
  await page.screenshot({path:"/tmp/nilart-art-list-reference-desktop.png",fullPage:true});
  await page.getByRole("button",{name:"Next",exact:true}).click();
  await expect(page.locator(".art-grid .art-card")).toHaveCount(3);
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("textbox",{name:"Search artworks"}).fill("Description 8");
  await page.locator(".art-search").getByRole("button",{name:"Search",exact:true}).click();
  await expect(page.locator(".art-grid .art-card")).toHaveCount(1);
  await expect(page.getByRole("heading",{name:"Published work 8",exact:true})).toBeVisible();
});

test("Persian reference filter sheet cancels drafts and restores focus", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  const items=[{id:"a",slug:"real",title_fa:"نقاشی واقعی",title_en:"Real artwork",description_fa:"شرح",description_en:"Description"}];
  await page.route("**/api/v1/catalog/artworks**",route=>route.fulfill({json:{items,total:1}}));
  await page.goto("/fa/artworks");
  const trigger=page.locator(".art-mobile-filter");
  await trigger.click();
  const sheet=page.locator("dialog[open].art-filter-sheet");
  await sheet.getByRole("checkbox",{name:"فقط آثار موجود"}).check();
  await expect(page).not.toHaveURL(/available=1/);
  await page.screenshot({path:"/tmp/nilart-art-list-reference-filter-mobile.png",fullPage:true});
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(sheet.getByRole("checkbox",{name:"فقط آثار موجود"})).not.toBeChecked();
  await sheet.getByRole("checkbox",{name:"فقط آثار موجود"}).check();
  await sheet.getByRole("button",{name:"اعمال فیلترها",exact:true}).click();
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/available=1/);
  await expect(page.getByRole("heading",{name:"اثری با این انتخاب‌ها پیدا نشد.",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("reference artwork error retry and empty state never show prototype cards", async ({page})=>{
  let healthy=false;
  await page.route("**/api/v1/catalog/artworks**",route=>route.fulfill(healthy?{json:{items:[],total:0}}:{status:503,json:{}}));
  await page.goto("/en/artworks");
  await expect(page.getByRole("heading",{name:"Unable to load artworks.",exact:true})).toBeVisible();
  healthy=true;
  await page.getByRole("button",{name:"Try again",exact:true}).click();
  await expect(page.getByRole("heading",{name:"No artworks have been published yet.",exact:true})).toBeVisible();
  await expect(page.locator(".art-card")).toHaveCount(0);
});
