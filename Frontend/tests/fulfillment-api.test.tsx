import {afterEach,expect,it,vi} from 'vitest'
import {fulfillmentApi,shipmentCommand} from '../src/features/admin/fulfillment-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222',order='33333333-3333-4333-8333-333333333333'
const body=shipmentCommand.parse({action:'dispatch',order_id:order,expected_version:4,reason:'Reviewed actual parcel',dispatch:{carrier:'Sandbox post',tracking:'TEST',actual_shipping_cost:'10',sandbox_confirmed:true}})
const result={id,order_id:order,version:5,status:'dispatched',content:{quantities:{[id]:1}},state:{},updated_at:'2026-10-19T12:00:00Z'}
const event={id:key,shipment_id:id,actor_id:order,version:5,action:'dispatch',intent:body,result,created_at:result.updated_at}
afterEach(()=>vi.resetAllMocks())
it('validates operation, shipment, order, version, complete intent and transition outcome',async()=>{vi.mocked(privateRequest).mockResolvedValue(event);await expect(fulfillmentApi.save(id,key,body)).resolves.toMatchObject({id:key});for(const wrong of [{...event,id},{...event,result:{...result,order_id:id}},{...event,result:{...result,status:'packed'}},{...event,intent:{...body,dispatch:{...body.dispatch,tracking:'OTHER'}}},{...event,result:{...result,version:4}}]){vi.mocked(privateRequest).mockResolvedValue(wrong);await expect(fulfillmentApi.save(id,key,body)).rejects.toThrow('result_unknown')}})
it('keeps ambiguous operations recoverable while distinguishing conflicts',async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error('service_unavailable'));await expect(fulfillmentApi.save(id,key,body)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockRejectedValue(new Error('fulfillment_version_conflict'));await expect(fulfillmentApi.save(id,key,body)).rejects.toThrow('fulfillment_version_conflict');vi.mocked(privateRequest).mockResolvedValue(event);await expect(fulfillmentApi.saved(id,key,body)).resolves.toMatchObject({id:key})})
