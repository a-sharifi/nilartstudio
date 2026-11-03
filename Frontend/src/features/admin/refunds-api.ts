import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),amount=z.string().regex(/^\d+(?:\.\d{1,2})?$/),integer=z.number().int().nonnegative(),currency=z.enum(['IRT','IRR'])
const item=z.object({line_id:uuid,component:integer,quantity:z.number().int().positive()})
const allocation=item.extend({title_fa:z.string(),title_en:z.string(),amount})
export const selection=z.object({request_id:uuid,items:z.array(item),include_shipping:z.boolean(),include_tax:z.boolean(),close_request:z.boolean()})
const quote=z.object({selection,expected_version:integer,request_version:integer,currency,items:z.array(allocation),shipping_amount:amount,tax_amount:amount,amount,quote_fingerprint:z.string().regex(/^[a-f0-9]{64}$/)})
export const refundCommand=selection.extend({expected_version:integer,request_version:integer,expected_amount:amount,quote_fingerprint:z.string().regex(/^[a-f0-9]{64}$/),sandbox_confirmed:z.literal(true),reason:z.string().trim().min(5).max(1000)})
const outcome=z.object({simulation:z.literal('local_sandbox'),reference:z.string(),original_payment_reference:z.string(),order_reference:z.string(),currency,items:z.array(allocation),shipping_amount:amount,tax_amount:amount,amount,refunded_amount:amount,payment_status:z.enum(['paid','partially_refunded','refunded']),order_version:integer,request_version:integer,request_completed:z.boolean()})
const receipt=z.object({id:uuid,order_id:uuid,request_id:uuid,payment_id:uuid,actor_id:uuid,intent:refundCommand,result:outcome,created_at:z.iso.datetime({offset:true})})
const plan=z.object({kind:z.enum(["return","cancellation"]).default("return"),request_id:uuid,order_id:uuid,reference:z.string(),version:integer,request_version:integer,currency,shipping_remaining:amount,tax_remaining:amount,items:z.array(z.object({line_id:uuid,component:integer,title_fa:z.string(),title_en:z.string(),remaining:z.number().int().positive(),remaining_amount:amount}))})
export type RefundSelection=z.infer<typeof selection>
export type RefundQuote=z.infer<typeof quote>
export type RefundCommand=z.infer<typeof refundCommand>
export type RefundReceipt=z.infer<typeof receipt>
export type RefundPlan=z.infer<typeof plan>
export type RefundChoice={id:string;order_id:string;reference:string}
function canonical(v:unknown):string{if(Array.isArray(v))return `[${v.map(canonical).join(',')}]`;if(v&&typeof v==='object')return `{${Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>`${JSON.stringify(k)}:${canonical(x)}`).join(',')}}`;return JSON.stringify(v)}
function checked(raw:unknown,key:string,body:RefundCommand){const r=receipt.parse(raw);if(r.id!==key||r.request_id!==body.request_id||canonical(r.intent)!==canonical(body)||r.result.amount!==body.expected_amount||r.result.order_version!==body.expected_version+1||r.result.request_version!==body.request_version+1||r.result.reference!==`SIMULATED-REFUND-${key}`||r.result.request_completed!==body.close_request||canonical(r.result.items.map(({line_id,component,quantity})=>({line_id,component,quantity})))!==canonical(body.items))throw new Error('result_unknown');return r}
const base='/api/v1/admin/refunds'
export const refundsApi={
 async choices(q:string,cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set('cursor',cursor);return z.object({items:z.array(z.object({id:uuid,order_id:uuid,reference:z.string()})),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/requests?${p}`))},
 async plan(id:string){const r=plan.parse(await privateRequest(`${base}/requests/${id}`));if(r.request_id!==id)throw new Error('result_unknown');return r},
 async quote(input:RefundSelection){const body=selection.parse(input),r=quote.parse(await privateRequest(`${base}/quotes`,'POST',body));if(canonical(r.selection)!==canonical(body)||canonical(r.items.map(({line_id,component,quantity})=>({line_id,component,quantity})))!==canonical(body.items))throw new Error('result_unknown');return r},
 async list(q:string,request?:string,cursor?:string){const p=new URLSearchParams({q});if(request)p.set('request_id',request);if(cursor)p.set('cursor',cursor);const r=z.object({items:z.array(receipt),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${p}`));if(request&&r.items.some(x=>x.request_id!==request))throw new Error('result_unknown');return r},
 async saved(key:string,body:RefundCommand){return checked(await privateRequest(`${base}/commands/${key}`),key,body)},
 async save(key:string,input:RefundCommand){const body=refundCommand.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/commands/${key}`,'PUT',body)}catch(error){const code=error instanceof Error?error.message:'';if(code.startsWith('refund_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw error;throw new Error('result_unknown')}try{return checked(raw,key,body)}catch{throw new Error('result_unknown')}}
}
