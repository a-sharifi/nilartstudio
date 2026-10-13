import { expect, test } from "@playwright/test";

test("reference bookmark detail reads database content and opens the native gallery", async ({ page }) => {
  await page.goto("/en/products/bookmark-love");
  await expect(page.getByRole("heading", { name: "Bookmark", exact: true })).toBeVisible();
  await expect(page.locator(".product-gallery .mockup.rose").first()).toBeVisible();
  await expect(page.locator(".gallery-thumbnails button")).toHaveCount(1);
  await expect(page.locator(".product-intro")).toHaveText("Bookmark from the Love collection.");
  await expect(page.locator(".product-specifications")).toContainText("Bookmark");
  await expect(page.locator(".product-specifications")).not.toContainText("Paper weight");
  await expect(page.locator(".quantity-stepper input")).toBeDisabled();
  await page.getByRole("radio", { name: "Bookmark", exact: true }).check();
  await expect(page.locator(".product-add-button")).toBeDisabled();
  await page.getByRole("button", { name: "Enlarge image: Front view" }).click();
  await expect(page.locator("dialog[open].product-dialog-lightbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open].product-dialog-lightbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enlarge image: Front view" })).toBeFocused();
  await page.locator("h1").click();
  await page.screenshot({path:"/tmp/nilart-bookmark-detail-reference-desktop.png",fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.goto("/fa/products/bookmark-love");
  await expect(page.locator(".product-intro")).toContainText("کالکشن عشق");
  await expect(page.locator(".product-delivery")).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:"/tmp/nilart-bookmark-detail-reference-mobile.png",fullPage:true});
});

test("notebook detail retains reference thumbnail and keyboard navigation", async ({ page }) => {
  await page.goto("/en/products/cats-sketchbook-127gsm");
  await expect(page.locator(".gallery-thumbnails button")).toHaveCount(4);
  await page.getByRole("button", { name: "Back cover", exact: true }).click();
  await expect(page.locator(".gallery-main .gallery-view-back")).toBeVisible();
  await page.getByRole("button", { name: "Enlarge image: Back cover" }).click();
  await page.locator("dialog[open] .gallery-controls button").first().press("ArrowRight");
  await expect(page.locator("dialog[open] .gallery-view-inside")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".product-specifications")).toContainText("Cats");
  await expect(page.locator(".product-related .product-card")).toHaveCount(5);
});

test("published options use the reference group renderer and real collection links", async ({ page }) => {
  await page.goto("/en/products/sticker-cows");
  const group = page.locator(".product-option-group.option-published-sku");
  await expect(group.locator(".option-required")).toHaveText("Choose an option");
  await group.getByRole("radio", {name:"Sticker set",exact:true}).check();
  await expect(group.locator(".option-required")).toHaveText("Selected");
  await expect(group.locator(".product-radio.selected .radio-check")).toHaveText("✓");
  await expect(page.locator(".selection-summary")).toHaveText("Sticker set");
  await expect(page.locator(".product-gallery .mockup.sand").first()).toBeVisible();
  await expect(page.locator(".product-price-summary")).toContainText("Price unavailable");
  await expect(page.locator(".product-add-button")).toBeDisabled();
  await expect(page.locator(".product-intro-top a")).toHaveAttribute("href", "/collections/gav?language=en");
  await page.screenshot({path:"/tmp/nilart-shared-product-options-desktop.png",fullPage:true});
  await page.goto("/collections/gav?language=en");
  await expect(page.getByRole("heading",{name:"Cows Collection",exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await page.goto("/fa/products/sticker-cows");
  await page.locator(".product-option-group").getByRole("radio").check();
  await expect(page.locator(".option-required")).toHaveText("انتخاب شد");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:"/tmp/nilart-shared-product-options-mobile.png",fullPage:true});
});

test("Cats notebook uses reference size, sheets and cover families backed by DB variants",async({page})=>{
 await page.goto("/en/products/cats-sketchbook-127gsm");
 await expect(page.locator(".product-option-group")).toHaveCount(3);
 await expect(page.locator(".product-fixed-fact")).toContainText("127 GSM");
 await page.locator(".option-size").getByRole("radio",{name:/^A4/}).check();
 await page.locator(".option-sheets").getByRole("radio",{name:/^50 sheets/}).check();
 await expect(page.locator(".option-cover").getByRole("radio",{name:/^2 mm/})).toBeDisabled();
 await page.locator(".option-cover").getByRole("radio",{name:/^3 mm/}).check();
 await expect(page.locator(".selection-summary")).toHaveText("A4 · 50 sheets · 3 mm hard cover");
 await expect(page.locator(".product-specifications")).toContainText("127 gsm — design sample");
 await expect(page.locator(".product-price-summary")).toContainText("245000 toman");
 await expect(page.locator(".product-add-button")).toBeEnabled();
 await page.getByRole("button",{name:"Size guide",exact:true}).click();
 await expect(page.locator("dialog[open] .size-comparison > div")).toHaveCount(3);
 await page.keyboard.press("Escape");
 await page.screenshot({path:"/tmp/nilart-notebook-real-options-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa/products/cats-sketchbook-127gsm");
 await expect(page.locator(".product-option-group")).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"/tmp/nilart-notebook-real-options-mobile.png",fullPage:true});
});

test("other reference notebooks have their explicit published size choices",async({page})=>{
 for(const [slug,count] of [["notebook-ghosts",2],["cat-ruled",2],["cat-ruled-hard",1]] as const){
  await page.goto(`/en/products/${slug}`);
  await expect(page.locator(".option-size").getByRole("radio")).toHaveCount(count);
  await expect(page.locator(".option-sheets")).toHaveCount(0);
  await page.locator(".option-size").getByRole("radio").first().check();
  await expect(page.locator(".selection-summary")).toHaveText("A5");
 }
});
