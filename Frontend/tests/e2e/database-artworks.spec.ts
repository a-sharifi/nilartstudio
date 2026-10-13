import { expect, test } from "@playwright/test";

test("reference artworks come from PostgreSQL into gallery, detail and homepage",async({page})=>{
 const response=await page.request.get("/api/v1/catalog/artworks?page_size=100");
 expect(response.ok()).toBe(true);
 const catalog=await response.json();
 expect(catalog.total).toBe(9);
 expect(catalog.items.map((row:{slug:string})=>row.slug)).toContain("quiet-morning");
 await page.goto("/en/artworks");
 await expect(page.locator(".art-grid .art-card")).toHaveCount(6);
 await page.getByRole("textbox",{name:"Search artworks"}).fill("Quiet morning");
 await page.locator(".art-search").getByRole("button",{name:"Search",exact:true}).click();
 await expect(page.getByRole("heading",{name:"Quiet morning",exact:true})).toBeVisible();
 await page.getByRole("link",{name:"View artwork",exact:true}).click();
 await expect(page.locator("h1")).toHaveText("Quiet morning");
 await expect(page.locator(".ad-summary")).toContainText("Test artwork from the design reference");
 await expect(page.locator(".ad-stock")).toHaveText("Available — demo");
 await expect(page.getByRole("button",{name:"Add to cart",exact:true})).toBeDisabled();
 await page.goto("/en");
 await expect(page.locator(".artwork-copy h3")).toHaveText(catalog.items[0].title_en);
 await expect(page.locator(".artwork-copy")).toContainText("Test artwork");
});

test("Persian reference artwork fixture details are database-backed",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa/artworks/quiet-morning");
 await expect(page.locator("h1")).toHaveText("صبح آرام");
 await expect(page.locator(".ad-summary")).toContainText("اثر آزمایشی از مرجع طراحی");
 await expect(page.locator(".ad-spec-table")).toContainText("اعلام نشده");
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
