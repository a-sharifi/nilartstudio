import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),integer=z.number().int().nonnegative()
const item=z.object({line_id:uuid,component:integer,healthy:integer,damaged:integer})
export const inspectionInput=z.object({expected_version:integer,shipment_id:uuid,reason:z.string().trim().min(5).max(1000),items:z.array(item).min(1).max(100)})
const receipt=z.object({id:uuid,request_id:uuid,shipment_id:uuid,actor_id:uuid,expected_version:integer,intent:inspectionInput,result:z.object({request_version:integer,order_id:uuid,reason:z.string(),refund_status:z.literal('not_issued'),items:z.array(item.extend({title_fa:z.string().nullable().optional(),title_en:z.string().nullable().optional(),recovered_cost:z.string(),damaged_cost:z.string(),source_movement_id:uuid,position_id:uuid}))}),created_at:z.iso.datetime({offset:true})})
const plan=z.object({request_id:uuid,version:integer,approved:z.boolean(),items:z.array(z.object({shipment_id:uuid,line_id:uuid,component:integer,title_fa:z.string(),title_en:z.string(),remaining:z.number().int().positive()}))})
export type ReturnPlan=z.infer<typeof plan>
export type InspectionInput=z.infer<typeof inspectionInput>
export type InspectionReceipt=z.infer<typeof receipt>
function canonical(v:unknown):string{if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`;if(v&&typeof v==='object')return `{${Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>`${JSON.stringify(k)}:${canonical(x)}`).join(',')}}`;return JSON.stringify(v)}
function confirmed(raw:unknown,id:string,key:string,input:InspectionInput){const value=receipt.parse(raw);if(value.id!==key||value.request_id!==id||value.shipment_id!==input.shipment_id||value.expected_version!==input.expected_version||value.result.request_version!==input.expected_version+1||canonical(value.intent)!==canonical(input)||canonical(value.result.items.map(({line_id,component,healthy,damaged})=>({line_id,component,healthy,damaged})))!==canonical(input.items))throw new Error('result_unknown');return value}
const base='/api/v1/admin/order-requests'
export const returnInspectionsApi={
 async plan(id:string){const r=plan.parse(await privateRequest(`${base}/${id}/return-plan`));if(r.request_id!==id)throw new Error('result_unknown');return r},
 async history(id:string,cursor?:string){const r=z.object({items:z.array(receipt),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/${id}/inspections${cursor?`?cursor=${cursor}`:''}`));if(r.items.some(x=>x.request_id!==id))throw new Error('result_unknown');return r},
 async saved(id:string,key:string,body:InspectionInput){return confirmed(await privateRequest(`${base}/${id}/inspections/${key}`),id,key,body)},
 async save(id:string,key:string,input:InspectionInput){const body=inspectionInput.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/inspections/${key}`,'PUT',body)}catch(error){const code=error instanceof Error?error.message:'';if(code.startsWith('return_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw error;throw new Error('result_unknown')}try{return confirmed(raw,id,key,body)}catch{throw new Error('result_unknown')}}
}
