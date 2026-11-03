import {z} from "zod"
import {privateRequest} from "./identity-api"
export const pageSlug=z.enum(["about","contact","faq","buying-guide","returns","terms","privacy"])
export const pageContent=z.object({title_fa:z.string().max(200),title_en:z.string().max(200),body_fa:z.string().max(50000),body_en:z.string().max(50000),description_fa:z.string().max(300),description_en:z.string().max(300)})
const uuid=z.string().uuid(),record=z.object({slug:pageSlug,version:z.number().int().nonnegative(),content:pageContent,published_revision:uuid.nullable(),updated_at:z.iso.datetime({offset:true}).nullable()}),revision=z.object({slug:pageSlug,revision_id:uuid,actor_id:uuid,expected_version:z.number().int().nonnegative(),version:z.number().int().positive(),action:z.enum(["draft","publish","unpublish"]),content:pageContent,reason:z.string(),created_at:z.iso.datetime({offset:true})})
export type PageContent=z.infer<typeof pageContent>
export type ContentPage=z.infer<typeof record>
export type ContentRevision=z.infer<typeof revision>
export type ContentIntent={expected_version:number;action:"draft"|"publish"|"unpublish";content:PageContent;reason:string}
const base="/api/v1/admin/content"
function scoped(raw:unknown,slug:string,key?:string){const r=revision.parse(raw);if(r.slug!==slug||(key&&r.revision_id!==key)||r.version!==r.expected_version+1)throw new Error("result_unknown");return r}
export const contentApi={
 async list(){return z.array(record).parse(await privateRequest(base))},
 async read(slug:string){const r=record.parse(await privateRequest(`${base}/${slug}`));if(r.slug!==slug)throw new Error("result_unknown");return r},
 async history(slug:string,before?:number){const r=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${slug}/versions${before?`?before=${before}`:""}`));r.items.forEach(v=>scoped(v,slug));return r},
 async receipt(slug:string,key:string){return scoped(await privateRequest(`${base}/${slug}/versions/${key}`),slug,key)},
 async save(slug:string,key:string,intent:ContentIntent){const raw=await privateRequest(`${base}/${slug}/versions/${key}`,"PUT",intent);try{const r=scoped(raw,slug,key);if(r.expected_version!==intent.expected_version||r.reason!==intent.reason||r.action!==intent.action||JSON.stringify(r.content)!==JSON.stringify(pageContent.parse(intent.content)))throw new Error();return r}catch{throw new Error("result_unknown")}},
}
