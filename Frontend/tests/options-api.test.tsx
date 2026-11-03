import {describe,expect,it,vi,beforeEach} from "vitest"
import {optionDocument,optionsApi,type OptionRecord,type SKUMapping} from "../src/features/admin/options-api"
import {privateRequest} from "../src/features/admin/identity-api"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
const product="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-000000000002",value="00000000-0000-4000-8000-000000000003",configuration="00000000-0000-4000-8000-000000000004"
const doc={options:[{id,title_fa:"اندازه",title_en:"Size",order:0,values:[{id:value,title_fa:"کوچک",title_en:"Small",order:0}]}],combinations:[{code:"SMALL",selections:[{option_id:id,value_id:value}]}]}
const record:OptionRecord={...doc,product_id:product,configuration_id:configuration,version:2}
const sku:SKUMapping={sku_id:id,product_id:product,code:"SMALL",published:false,version:3,mapping:null}
beforeEach(()=>vi.resetAllMocks())
describe("explicit option document",()=>{
 it("accepts declared combinations and rejects missing or foreign values",()=>{
  expect(optionDocument.safeParse(doc).success).toBe(true)
  expect(optionDocument.safeParse({...doc,combinations:[{code:"SMALL",selections:[]}]}).success).toBe(false)
  expect(optionDocument.safeParse({...doc,combinations:[{code:"SMALL",selections:[{option_id:id,value_id:configuration}]}]}).success).toBe(false)
 })
 it("rejects repeated combinations and identifiers",()=>{
  expect(optionDocument.safeParse({...doc,combinations:[...doc.combinations,{...doc.combinations[0],code:"OTHER"}]}).success).toBe(false)
  expect(optionDocument.safeParse({...doc,options:[...doc.options,doc.options[0]]}).success).toBe(false)
 })
 it("requires both titles",()=>expect(optionDocument.safeParse({...doc,options:[{...doc.options[0],title_fa:" "}]}).success).toBe(false))
})
describe("acknowledged writes",()=>{
 it("sends the expected configuration version",async()=>{
  vi.mocked(privateRequest).mockResolvedValue({...record,version:3})
  await optionsApi.save(record,doc)
  expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/catalog/products/${product}/options`,"PUT",{...doc,version:2})
 })
 it("rejects unchanged versions and another product",async()=>{
  vi.mocked(privateRequest).mockResolvedValue(record)
  await expect(optionsApi.save(record,doc)).rejects.toThrow("result_unknown")
  vi.mocked(privateRequest).mockResolvedValue({...record,product_id:id})
  await expect(optionsApi.read(product)).rejects.toThrow("result_unknown")
 })
 it("pins the mapping to a configuration version and verifies acknowledgement",async()=>{
  vi.mocked(privateRequest).mockResolvedValue({...sku,version:4,mapping:{configuration_id:configuration,configuration_version:2,combination_code:"SMALL",current:true,snapshot:{options:doc.options,combination:doc.combinations[0]}}})
  await optionsApi.map(sku,record)
  expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/catalog/skus/${id}/options`,"PUT",{version:3,mapping:{configuration_id:configuration,configuration_version:2,combination_code:"SMALL"}})
  vi.mocked(privateRequest).mockResolvedValue({...sku,version:4})
  await expect(optionsApi.map(sku,record)).rejects.toThrow("result_unknown")
 })
 it("requires an acknowledged removal",async()=>{
  vi.mocked(privateRequest).mockResolvedValue({...sku,version:4})
  await optionsApi.map(sku,null)
  expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/catalog/skus/${id}/options`,"PUT",{version:3,mapping:null})
 })
})

it("renames a draft with its version and rejects mismatched acknowledgements",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({...sku,code:"NEW-CODE",version:4})
 await optionsApi.rename(sku,"NEW-CODE")
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/catalog/skus/${id}`,"PUT",{version:3,code:"NEW-CODE"})
 vi.mocked(privateRequest).mockResolvedValue({...sku,code:"OTHER",version:4})
 await expect(optionsApi.rename(sku,"NEW-CODE")).rejects.toThrow("result_unknown")
})
it("publishes only an acknowledged visibility change at the expected version",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({...sku,published:true,version:4})
 await optionsApi.publication(sku,true,"Reviewed")
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/catalog/skus/${id}/publication`,"POST",{version:3,published:true,reason:"Reviewed"})
 vi.mocked(privateRequest).mockResolvedValue({...sku,version:4})
 await expect(optionsApi.publication(sku,true,"Reviewed")).rejects.toThrow("result_unknown")
})
it("SKU history rejects rows belonging to another SKU",async()=>{
 const row={id,sku_id:id,product_id:product,actor_id:configuration,previous_version:2,version:3,created_at:"2026-10-13T12:00:00Z",before:null,after:sku}
 vi.mocked(privateRequest).mockResolvedValue({items:[row],next_before_version:3})
 expect((await optionsApi.skuHistory(id,product)).items).toHaveLength(1)
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/catalog/skus/${id}/audits`)
 vi.mocked(privateRequest).mockResolvedValue({items:[{...row,sku_id:configuration}],next_before_version:null})
 await expect(optionsApi.skuHistory(id,product)).rejects.toThrow("result_unknown")
})
