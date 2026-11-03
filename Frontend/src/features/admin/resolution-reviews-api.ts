import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),integer=z.number().int().nonnegative()
export const resolutionCommand=z.object({expected_version:z.number().int().positive(),order_version:integer,reason:z.string().trim().min(5).max(1000)})
const plan=z.object({order_id:uuid,order_version:integer,stock_version:z.number().int().positive().nullable(),active_request_id:uuid.nullable(),eligible:z.boolean(),issue:z.string().nullable()})
const receipt=z.object({id:uuid,order_id:uuid,request_id:uuid,actor_id:uuid,intent:resolutionCommand,result:z.object({order_version:integer,request_version:z.literal(0),status:z.literal('submitted'),initiated_by_staff:z.literal(true)}),created_at:z.iso.datetime({offset:true})})
export type ResolutionPlan=z.infer<typeof plan>
export type ResolutionCommand=z.infer<typeof resolutionCommand>
function checked(raw:unknown,id:string,key:string,body:ResolutionCommand){const r=receipt.parse(raw);if(r.id!==key||r.order_id!==id||r.request_id!==key||r.intent.expected_version!==body.expected_version||r.intent.order_version!==body.order_version||r.intent.reason!==body.reason||r.result.order_version!==body.order_version+1)throw new Error('result_unknown');return r}
const base='/api/v1/admin/order-stock'
export const resolutionReviewsApi={
 async plan(id:string){const r=plan.parse(await privateRequest(`${base}/${id}/resolution-plan`));if(r.order_id!==id)throw new Error('result_unknown');return r},
 async saved(id:string,key:string,body:ResolutionCommand){return checked(await privateRequest(`${base}/${id}/resolution-reviews/${key}`),id,key,body)},
 async save(id:string,key:string,input:ResolutionCommand){const body=resolutionCommand.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/resolution-reviews/${key}`,'PUT',body)}catch(cause){const code=cause instanceof Error?cause.message:'';if(code.startsWith('resolution_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw cause;throw new Error('result_unknown')}try{return checked(raw,id,key,body)}catch{throw new Error('result_unknown')}}
}
