import {afterEach,expect,it,vi} from 'vitest'
import {cancellationsApi} from '../src/features/admin/cancellations-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222',order='33333333-3333-4333-8333-333333333333'
const body={expected_version:5,request_version:2,reason:'Approved paid cancellation'}
const receipt={id:key,request_id:id,order_id:order,actor_id:order,intent:body,result:{order_id:order,order_version:6,request_version:3,stock_version:4,previous_stock_state:'committed',cancelled_shipments:[],reservation_event_id:order,refund_issued:false},created_at:'2026-10-20T12:00:00Z'}
afterEach(()=>vi.resetAllMocks())
it('checks the exact cancellation receipt and never claims a refund',async()=>{vi.mocked(privateRequest).mockResolvedValue(receipt);await expect(cancellationsApi.save(id,key,body)).resolves.toMatchObject({id:key});for(const wrong of [{...receipt,id},{...receipt,request_id:order},{...receipt,intent:{...body,reason:'Other reason'}},{...receipt,result:{...receipt.result,order_version:7}},{...receipt,result:{...receipt.result,refund_issued:true}}]){vi.mocked(privateRequest).mockResolvedValue(wrong);await expect(cancellationsApi.save(id,key,body)).rejects.toThrow('result_unknown')}})
it('recovers uncertain writes and preserves definitive conflicts',async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error('service_unavailable'));await expect(cancellationsApi.save(id,key,body)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockRejectedValue(new Error('cancellation_version_conflict'));await expect(cancellationsApi.save(id,key,body)).rejects.toThrow('cancellation_version_conflict');vi.mocked(privateRequest).mockResolvedValue(receipt);await expect(cancellationsApi.saved(id,key,body)).resolves.toMatchObject({id:key})})
