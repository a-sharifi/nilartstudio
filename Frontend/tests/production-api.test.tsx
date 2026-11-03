import {afterEach,expect,it,vi} from "vitest"
import {productionApi,type BatchCommand} from "../src/features/admin/production-api"
import {privateRequest} from "../src/features/admin/identity-api"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
const id="11111111-1111-4111-8111-111111111111",key="22222222-2222-4222-8222-222222222222"
const content={recipe_id:id,revision_id:key,batch_number:"B-01",production_date:"2026-10-18",target_output:10,notes:""}
const intent:BatchCommand={expected_version:0,action:"draft",content,lines:[],service_line_id:null,service_amount:null,quality:null,write_off_remaining:false,reason:"Workshop approval"}
const record={id,status:"draft",content:{...content,sku_id:id,sku_code:"SKU-A",recipe_version:1,title_fa:"دفتر",title_en:"Notebook",lines:[]},state:{materials:{},services:{},wip:"0",transferred_value:"0",abnormal_loss:"0",cost_complete:false,quality:null,movements:[]},version:1,updated_at:"2026-10-18T12:00:00Z"}
const event={id:key,batch_id:id,actor_id:id,version:1,action:"draft",intent,result:record,created_at:record.updated_at}
afterEach(()=>vi.resetAllMocks())
it("binds production acknowledgment to the exact operation, version and complete intent",async()=>{vi.mocked(privateRequest).mockResolvedValue(event);await expect(productionApi.save(id,key,intent)).resolves.toMatchObject({id:key});for(const invalid of [{...event,id},{...event,batch_id:key},{...event,result:{...record,version:2}},{...event,intent:{...intent,write_off_remaining:true}},{}]){vi.mocked(privateRequest).mockResolvedValue(invalid);await expect(productionApi.save(id,key,intent)).rejects.toThrow("result_unknown")}})
it("keeps historical recovery scoped to its batch and carries loss filters to the next page",async()=>{vi.mocked(privateRequest).mockResolvedValue(event);await expect(productionApi.receipt(key,key)).rejects.toThrow("result_unknown");vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null});await productionApi.list("SKU%","completed",true,key);const url=new URL(String(vi.mocked(privateRequest).mock.calls.at(-1)?.[0]),"http://localhost");expect(Object.fromEntries(url.searchParams)).toEqual({q:"SKU%",status:"completed",losses:"true",cursor:key})})

it("keeps ambiguous server errors recoverable while retaining definitive validation errors",async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error("internal_error"));await expect(productionApi.save(id,key,intent)).rejects.toThrow("result_unknown");vi.mocked(privateRequest).mockRejectedValue(new Error("production_stock_insufficient"));await expect(productionApi.save(id,key,intent)).rejects.toThrow("production_stock_insufficient")})
