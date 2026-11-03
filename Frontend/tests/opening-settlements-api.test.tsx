import {afterEach,expect,it,vi} from 'vitest'
import {openingSettlementsApi} from '../src/features/admin/opening-settlements-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',event='22222222-2222-4222-8222-222222222222'
const plan={supplier_id:id,supplier_code:'S-1',title_fa:'تأمین',title_en:'Supplier',currency:'IRT',configured:true,opening_event_id:event,opening_version:2,opening_amount:'100',paid_net:'40',outstanding:'60',settlement_version:1}
afterEach(()=>vi.resetAllMocks())
it('retains authoritative opening and settlement versions and exact amounts',async()=>{vi.mocked(privateRequest).mockResolvedValue(plan);await expect(openingSettlementsApi.plan(id)).resolves.toEqual(plan);expect(vi.mocked(privateRequest).mock.calls[0][0]).toBe(`/api/v1/admin/finance/suppliers/${id}/opening/settlement`)})
it('never substitutes zero for unconfigured opening or accepts another supplier',async()=>{vi.mocked(privateRequest).mockResolvedValue({...plan,configured:false,opening_event_id:null,opening_version:null,opening_amount:null,outstanding:null,paid_net:'0',settlement_version:0});expect((await openingSettlementsApi.plan(id)).outstanding).toBeNull();for(const invalid of [{...plan,supplier_id:event},{...plan,configured:false},{...plan,outstanding:null}]){vi.mocked(privateRequest).mockResolvedValue(invalid);await expect(openingSettlementsApi.plan(id)).rejects.toThrow()}})
it('preserves bounded history cursor and supplier scope',async()=>{vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null});await openingSettlementsApi.history(id,event);expect(vi.mocked(privateRequest).mock.calls[0][0]).toBe(`/api/v1/admin/finance/suppliers/${id}/opening/settlements?cursor=${event}`)})
