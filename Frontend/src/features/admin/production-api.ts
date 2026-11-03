import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),amount=z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/),count=z.number().int().min(0).max(1000000)
export const batchContent=z.object({recipe_id:uuid,revision_id:uuid,batch_number:z.string().trim().min(1).max(100),production_date:z.iso.date(),target_output:count.min(1),notes:z.string().trim().max(2000)})
const line=z.object({id:uuid,resource_id:uuid,resource_revision_id:uuid,kind:z.enum(["material","service"]),code:z.string(),label:z.string(),unit:z.string(),planned_quantity:amount})
const quality=z.object({healthy_output:count,normal_waste:count,abnormal_damage:count})
const balance=z.object({issued_quantity:amount,issued_value:amount,returned_quantity:amount,returned_value:amount})
const record=z.object({id:uuid,status:z.enum(["draft","running","completed","cancelled"]),content:batchContent.extend({sku_id:uuid,sku_code:z.string(),recipe_version:z.number().int().positive(),title_fa:z.string(),title_en:z.string(),lines:z.array(line)}),state:z.object({materials:z.record(z.string(),balance),services:z.record(z.string(),amount.nullable()),wip:amount,transferred_value:amount,abnormal_loss:amount,cost_complete:z.boolean(),quality:quality.nullable(),movements:z.array(z.object({movement_id:uuid,position_id:uuid,quantity_delta:z.string(),value_delta:z.string()}))}),version:z.number().int().positive(),updated_at:z.iso.datetime({offset:true})})
export const batchCommand=z.object({expected_version:z.number().int().nonnegative(),action:z.enum(["draft","start","issue","material_return","service","complete","cancel"]),content:batchContent.nullable(),lines:z.array(z.object({line_id:uuid,quantity:amount})),service_line_id:uuid.nullable(),service_amount:amount.nullable(),quality:quality.nullable(),write_off_remaining:z.boolean(),reason:z.string().trim().min(1).max(1000)})
const event=z.object({id:uuid,batch_id:uuid,actor_id:uuid,version:z.number().int().positive(),action:z.string(),intent:batchCommand,result:record,created_at:z.iso.datetime({offset:true})})
const recipeChoice=z.object({id:uuid,version:z.number().int().positive(),revision_id:uuid,sku_code:z.string(),content:z.object({title_fa:z.string(),title_en:z.string()})})
export type ProductionBatch=z.infer<typeof record>
export type BatchContent=z.infer<typeof batchContent>
export type BatchCommand=z.infer<typeof batchCommand>
export type BatchEvent=z.infer<typeof event>
export type RecipeChoice=z.infer<typeof recipeChoice>
const base="/api/v1/admin/production"
function scoped(raw:unknown,id:string,key?:string){const e=event.parse(raw);if(e.batch_id!==id||e.result.id!==id||(key&&e.id!==key)||e.version!==e.result.version||e.version!==e.intent.expected_version+1||e.action!==e.intent.action)throw new Error("result_unknown");return e}
export const productionApi={
 async list(q:string,status:string,losses:boolean,cursor?:string){const p=new URLSearchParams({q,losses:String(losses)});if(status)p.set("status",status);if(cursor)p.set("cursor",cursor);return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${p}`))},
 async choices(q:string,cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set("cursor",cursor);return z.object({items:z.array(recipeChoice),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/recipe-choices?${p}`))},
 async detail(id:string){const r=record.parse(await privateRequest(`${base}/${id}`));if(r.id!==id)throw new Error("result_unknown");return r},
 async history(id:string,before?:number){const r=z.object({items:z.array(event),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${id}/events${before?`?before=${before}`:""}`));r.items.forEach(e=>scoped(e,id));return r},
 async receipt(id:string,key:string){return scoped(await privateRequest(`${base}/${id}/commands/${key}`),id,key)},
 async save(id:string,key:string,intent:BatchCommand){const body=batchCommand.parse(intent);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/commands/${key}`,"PUT",body)}catch(error){const code=error instanceof Error?error.message:"";if(code.startsWith("production_")||["validation_error","permission_denied","csrf_invalid","origin_invalid","unauthenticated"].includes(code))throw error;throw new Error("result_unknown")}try{const e=scoped(raw,id,key);if(JSON.stringify(e.intent)!==JSON.stringify(body))throw new Error();return e}catch{throw new Error("result_unknown")}},
}
