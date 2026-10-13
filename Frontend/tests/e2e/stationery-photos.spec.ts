import {expect,test} from "@playwright/test"
test("downloaded photos appear on notebook cards, galleries and bundles",async({page,request})=>{
 for(const name of ["notebook-pencils","notebook-stack","stationery-flatlay","stationery-desk"]){
  const result=await request.get(`/sample-stationery/${name}.jpg`)
  expect(result.ok()).toBeTruthy()
  expect(result.headers()["content-type"]).toContain("image/jpeg")
 }
 await page.goto("/fa")
 await expect(page.locator("article.product-card").first().locator("img")).toBeVisible()
 await expect(page.locator(".bundle-card").first().locator("img")).toBeVisible()
 for(const slug of ["cats-sketchbook-127gsm","notebook-ghosts","cat-ruled","cat-ruled-hard"]){
  await page.goto(`/en/products/${slug}`)
  const photo=page.locator(".product-gallery .gallery-main img").first()
  await expect(photo).toBeVisible()
  await expect.poll(()=>photo.evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBeTruthy()
 }
 for(const slug of ["cats-bundle","cat-everyday-set","cat-keepsake-set"]){
  await page.goto(`/fa/bundles/${slug}`)
  await expect(page.locator(".bundle-gallery-column .sample-catalog-photo img").first()).toBeVisible()
 }
 await page.setViewportSize({width:390,height:844})
 await page.goto("/fa/products/cats-sketchbook-127gsm")
 await expect(page.locator(".gallery-main img").first()).toBeVisible()
 await expect.poll(()=>page.locator(".gallery-main img").first().evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBeTruthy()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy()
 await page.screenshot({path:"/tmp/nilart-notebook-photo.png"})
})
