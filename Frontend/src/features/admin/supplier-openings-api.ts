import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),version=z.number().int().nonnegative(),signed=z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/)
export const openingCommand=z.object({currency:z.literal('IRT'),expected_version:version,amount:z.string().regex(/^-?(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/),as_of_date:z.iso.date(),corrects_id:uuid.nullable(),source_reference:z.string().trim().min(3).max(500),excludes_recorded_activity:z.literal(true),reason:z.string().trim().min(5).max(1000)})
const receipt=z.object({id:uuid,supplier_id:uuid,actor_id:uuid,version:version.min(1),intent:openingCommand,result:z.object({supplier_id:uuid,version:version.min(1),currency:z.literal('IRT'),amount:signed,delta:signed,as_of_date:z.iso.date(),corrects_id:uuid.nullable(),cash_moved:z.literal(false),stock_moved:z.literal(false)}),created_at:z.iso.datetime({offset:true})})
export type SupplierOpeningCommand=z.infer<typeof openingCommand>
export type SupplierOpeningReceipt=z.infer<typeof receipt>
function valid(raw:unknown,id:string){const r=receipt.parse(raw);if(r.supplier_id!==id||r.result.supplier_id!==id||r.version!==r.result.version||r.version!==r.intent.expected_version+1||r.intent.amount!==r.result.amount||r.intent.as_of_date!==r.result.as_of_date||r.intent.corrects_id!==r.result.corrects_id)throw new Error('result_unknown');return r}
function checked(raw:unknown,id:string,key:string,body:SupplierOpeningCommand){const r=valid(raw,id);if(r.id!==key||Object.keys(body).some(k=>r.intent[k as keyof typeof body]!==body[k as keyof typeof body]))throw new Error('result_unknown');return r}
const base='/api/v1/admin/finance/suppliers'
export const supplierOpeningsApi={
 async current(id:string){const raw=await privateRequest(`${base}/${id}/opening`);return raw===null?null:valid(raw,id)},
 async history(id:string,before?:number){const raw=z.object({items:z.array(z.unknown()),next_before_version:version.min(1).nullable()}).parse(await privateRequest(`${base}/${id}/opening/history${before?'?before='+before:''}`));return {...raw,items:raw.items.map(r=>valid(r,id))}},
 async saved(id:string,key:string,body:SupplierOpeningCommand){return checked(await privateRequest(`${base}/${id}/opening/commands/${key}`),id,key,body)},
 async save(id:string,key:string,input:SupplierOpeningCommand){const body=openingCommand.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/opening/commands/${key}`,'PUT',body)}catch(e){const code=e instanceof Error?e.message:'';if(code.startsWith('supplier_opening_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw e;throw new Error('result_unknown')}try{return checked(raw,id,key,body)}catch{throw new Error('result_unknown')}}
}
