import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),integer=z.number().int().nonnegative()
export const cancellationCommand=z.object({expected_version:integer,request_version:integer,reason:z.string().trim().min(5).max(1000)})
const plan=z.object({request_id:uuid,order_id:uuid,expected_version:integer,request_version:integer,approved:z.boolean(),payment_confirmed:z.boolean(),financial_closed:z.boolean().default(false),cancellable:z.boolean(),processed:z.boolean(),issue:z.string().nullable().default(null)})
const receipt=z.object({id:uuid,request_id:uuid,order_id:uuid,actor_id:uuid,intent:cancellationCommand,result:z.object({order_id:uuid,order_version:integer,request_version:integer,stock_version:z.number().int().positive(),previous_stock_state:z.enum(['reserved','committed','shortage','released']),cancelled_shipments:z.array(uuid),reservation_event_id:uuid,refund_issued:z.literal(false)}),created_at:z.iso.datetime({offset:true})})
export type CancellationPlan=z.infer<typeof plan>
export type CancellationReceipt=z.infer<typeof receipt>
export type CancellationCommand=z.infer<typeof cancellationCommand>
function checked(raw:unknown,id:string,key:string,body:CancellationCommand){const r=receipt.parse(raw);if(r.id!==key||r.request_id!==id||r.order_id!==r.result.order_id||r.intent.expected_version!==body.expected_version||r.intent.request_version!==body.request_version||r.intent.reason!==body.reason||r.result.order_version!==body.expected_version+1||r.result.request_version!==body.request_version+1)throw new Error('result_unknown');return r}
const base='/api/v1/admin/order-requests'
export const cancellationsApi={
 async plan(id:string){const r=plan.parse(await privateRequest(`${base}/${id}/cancellation-plan`));if(r.request_id!==id)throw new Error('result_unknown');return r},
 async history(id:string){const r=z.array(receipt).parse(await privateRequest(`${base}/${id}/cancellations`));if(r.some(x=>x.request_id!==id))throw new Error('result_unknown');return r},
 async saved(id:string,key:string,body:CancellationCommand){return checked(await privateRequest(`${base}/${id}/cancellations/${key}`),id,key,body)},
 async save(id:string,key:string,input:CancellationCommand){const body=cancellationCommand.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/cancellations/${key}`,'PUT',body)}catch(cause){const code=cause instanceof Error?cause.message:'';if(code.startsWith('cancellation_')||code.startsWith('fulfillment_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw cause;throw new Error('result_unknown')}try{return checked(raw,id,key,body)}catch{throw new Error('result_unknown')}}
}
