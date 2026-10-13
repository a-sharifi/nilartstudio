import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { mapPublishedProduct, mapPublishedSKUs } from "../src/features/catalog/product-detail";
import { PublishedProductDetail } from "../src/design/ProductDetailPage";
const product = {id:"p",slug:"test-product",title_fa:"محصول",title_en:"Product",description_fa:"شرح",description_en:"Description",collection_ids:[],category_ids:[]};
const option = {id:"s",product_id:"p",code:"SKU-EXACT",price:{amount:"123456789012345678.123456",currency:"IRT" as const}};
afterEach(cleanup);
test("product mapping requires descriptions and explicit membership arrays",()=>{
 expect(mapPublishedProduct(product)).toEqual(product);
 expect(()=>mapPublishedProduct({...product,collection_ids:[null]})).toThrow();
});
test("SKU mapping rejects foreign owners, duplicate codes and imprecise money",()=>{
 expect(mapPublishedSKUs([option],"p")[0].price?.amount).toBe(option.price.amount);
 for (const rows of [[{...option,product_id:"other"}],[option,option],[{...option,price:{amount:1,currency:"IRT"}}],[{...option,price:{amount:"-1",currency:"IRT"}}],[{...option,price:{amount:"1.1234567",currency:"IRT"}}],[{...option,price:{amount:"1",currency:"USD"}}]]) expect(()=>mapPublishedSKUs(rows,"p")).toThrow();
});
test("native product detail displays exact published price but never permits purchase",()=>{
 render(<PublishedProductDetail catalog={{product,skus:[option],status:"normal",retry:()=>{}}} language={1} collections={[]} onNavigate={()=>{}}/>);
 fireEvent.click(screen.getByRole("radio",{name:"SKU-EXACT"}));
 expect(screen.getByText(option.price.amount+" toman")).toBeTruthy();
 expect((screen.getByRole("button",{name:"Add to test basket"}) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.queryByText("Cats")).toBeNull();
});
test("products without SKUs remain visible with unknown prices",()=>{
 render(<PublishedProductDetail catalog={{product,skus:[],status:"normal",retry:()=>{}}} language={1} collections={[]} onNavigate={()=>{}}/>);
 expect(screen.getByRole("heading",{name:"Product"})).toBeTruthy();
 expect(screen.getByText("No published options yet.")).toBeTruthy();
 expect(screen.getByText("Price unavailable")).toBeTruthy();
});
test("database presentation validates product-specific media and nonempty galleries",()=>{
 const presentation = {intro:{fa:"نشانک",en:"Bookmark"},about:{fa:"نمونه",en:"Sample"},kind:"bookmark",color:"rose",gallery:[{label:{fa:"نما",en:"Front view"},view:"front"}],specifications:[],delivery:{fa:"ارسال",en:"Delivery"}};
 expect(mapPublishedProduct({...product,presentation}).presentation?.kind).toBe("bookmark");
 expect(()=>mapPublishedProduct({...product,presentation:{...presentation,gallery:[]}})).toThrow();
 expect(()=>mapPublishedProduct({...product,presentation:{...presentation,kind:"unknown"}})).toThrow();
});
