import {cleanup,fireEvent,render,renderHook,screen,waitFor} from "@testing-library/react"
import {afterEach,expect,test,vi} from "vitest"
import {mapPublishedOptions} from "../src/features/catalog/published-options"
import {useProductDetail,type PublishedSKU} from "../src/features/catalog/product-detail"
import {PublishedProductDetail} from "../src/design/ProductDetailPage"

afterEach(()=>{cleanup();vi.unstubAllGlobals();window.history.replaceState({},'', '/')})
const optionId="00000000-0000-4000-8000-000000000001",small="00000000-0000-4000-8000-000000000002",large="00000000-0000-4000-8000-000000000003"
const product={id:"p",slug:"authored",title_fa:"محصول",title_en:"Authored product",description_fa:"شرح",description_en:"Description",collection_ids:[],category_ids:[]}
const sku:PublishedSKU={id:"s",product_id:"p",code:"AUTHORED-SMALL",price:{amount:"100",currency:"IRT"}}
const snapshot={sku_id:"s",product_id:"p",configuration_id:"00000000-0000-4000-8000-000000000004",configuration_version:1,options:[{id:optionId,title_fa:"اندازه",title_en:"Size",order:0,values:[{id:small,title_fa:"کوچک",title_en:"Small",order:0},{id:large,title_fa:"بزرگ",title_en:"Large",order:1}]}],combination:{code:sku.code,selections:[{option_id:optionId,value_id:small}]}}

test("published snapshots provide bilingual valid choices without enabling unpublished combinations",()=>{
 const options=mapPublishedOptions([snapshot],[sku],product.id)
 render(<PublishedProductDetail catalog={{product,skus:[sku],options,status:"normal",retry:vi.fn()}} language={1} collections={[]} onNavigate={vi.fn()}/>)
 expect(screen.getByRole("radio",{name:/Large/})).toHaveProperty("disabled",true)
 expect(screen.getByRole("heading",{name:"About this product"})).toBeTruthy()
 expect(screen.queryByRole("button",{name:/sheet-count guide/})).toBeNull()
 expect(screen.getByRole("button",{name:"Add to basket"})).toHaveProperty("disabled",true)
 fireEvent.click(screen.getByRole("radio",{name:"Small"}))
 expect(screen.getByText("Small",{selector:".selection-summary"})).toBeTruthy()
 expect(screen.getByText("100 toman")).toBeTruthy()
 expect(screen.getByRole("button",{name:"Add to basket"})).toHaveProperty("disabled",false)
})

test("mixed legacy and historically incompatible definitions retain explicit SKU choices",()=>{
 const other={...sku,id:"s2",code:"OTHER"}
 const mixed=mapPublishedOptions([snapshot,null],[sku,other],product.id)!
 expect(mixed.groups).toEqual([])
 expect(mixed.labels[sku.code].en).toBe("Size: Small")
 const revised={...snapshot,sku_id:other.id,configuration_version:2,options:[{...snapshot.options[0],title_en:"New size"}],combination:{code:other.code,selections:[{option_id:optionId,value_id:large}]}}
 const result=mapPublishedOptions([snapshot,revised],[sku,other],product.id)!
 expect(result.groups).toEqual([])
 expect(result.labels.OTHER.en).toBe("New size: Large")
 expect(mapPublishedOptions([null],[sku],product.id)).toBeUndefined()
 expect(mapPublishedOptions([{...snapshot,options:[],combination:{code:sku.code,selections:[]}}],[sku],product.id)?.labels).toEqual({})
})

test("offer links preselect the published size mapping for their specific variant",()=>{
 window.history.replaceState({},'', '/en/products/authored?sku=s')
 const options=mapPublishedOptions([snapshot],[sku],product.id)
 render(<PublishedProductDetail catalog={{product,skus:[sku],options,status:"normal",retry:vi.fn()}} language={1} collections={[]} onNavigate={vi.fn()}/>)
 expect(screen.getByRole('radio',{name:'Small'})).toHaveProperty('checked',true)
 expect(screen.getByRole('button',{name:'Add to basket'})).toHaveProperty('disabled',false)
 expect(screen.getByText('100 toman')).toBeTruthy()
})

test("foreign identities and invalid selection references are rejected",()=>{
 for(const row of [{...snapshot,product_id:"foreign"},{...snapshot,sku_id:"foreign"},{...snapshot,combination:{...snapshot.combination,code:"wrong"}},{...snapshot,combination:{...snapshot.combination,selections:[]}},{...snapshot,combination:{...snapshot.combination,selections:[{option_id:optionId,value_id:snapshot.configuration_id}]}}])expect(()=>mapPublishedOptions([row],[sku],product.id)).toThrow()
})

test("product loading reads public snapshots and fails closed when the mapping service fails",async()=>{
 const fetch=vi.fn(async(url:string)=>new Response(JSON.stringify(url.endsWith("/options")?snapshot:url.endsWith("/skus")?[sku]:product)))
 vi.stubGlobal("fetch",fetch)
 const view=renderHook(()=>useProductDetail(true,product.slug))
 await waitFor(()=>expect(view.result.current.status).toBe("normal"))
 expect(view.result.current.options?.groups[0].label.en).toBe("Size")
 fetch.mockImplementation(async(url:string)=>url.endsWith("/options")?new Response("",{status:503}):new Response(JSON.stringify(url.endsWith("/skus")?[sku]:product)))
 view.result.current.retry()
 await waitFor(()=>expect(view.result.current.status).toBe("error"))
 expect(view.result.current.skus).toEqual([])
})
