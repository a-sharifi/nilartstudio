import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),purpose=z.enum(["public_image","print_file"]),action=z.enum(["draft","publish","unpublish"]),sha=z.string().regex(/^[0-9a-f]{64}$/)
export const mediaMetadata=z.object({title_fa:z.string().trim().min(1).max(200),title_en:z.string().trim().min(1).max(200),alt_fa:z.string().trim().max(500),alt_en:z.string().trim().max(500),sku_id:uuid.nullable(),print_size:z.string().trim().max(120),notes:z.string().trim().max(2000)})
const asset=z.object({id:uuid,purpose,version:z.number().int().positive(),metadata:mediaMetadata,sha256:sha,file_name:z.string(),published_revision:uuid.nullable(),updated_at:z.iso.datetime({offset:true})}),revision=z.object({revision_id:uuid,asset_id:uuid,actor_id:uuid,expected_version:z.number().int().nonnegative(),version:z.number().int().positive(),action,purpose,metadata:mediaMetadata,sha256:sha,file_name:z.string(),reason:z.string(),created_at:z.iso.datetime({offset:true})}),choice=z.object({id:uuid,code:z.string(),title_fa:z.string(),title_en:z.string()})
export type MediaMetadata=z.infer<typeof mediaMetadata>
export type MediaAsset=z.infer<typeof asset>
export type MediaRevision=z.infer<typeof revision>
export type MediaChoice=z.infer<typeof choice>
export type MediaIntent={expected_version:number;action:z.infer<typeof action>;purpose:z.infer<typeof purpose>;metadata:MediaMetadata;file_name:string;content_base64:string|null;reason:string}
const base="/api/v1/admin/media"
function scoped(raw:unknown,id:string,key?:string){const r=revision.parse(raw);if(r.asset_id!==id||(key&&r.revision_id!==key)||r.version!==r.expected_version+1)throw new Error("result_unknown");return r}
export function verifyMedia(r:MediaRevision,id:string,key:string,intent:MediaIntent,digest:string){if(r.asset_id!==id||r.revision_id!==key||r.expected_version!==intent.expected_version||r.version!==intent.expected_version+1||r.sha256!==digest||r.purpose!==intent.purpose||r.action!==intent.action||r.file_name!==intent.file_name||r.reason!==intent.reason||JSON.stringify(r.metadata)!==JSON.stringify(mediaMetadata.parse(intent.metadata)))throw new Error("result_unknown");return r}
export const mediaApi={
 async list(q:string,p:string,cursor?:string){const query=new URLSearchParams({q});if(p)query.set("purpose",p);if(cursor)query.set("cursor",cursor);return z.object({items:z.array(asset),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${query}`))},
 async read(id:string){const r=asset.parse(await privateRequest(`${base}/${id}`));if(r.id!==id)throw new Error("result_unknown");return r},
 async history(id:string,before?:number){const p=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${id}/versions${before?`?before=${before}`:""}`));p.items.forEach(r=>scoped(r,id));return p},
 async receipt(id:string,key:string){return scoped(await privateRequest(`${base}/${id}/versions/${key}`),id,key)},
 async save(id:string,key:string,intent:MediaIntent,digest:string){const raw=await privateRequest(`${base}/${id}/versions/${key}`,"PUT",intent);try{return verifyMedia(scoped(raw,id,key),id,key,intent,digest)}catch{throw new Error("result_unknown")}},
 async choices(q:string,cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set("cursor",cursor);return z.object({items:z.array(choice),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/choices/skus?${p}`))},
}
