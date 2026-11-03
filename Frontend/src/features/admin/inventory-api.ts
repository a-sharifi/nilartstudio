import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),positive=z.number().int().positive(),number=z.string().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/),signed=z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/)
export const stockCommand=z.object({kind:z.enum(["sku","material","artwork"]),reference_id:uuid,expected_version:z.number().int().nonnegative(),action:z.enum(["opening","increase","decrease","waste","threshold","reverse","revalue"]),quantity:number,value:number.nullable(),threshold:number.nullable(),reverses_id:uuid.nullable(),reason:z.string().trim().min(1).max(1000)})
const position=z.object({id:uuid,kind:z.enum(["sku","material","artwork"]),reference_id:uuid,code:z.string(),title_fa:z.string(),title_en:z.string(),unit:z.string(),quantity:signed,reserved:signed,available:signed,value:signed,average_cost:signed.nullable(),threshold:signed.nullable(),version:positive})
const movement=z.object({source_document_kind:z.enum(["purchase","production","fulfillment","marketplace"]).nullable().optional(),source_document_id:uuid.nullable().optional(),source_event_id:uuid.nullable().optional(),id:uuid,position_id:uuid,actor_id:uuid,kind:z.string(),expected_version:z.number().int().nonnegative(),version:positive,quantity_delta:signed,value_delta:signed,quantity_after:signed,value_after:signed,threshold_after:signed.nullable(),reverses_id:uuid.nullable(),reason:z.string(),intent:stockCommand.extend({value:signed.nullable()}),created_at:z.iso.datetime({offset:true})})
const choice=z.object({id:uuid,code:z.string(),title_fa:z.string(),title_en:z.string(),unit:z.string()})
export type StockCommand=z.infer<typeof stockCommand>
export type StockPosition=z.infer<typeof position>
export type StockMovement=z.infer<typeof movement>
export type StockChoice=z.infer<typeof choice>
const base="/api/v1/admin/inventory"
function scoped(raw:unknown,key?:string){const r=movement.parse(raw);const incoming=["purchase_receipt","production_material_return","production_output","fulfillment_return"],outgoing=["purchase_return","production_issue","fulfillment_dispatch","marketplace_dispatch"];const sourceAction=r.source_document_id?!!r.source_event_id&&(incoming.includes(r.kind)?["opening","increase"].includes(r.intent.action):outgoing.includes(r.kind)&&r.intent.action==="decrease"):r.kind===r.intent.action;if((r.source_document_kind&&!r.kind.startsWith(r.source_document_kind+"_"))||(key&&r.id!==key)||r.version!==r.expected_version+1||!sourceAction||r.reason!==r.intent.reason||r.expected_version!==r.intent.expected_version)throw new Error("result_unknown");return r}

export const inventoryApi={
 async waste(q:string,cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set("cursor",cursor);return z.object({items:z.array(z.object({movement,code:z.string(),title_fa:z.string(),title_en:z.string(),unit:z.string(),reversed:z.boolean()})),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/waste?${p}`))},
 async list(q:string,kind:string,low:boolean,cursor?:string){const p=new URLSearchParams({q,low:String(low)});if(kind)p.set("kind",kind);if(cursor)p.set("cursor",cursor);return z.object({items:z.array(position),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${p}`))},
 async detail(id:string){const r=position.parse(await privateRequest(`${base}/positions/${id}`));if(r.id!==id)throw new Error("result_unknown");return r},
 async choices(kind:string,q:string,cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set("cursor",cursor);return z.object({items:z.array(choice),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/choices/${kind}?${p}`))},
 async history(id:string,before?:number){const p=z.object({items:z.array(movement),next_before_version:positive.nullable()}).parse(await privateRequest(`${base}/positions/${id}/movements${before?`?before=${before}`:""}`));p.items.forEach(r=>{scoped(r);if(r.position_id!==id)throw new Error("result_unknown")});return p},
 async receipt(key:string){return scoped(await privateRequest(`${base}/commands/${key}`),key)},
 async save(key:string,intent:StockCommand){const raw=await privateRequest(`${base}/commands/${key}`,"PUT",intent);try{const r=scoped(raw,key);if(JSON.stringify(r.intent)!==JSON.stringify(stockCommand.parse(intent)))throw new Error();return r}catch{throw new Error("result_unknown")}},
}
