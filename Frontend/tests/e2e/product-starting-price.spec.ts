import {expect,test} from "@playwright/test"
test("home product cards show the cheapest database variant price in both languages",async({page})=>{
 for(const language of ["fa","en"]){
  await page.goto(`/${language}`)
  const card=page.locator("article.product-card").first()
  await expect(card.locator(".product-price")).toHaveText(language==="fa"?"از ۱۲۵٬۰۰۰ تومان":"From 125,000 toman")
  await expect(card.locator(".stock-badge")).toHaveText(language==="fa"?"اطلاعات خرید تأیید نشده":"Purchase details unconfirmed")
 }
 await page.setViewportSize({width:979,height:900})
 await page.goto("/fa")
 await page.locator("article.product-card").first().scrollIntoViewIfNeeded()
 await page.screenshot({path:"/tmp/nilart-product-from-price.png"})
})
test("a price lookup failure preserves browsing without inventing a default price",async({page})=>{
 await page.route("**/api/v1/catalog/skus?*",route=>route.fulfill({status:503,json:{}}))
 await page.goto("/en")
 const card=page.locator("article.product-card").first()
 await expect(card.getByRole("heading",{name:"127 gsm sketchbook",exact:true})).toBeVisible()
 await expect(card.locator(".product-price")).toHaveText("Price unavailable")
})
