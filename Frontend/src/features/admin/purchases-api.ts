import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),amount=z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/),integer=z.number().int().nonnegative()
export const purchaseLine=z.object({id:uuid,kind:z.enum(["material","sku"]),reference_id:uuid,quantity:amount,unit_price:amount,discount:amount,supplier_acquisition_cost:amount})
export const purchaseContent=z.object({supplier_id:uuid,document_number:z.string().trim().min(1).max(100),document_date:z.iso.date(),currency:z.literal("IRT"),notes:z.string().trim().max(2000),lines:z.array(purchaseLine).min(1).max(100)})
const line=purchaseLine.extend({code:z.string(),title_fa:z.string(),title_en:z.string(),unit:z.string(),total:amount})
const balance=z.object({received:amount,returned:amount,received_value:amount,credited:amount})
const record=z.object({id:uuid,supplier_id:uuid,status:z.enum(["draft","posted","cancelled"]),content:purchaseContent.extend({supplier_name_fa:z.string(),supplier_name_en:z.string(),lines:z.array(line)}),state:z.object({lines:z.record(z.string(),balance),total:amount,liability:amount,movements:z.array(z.object({movement_id:uuid,position_id:uuid,quantity_delta:z.string(),value_delta:z.string(),supplier_credit:amount.nullable().optional(),valuation_difference:z.string().nullable().optional()}))}),version:z.number().int().positive(),updated_at:z.iso.datetime({offset:true})})
export const purchaseCommand=z.object({expected_version:integer,action:z.enum(["draft","post","receive","return","cancel"]),content:purchaseContent.nullable(),lines:z.array(z.object({line_id:uuid,quantity:amount})),receipt_id:uuid.nullable(),reason:z.string().trim().min(1).max(1000)})
const event=z.object({id:uuid,purchase_id:uuid,actor_id:uuid,version:z.number().int().positive(),action:z.string(),intent:purchaseCommand,result:record,created_at:z.iso.datetime({offset:true})})
export type Purchase=z.infer<typeof record>
export type PurchaseContent=z.infer<typeof purchaseContent>
export type PurchaseLine=z.infer<typeof purchaseLine>
export type PurchaseCommand=z.infer<typeof purchaseCommand>
export type PurchaseEvent=z.infer<typeof event>
const base="/api/v1/admin/procurement/purchases"
function scope(raw:unknown,id:string,key?:string){const e=event.parse(raw);if(e.purchase_id!==id||e.result.id!==id||(key&&e.id!==key)||e.version!==e.intent.expected_version+1||e.version!==e.result.version||e.action!==e.intent.action)throw new Error("result_unknown");return e}
export const purchasesApi={
 async list(q:string,status:string,cursor?:string){const query=new URLSearchParams({q});if(status)query.set("status",status);if(cursor)query.set("cursor",cursor);return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${query}`))},
 async detail(id:string){const r=record.parse(await privateRequest(`${base}/${id}`));if(r.id!==id)throw new Error("result_unknown");return r},
 async history(id:string,before?:number){const r=z.object({items:z.array(event),next_before_version:integer.nullable()}).parse(await privateRequest(`${base}/${id}/events${before?`?before=${before}`:""}`));r.items.forEach(e=>scope(e,id));return r},
 async receipt(id:string,key:string){return scope(await privateRequest(`${base}/${id}/commands/${key}`),id,key)},
 async save(id:string,key:string,intent:PurchaseCommand){const body=purchaseCommand.parse(intent);const raw=await privateRequest(`${base}/${id}/commands/${key}`,"PUT",body);try{const e=scope(raw,id,key);if(JSON.stringify(e.intent)!==JSON.stringify(body))throw new Error();return e}catch{throw new Error("result_unknown")}},
 async statement(id:string,cursor?:string){const q=new URLSearchParams();if(cursor)q.set("cursor",cursor);return z.object({supplier_id:uuid,currency:z.literal("IRT"),purchase_liability:amount,payments_included:z.literal(false),items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`/api/v1/admin/procurement/suppliers/${id}/purchase-statement?${q}`))}
}
