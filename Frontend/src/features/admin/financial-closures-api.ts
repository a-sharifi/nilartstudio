import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),version=z.number().int().nonnegative()
const command=z.object({expected_version:version,request_version:version,payment_version:version,inquiry_id:uuid,reason:z.string().trim().min(5).max(1000)})
const plan=z.object({order_id:uuid,request_id:uuid,expected_version:version,request_version:version,payment_id:uuid.nullable(),payment_version:version.nullable(),inquiry_id:uuid.nullable(),eligible:z.boolean(),closed:z.boolean(),issue:z.string().nullable()})
const receipt=z.object({id:uuid,request_id:uuid,order_id:uuid,inquiry_id:uuid,actor_id:uuid,intent:command,result:z.object({order_id:uuid,order_version:version,request_version:version,payment_version:version,payment_status:z.literal('failed'),refund_issued:z.literal(false)}),created_at:z.iso.datetime({offset:true})})
export type FinancialClosurePlan=z.infer<typeof plan>
export type FinancialClosureCommand=z.infer<typeof command>
export type FinancialClosureReceipt=z.infer<typeof receipt>
const base='/api/v1/admin/order-requests'
function checked(raw:unknown,id:string,key:string,body:FinancialClosureCommand){const r=receipt.parse(raw);if(r.id!==key||r.request_id!==id||r.order_id!==r.result.order_id||r.inquiry_id!==body.inquiry_id||r.result.order_version!==body.expected_version+1||r.result.request_version!==body.request_version+1||r.result.payment_version!==body.payment_version||Object.keys(body).some(k=>r.intent[k as keyof typeof body]!==body[k as keyof typeof body]))throw new Error('result_unknown');return r}
export const financialClosuresApi={
 async plan(id:string){const r=plan.parse(await privateRequest(`${base}/${id}/financial-closure-plan`));if(r.request_id!==id)throw new Error('result_unknown');return r},
 async history(id:string){const r=z.array(receipt).parse(await privateRequest(`${base}/${id}/financial-closures`));if(r.some(x=>x.request_id!==id))throw new Error('result_unknown');return r},
 async saved(id:string,key:string,body:FinancialClosureCommand){return checked(await privateRequest(`${base}/${id}/financial-closures/${key}`),id,key,body)},
 async save(id:string,key:string,input:FinancialClosureCommand){const body=command.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/financial-closures/${key}`,'PUT',body)}catch(e){const code=e instanceof Error?e.message:'';if(code.startsWith('financial_closure_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw e;throw new Error('result_unknown')}try{return checked(raw,id,key,body)}catch{throw new Error('result_unknown')}}
}
