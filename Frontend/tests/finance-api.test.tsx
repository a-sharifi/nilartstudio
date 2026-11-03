import {afterEach,expect,it,vi} from "vitest"
import {financeApi,canonical,type FinanceIntent} from "../src/features/admin/finance-api"
import {privateRequest} from "../src/features/admin/identity-api"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
const id="11111111-1111-4111-8111-111111111111",key="22222222-2222-4222-8222-222222222222"
const body={expected_version:0,content:{code:"CASH",title_fa:"صندوق",title_en:"Cash",kind:"cash" as const,active:true},opening_amount:"0",opening_date:"2026-10-19",reason:"Counted opening"}
const intent:FinanceIntent={area:"account",target:id,body}
const receipt={id:key,actor_id:id,area:"account",target_id:id,intent:body,result:{accounts:[{...body.content,id,currency:"IRT",balance:"0.000000",version:1}],document:null},created_at:"2026-10-19T12:00:00Z"}
afterEach(()=>vi.resetAllMocks())
it("recognizes reordered receipt JSON without weakening exact intent matching",async()=>{expect(canonical({b:1,a:{z:2,x:3}})).toBe(canonical({a:{x:3,z:2},b:1}));vi.mocked(privateRequest).mockResolvedValue({...receipt,intent:{reason:body.reason,content:body.content,opening_date:body.opening_date,opening_amount:"0",expected_version:0}});await expect(financeApi.save(key,intent)).resolves.toMatchObject({id:key});for(const invalid of [{...receipt,id},{...receipt,target_id:key},{...receipt,intent:{...body,opening_amount:"1"}},{...receipt,result:{accounts:[],document:null}}]){vi.mocked(privateRequest).mockResolvedValue(invalid);await expect(financeApi.save(key,intent)).rejects.toThrow("result_unknown")}})
it("preserves uncertainty after connection or server failure and distinguishes rejected writes",async()=>{for(const message of ["internal_error","Failed to fetch"]){vi.mocked(privateRequest).mockRejectedValue(new Error(message));await expect(financeApi.save(key,intent)).rejects.toThrow("result_unknown")}vi.mocked(privateRequest).mockRejectedValue(new Error("finance_version_conflict"));await expect(financeApi.save(key,intent)).rejects.toThrow("finance_version_conflict")})
it("scopes recovery and keeps exact export dates and pagination filters",async()=>{vi.mocked(privateRequest).mockResolvedValue({...receipt,target_id:key});await expect(financeApi.saved(key,intent)).rejects.toThrow();vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null});await financeApi.documents("F-100","expense",id);expect(String(vi.mocked(privateRequest).mock.calls.at(-1)?.[0])).toContain("kind=expense&cursor=");expect(financeApi.exportUrl("2026-10-01","2026-10-19")).toBe("/api/v1/admin/finance/export?from_date=2026-10-01&to_date=2026-10-19")})
it('accepts historical document intent without optional opening fields but binds opening proof exactly',async()=>{
 const documentBody={kind:'payment' as const,document_number:'D-1',document_date:'2026-10-20',amount:'10',source_account_id:id,target_account_id:null,expected_versions:{[id]:1},purchase_id:null,expected_purchase_version:null,reverses_id:null,description:'Recorded cash',supporting_reference:'Evidence',category:'',reason:'Confirmed'}
 const doc={...documentBody,id:key,effect_kind:'payment',currency:'IRT',reversed_by:null,allocation_amount:null,actor_id:id,created_at:'2026-10-20T12:00:00Z',lines:[]}
 const saved={id:key,actor_id:id,area:'document',target_id:key,intent:documentBody,result:{accounts:[],document:doc},created_at:'2026-10-20T12:00:00Z'}
 vi.mocked(privateRequest).mockResolvedValue(saved)
 await expect(financeApi.saved(key,{area:'document',target:key,body:{...documentBody,opening_event_id:null,expected_opening_settlement_version:null}})).resolves.toMatchObject({id:key})
 await expect(financeApi.saved(key,{area:'document',target:key,body:{...documentBody,opening_event_id:id,expected_opening_settlement_version:0}})).rejects.toThrow('result_unknown')
})
