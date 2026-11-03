import {afterEach,expect,it,vi} from 'vitest'
import {orderStockApi} from '../src/features/admin/order-stock-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333'
const allocation={order_id:id,components:[],state:'committed',version:4,settings_version:1,reservation_minutes:15,expires_at:'2026-10-19T12:00:00Z',updated_at:'2026-10-19T13:00:00Z'}
const body={expected_version:3,reason:'Reviewed replenishment'}
const event={id:key,order_id:id,actor_id:other,version:4,action:'commit',reason:body.reason,intent:body,result:allocation,changes:[],created_at:allocation.updated_at}
afterEach(()=>vi.resetAllMocks())
it('binds recommit receipt to exact action, order, intent, version and result',async()=>{vi.mocked(privateRequest).mockResolvedValue(event);await expect(orderStockApi.save(id,key,body)).resolves.toMatchObject({id:key});for(const wrong of [{...event,id:other},{...event,order_id:other},{...event,intent:{...body,reason:'Different'}},{...event,result:{...allocation,state:'shortage'}},{...event,result:{...allocation,version:3}},{...event,reason:'Different'}]){vi.mocked(privateRequest).mockResolvedValue(wrong);await expect(orderStockApi.save(id,key,body)).rejects.toThrow('result_unknown')}})
it('retains ambiguous writes and checks recovered receipts and cross-order history',async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error('service_unavailable'));await expect(orderStockApi.save(id,key,body)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockRejectedValue(new Error('order_stock_version_conflict'));await expect(orderStockApi.save(id,key,body)).rejects.toThrow('order_stock_version_conflict');vi.mocked(privateRequest).mockResolvedValue(event);await expect(orderStockApi.saved(id,key,body)).resolves.toMatchObject({id:key});vi.mocked(privateRequest).mockResolvedValue({items:[event],next_before_version:null});await expect(orderStockApi.history(other)).rejects.toThrow('result_unknown')})
