import {render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it} from "vitest"
import {minimumVariantPrices,formatCatalogAmount} from "../src/features/catalog/catalog-price"
import ProductCard from "../src/design/ProductCard"
afterEach(cleanup)
it("selects the cheapest published price per product without using stock or treating null as zero",()=>{
 const prices=minimumVariantPrices([
  {id:"a",product_id:"p",price:null},
  {id:"b",product_id:"p",price:{amount:"185000.000000",currency:"IRT"}},
  {id:"c",product_id:"p",price:{amount:"125000",currency:"IRT"}},
  {id:"d",product_id:"other",price:{amount:"0",currency:"IRT"}},
 ])
 expect(prices.get("p")).toEqual({amount:"125000",currency:"IRT"})
 expect(prices.get("other")?.amount).toBe("0")
 expect(prices.has("missing")).toBe(false)
})
it("compares explicit rial and toman prices exactly and preserves the selected currency",()=>{
 expect(minimumVariantPrices([
  {id:"a",product_id:"p",price:{amount:"1.000001",currency:"IRT"}},
  {id:"b",product_id:"p",price:{amount:"10.000009",currency:"IRR"}},
 ]).get("p")).toEqual({amount:"10.000009",currency:"IRR"})
 expect(formatCatalogAmount("999999999999999999.123456",1)).toBe("999,999,999,999,999,999.123456")
 expect(formatCatalogAmount("125000.000000",0)).toBe("۱۲۵٬۰۰۰")
 expect(()=>minimumVariantPrices([{id:"a",product_id:"p",price:{amount:"-1",currency:"IRT"}}])).toThrow()
})
it("renders the reference starting-price line while keeping availability independent",()=>{
 render(<ProductCard live name="Product" route="/fa/products/product" collection="" options="" language={0} media={null} arrow={null} heart={null} onNavigate={()=>{}} startingPrice={{amount:"125000",currency:"IRT"}} availabilityLabel="موجودی تأیید نشده"/>)
 expect(screen.getByText("۱۲۵٬۰۰۰")).toBeTruthy()
 expect(screen.getByText("۱۲۵٬۰۰۰").parentElement?.textContent).toBe("از ۱۲۵٬۰۰۰ تومان")
 expect(screen.getByText("موجودی تأیید نشده")).toBeTruthy()
 expect(screen.queryByText("ناموجود")).toBeNull()
})
