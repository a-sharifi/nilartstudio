import {z} from 'zod'
import {privateRequest} from './identity-api'
import {stockComponent} from '../payments/stock-review'
const uuid=z.string().uuid(),date=z.iso.datetime({offset:true})
const allocation=z.object({order_id:uuid,components:z.array(stockComponent),state:z.enum(['reserved','committed','released','shortage']),shipped:z.record(z.string(),z.number().int().nonnegative()).default({}),version:z.number().int().positive(),settings_version:z.number().int().positive(),reservation_minutes:z.number().int().positive(),expires_at:date,updated_at:date})
const item=allocation.extend({reference:z.string(),payment:z.string()})
const detail=z.object({order_id:uuid,reference:z.string(),allocation:allocation.nullable(),positions:z.array(z.object({position_id:uuid,required:z.number().int().positive(),held:z.number().int().nonnegative(),available:z.string(),issue:z.string().nullable()})),issue:z.string().nullable()})
const command=z.object({expected_version:z.number().int().positive(),reason:z.string().trim().min(1).max(1000)})
const event=z.object({id:uuid,order_id:uuid,actor_id:uuid.nullable(),version:z.number().int().positive(),action:z.string(),reason:z.string(),intent:z.record(z.string(),z.unknown()),result:allocation,changes:z.array(z.record(z.string(),z.unknown())),created_at:date})
export type OrderStock=z.infer<typeof detail>
export type StockItem=z.infer<typeof item>
export type StockEvent=z.infer<typeof event>
export type StockCommand=z.infer<typeof command>
function receipt(raw:unknown,id:string,key:string,body:StockCommand){const r=event.parse(raw);if(r.id!==key||r.order_id!==id||r.result.order_id!==id||r.version!==body.expected_version+1||r.result.version!==r.version||r.intent.expected_version!==body.expected_version||r.intent.reason!==body.reason||r.reason!==body.reason||!['commit','shortage'].includes(r.action)||r.result.state!==(r.action==='commit'?'committed':'shortage'))throw new Error('result_unknown');return r}
const base='/api/v1/admin/order-stock'
export const orderStockApi={
 async list(q:string,state:string,cursor?:string){const p=new URLSearchParams({q});if(state)p.set('state',state);if(cursor)p.set('cursor',cursor);return z.object({items:z.array(item),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${p}`))},
 async detail(id:string){const r=detail.parse(await privateRequest(`${base}/${id}`));if(r.order_id!==id||(r.allocation&&(r.allocation.order_id!==id||r.allocation.components.some(c=>c.quantity<=0))))throw new Error('result_unknown');return r},
 async history(id:string,before?:number){const r=z.object({items:z.array(event),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${id}/events${before?`?before=${before}`:''}`));if(r.items.some(e=>e.order_id!==id||e.result.order_id!==id))throw new Error('result_unknown');return r},
 async saved(id:string,key:string,body:StockCommand){return receipt(await privateRequest(`${base}/${id}/commands/${key}`),id,key,body)},
 async save(id:string,key:string,input:StockCommand){const body=command.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/commands/${key}`,'PUT',body)}catch(error){const code=error instanceof Error?error.message:'';if(code.startsWith('order_stock_')||['permission_denied','unauthenticated','csrf_invalid','origin_invalid','validation_error'].includes(code))throw error;throw new Error('result_unknown')}try{return receipt(raw,id,key,body)}catch{throw new Error('result_unknown')}}
}
