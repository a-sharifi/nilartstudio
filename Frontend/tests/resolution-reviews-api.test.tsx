import {afterEach,expect,it,vi} from 'vitest'
import {resolutionReviewsApi} from '../src/features/admin/resolution-reviews-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222',actor='33333333-3333-4333-8333-333333333333'
const body={expected_version:3,order_version:5,reason:'Staff opens shortage review'}
const receipt={id:key,order_id:id,request_id:key,actor_id:actor,intent:body,result:{order_version:6,request_version:0,status:'submitted',initiated_by_staff:true},created_at:'2026-10-20T12:00:00Z'}
afterEach(()=>vi.resetAllMocks())
it('confirms the exact staff-originated review without confusing it with approval',async()=>{vi.mocked(privateRequest).mockResolvedValue(receipt);await expect(resolutionReviewsApi.save(id,key,body)).resolves.toMatchObject({request_id:key});for(const wrong of [{...receipt,id},{...receipt,order_id:actor},{...receipt,request_id:actor},{...receipt,intent:{...body,reason:'Other reason'}},{...receipt,result:{...receipt.result,status:'approved'}},{...receipt,result:{...receipt.result,initiated_by_staff:false}}]){vi.mocked(privateRequest).mockResolvedValue(wrong);await expect(resolutionReviewsApi.save(id,key,body)).rejects.toThrow('result_unknown')}})
it('retains uncertain operations for lookup and preserves definitive conflicts',async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error('service_unavailable'));await expect(resolutionReviewsApi.save(id,key,body)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockRejectedValue(new Error('resolution_active_request_exists'));await expect(resolutionReviewsApi.save(id,key,body)).rejects.toThrow('resolution_active_request_exists');vi.mocked(privateRequest).mockResolvedValue(receipt);await expect(resolutionReviewsApi.saved(id,key,body)).resolves.toMatchObject({id:key})})
