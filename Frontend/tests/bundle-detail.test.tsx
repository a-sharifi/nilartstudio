import {describe,expect,it} from "vitest"
import {bundleQuote,displayBundleMoney,selectBundleOption,bundleOptionOffered} from "../src/features/catalog/bundle-detail"
const sku=(amount:string,currency:"IRT"|"IRR"="IRT")=>({id:"sku",product_id:"product",code:"CODE",price:{amount,currency}})
describe("published bundle price preview",()=>{
 it("multiplies component and bundle quantities with exact decimals",()=>{
  const quote=bundleQuote([{sku:sku("185000"),quantity:1},{sku:sku("35000"),quantity:2},{sku:sku("30000"),quantity:1}],{amount:"30000",currency:"IRT"},2)!
  expect(quote.separate).toBe(285000000000n)
  expect(quote.price).toBe(255000000000n)
  expect(quote.total).toBe(510000000000n)
  expect(bundleQuote([{sku:sku("0.1"),quantity:3}],{amount:"0.01",currency:"IRT"},2)?.total).toBe(580000n)
 })
 it("does not guess missing prices or mix currency; caps discounts",()=>{
  expect(bundleQuote([{sku:undefined,quantity:1}],{amount:"1",currency:"IRT"},1)).toBeNull()
  expect(bundleQuote([{sku:sku("1"),quantity:1}],null,1)).toBeNull()
  expect(bundleQuote([{sku:sku("1","IRR"),quantity:1}],{amount:"1",currency:"IRT"},1)).toBeNull()
  expect(bundleQuote([{sku:sku("1"),quantity:1}],{amount:"20",currency:"IRT"},1)?.price).toBe(0n)
  expect(displayBundleMoney(1000100000n,"IRR",1)).toBe("1,000.1 rial")
 })
})

it("reference option changes retain compatible fields and clear invalid dependent choices",()=>{
 const groups=["size","sheets","cover"],combinations=[{selections:{size:"A4",sheets:"50",cover:"3mm"}},{selections:{size:"A6",sheets:"50",cover:"2mm"}}]
 const previous={size:"A4",sheets:"50",cover:"3mm"}
 expect(bundleOptionOffered(previous,"size","A6",groups,combinations)).toBe(true)
 expect(selectBundleOption(previous,"size","A6",groups,combinations)).toEqual({size:"A6",sheets:"50",cover:""})
 expect(bundleOptionOffered({size:"A6",sheets:"50"},"cover","3mm",groups,combinations)).toBe(false)
})
