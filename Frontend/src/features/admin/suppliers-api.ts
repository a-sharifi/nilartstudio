import {z} from "zod"
import {privateRequest} from "./identity-api"
export const supplierContent=z.object({kind:z.enum(["supplier","service_provider","both"]),code:z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{0,79}$/),title_fa:z.string().trim().min(1).max(200),title_en:z.string().trim().min(1).max(200),contact_name:z.string().trim().max(200),phone:z.string().trim().max(40),email:z.string().trim().max(254),address:z.string().trim().max(1000),notes:z.string().trim().max(2000),active:z.boolean()})
const uuid=z.string().uuid(),record=z.object({id:uuid,version:z.number().int().positive(),content:supplierContent,updated_at:z.iso.datetime({offset:true})}),revision=z.object({revision_id:uuid,supplier_id:uuid,actor_id:uuid,expected_version:z.number().int().nonnegative(),version:z.number().int().positive(),content:supplierContent,reason:z.string(),created_at:z.iso.datetime({offset:true})})
export type SupplierContent=z.infer<typeof supplierContent>
export type SupplierRecord=z.infer<typeof record>
export type SupplierRevision=z.infer<typeof revision>
export type SupplierIntent={expected_version:number;content:SupplierContent;reason:string}
const base="/api/v1/admin/procurement/suppliers"
function scoped(value:SupplierRevision,id:string,key?:string){if(value.supplier_id!==id||(key&&value.revision_id!==key)||value.version!==value.expected_version+1)throw new Error("result_unknown");return value}
export const suppliersApi={
 async list(q:string,active:string,cursor?:string){const query=new URLSearchParams({q,limit:"25"});if(active!=="all")query.set("active",active);if(cursor)query.set("cursor",cursor);return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${query}`))},
 async detail(id:string){const value=record.parse(await privateRequest(`${base}/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async versions(id:string,before?:number){const value=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${id}/versions${before?`?before=${before}`:""}`));value.items.forEach(v=>scoped(v,id));return value},
 async saved(id:string,key:string){return scoped(revision.parse(await privateRequest(`${base}/${id}/versions/${key}`)),id,key)},
 async save(id:string,key:string,intent:SupplierIntent){const raw=await privateRequest(`${base}/${id}/versions/${key}`,"PUT",intent);try{const value=scoped(revision.parse(raw),id,key);if(value.expected_version!==intent.expected_version||JSON.stringify(value.content)!==JSON.stringify(supplierContent.parse(intent.content))||value.reason!==intent.reason)throw new Error();return value}catch{throw new Error("result_unknown")}},
}
