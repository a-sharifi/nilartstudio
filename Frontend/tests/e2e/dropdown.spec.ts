import {expect,test} from "@playwright/test";

test("collection autocomplete filters real choices and applies selection",async({page})=>{
 await page.goto("/en/shop");
 const collection=page.locator(".shop-sidebar").getByRole("combobox",{name:"Collection",exact:true});
 await collection.click();
 await collection.fill("gho");
 await expect(page.getByRole("option",{name:"Ghosts",exact:true})).toBeVisible();
 await expect(page.getByRole("option",{name:"Cats",exact:true})).toHaveCount(0);
 await collection.press("Enter");
 await expect(page).toHaveURL(/collection=roh/);
 await expect(collection).toHaveValue("Ghosts");
 await collection.click();
 await collection.fill("no-match");
 await expect(page.getByText("No matching collections",{exact:true})).toBeVisible();
 await collection.press("Escape");
 await expect(collection).toHaveValue("Ghosts");
 const sort=page.getByRole("combobox",{name:"Sort by",exact:true});
 await expect(sort).toHaveAttribute("readonly","");
 await sort.press("ArrowDown");
 await sort.press("ArrowDown");
 await sort.press("Enter");
 await expect(page).toHaveURL(/sort=low/);
 await sort.click();
 await page.screenshot({path:"/tmp/nilart-dropdown-desktop.png",fullPage:true});
 await sort.press("Escape");
});

test("Persian autocomplete works inside the mobile filter dialog",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/fa/shop");
 await page.locator(".shop-mobile-filter").click();
 const sheet=page.locator("dialog[open]");
 const collection=sheet.getByRole("combobox",{name:"کالکشن",exact:true});
 await collection.click();
 await collection.fill("گربه");
 await expect(sheet.getByRole("option",{name:"گربه",exact:true})).toBeVisible();
 await collection.press("Escape");
 await expect(sheet).toBeVisible();
 await collection.click();
 await collection.fill("گربه");
 await page.screenshot({path:"/tmp/nilart-dropdown-mobile.png",fullPage:true});
 await collection.press("Enter");
 await expect(page).not.toHaveURL(/collection=gorbe/);
 await sheet.getByRole("button",{name:"اعمال فیلترها",exact:true}).click();
 await expect(page).toHaveURL(/collection=gorbe/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
