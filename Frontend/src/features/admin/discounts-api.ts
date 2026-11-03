import {z} from "zod"
import {privateRequest} from "./identity-api"
const decimal=z.string().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/)
export const discountContent=z.object({kind:z.enum(["fixed","percent"]),code:z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{0,79}$/),title_fa:z.string().trim().min(1).max(200),title_en:z.string().trim().min(1).max(200),value:decimal,minimum:decimal,maximum:decimal.nullable(),valid_from:z.iso.date(),valid_to:z.iso.date(),total_limit:z.number().int().positive().nullable(),customer_limit:z.number().int().positive().nullable(),product_ids:z.array(z.string().uuid()),collection_ids:z.array(z.string().uuid()),category_ids:z.array(z.string().uuid()),customer_phones:z.array(z.string()),allow_bundle_stacking:z.boolean(),first_purchase_only:z.boolean().default(false),active:z.boolean()})
const uuid=z.string().uuid(),record=z.object({id:uuid,version:z.number().int().positive(),content:discountContent,updated_at:z.iso.datetime({offset:true})}),revision=z.object({revision_id:uuid,discount_id:uuid,actor_id:uuid,expected_version:z.number().int().nonnegative(),version:z.number().int().positive(),content:discountContent,reason:z.string(),created_at:z.iso.datetime({offset:true})})
export type DiscountContent=z.infer<typeof discountContent>
export type DiscountRecord=z.infer<typeof record>
export type DiscountRevision=z.infer<typeof revision>
export type DiscountIntent={expected_version:number;content:DiscountContent;reason:string}
const base="/api/v1/admin/discounts/rules"
function scoped(value:DiscountRevision,id:string,key?:string){if(value.discount_id!==id||(key&&value.revision_id!==key)||value.version!==value.expected_version+1)throw new Error("result_unknown");return value}
export const discountsApi={
 async list(q:string,active:string,cursor?:string){const query=new URLSearchParams({q,limit:"25"});if(active!=="all")query.set("active",active);if(cursor)query.set("cursor",cursor);return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${query}`))},
 async detail(id:string){const value=record.parse(await privateRequest(`${base}/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async versions(id:string,before?:number){const value=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${id}/versions${before?`?before=${before}`:""}`));value.items.forEach(v=>scoped(v,id));return value},
 async saved(id:string,key:string){return scoped(revision.parse(await privateRequest(`${base}/${id}/versions/${key}`)),id,key)},
 async save(id:string,key:string,intent:DiscountIntent){const raw=await privateRequest(`${base}/${id}/versions/${key}`,"PUT",intent);try{const value=scoped(revision.parse(raw),id,key);if(value.expected_version!==intent.expected_version||JSON.stringify(value.content)!==JSON.stringify(discountContent.parse(intent.content))||value.reason!==intent.reason)throw new Error();return value}catch{throw new Error("result_unknown")}},
}
