import {z} from 'zod'
import {privateRequest} from './identity-api'
import {canonical} from './finance-api'
const uuid=z.string().uuid(),amount=z.string().trim().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/)
export const bundleContent=z.object({slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),title_fa:z.string().trim().min(1).max(300),title_en:z.string().trim().min(1).max(300),description_fa:z.string().trim().max(10000),description_en:z.string().trim().max(10000),collection_ids:z.array(uuid).max(100),components:z.array(z.object({sku_id:uuid,quantity:z.number().int().min(1).max(10000),allowed_sku_ids:z.array(uuid).min(1).max(100)})).max(50),gallery:z.array(z.object({asset_id:uuid,revision_id:uuid,alt_fa:z.string().trim().min(1).max(500),alt_en:z.string().trim().min(1).max(500)})).max(30),discount_kind:z.enum(['fixed','percent']),discount_amount:amount,packaging_cost:amount.nullable(),service_cost:amount.nullable(),allow_discount_stacking:z.boolean()})
export const bundleCommand=z.object({expected_version:z.number().int().nonnegative(),action:z.enum(['draft','publish','unpublish']),content:bundleContent,reason:z.string().trim().min(5).max(1000)})
const record=z.object({id:uuid,title_fa:z.string(),title_en:z.string(),slug:z.string(),version:z.number().int().nonnegative(),content:bundleContent.nullable(),published:z.boolean(),published_revision:uuid.nullable(),legacy:z.boolean()})
const receipt=z.object({id:uuid,bundle_id:uuid,actor_id:uuid,version:z.number().int().positive(),intent:bundleCommand,result:record,created_at:z.iso.datetime({offset:true})})
export type BundleContent=z.infer<typeof bundleContent>
export type BundleRecord=z.infer<typeof record>
export type BundleCommand=z.infer<typeof bundleCommand>
export type BundleReceipt=z.infer<typeof receipt>
const sku=z.object({id:uuid,product_id:uuid,code:z.string(),title_fa:z.string(),title_en:z.string(),published:z.boolean(),amount:z.string().nullable(),currency:z.enum(['IRT','IRR']).nullable()})
const collection=z.object({id:uuid,slug:z.string(),title_fa:z.string(),title_en:z.string(),published:z.boolean()})
const media=z.object({id:uuid,revision_id:uuid,title_fa:z.string(),title_en:z.string(),alt_fa:z.string(),alt_en:z.string()})
export type BundleSKUChoice=z.infer<typeof sku>
export type BundleCollectionChoice=z.infer<typeof collection>
export type BundleMediaChoice=z.infer<typeof media>
const base='/api/v1/admin/catalog/bundles'
function scoped(raw:unknown,id:string,key:string,body:BundleCommand){const r=receipt.parse(raw);if(r.bundle_id!==id||r.id!==key||r.result.id!==id||r.version!==body.expected_version+1||r.result.version!==r.version||canonical(r.result.content)!==canonical(r.intent.content)||canonical(r.intent)!==canonical(bundleCommand.parse(body)))throw new Error('result_unknown');return r}
export const bundleAuthoringApi={
 async list(q='',status='all',cursor?:string){return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${new URLSearchParams({q,status,...(cursor?{cursor}:{})})}`))},
 async detail(id:string){const r=record.parse(await privateRequest(`${base}/${id}`));if(r.id!==id)throw new Error('result_unknown');return r},
 async history(id:string,before?:number){const r=z.array(receipt).parse(await privateRequest(`${base}/${id}/history${before?'?before='+before:''}`));if(r.some(e=>e.bundle_id!==id))throw new Error('result_unknown');return r},
 async save(id:string,key:string,body:BundleCommand){let raw:unknown;try{raw=await privateRequest(`${base}/${id}/commands/${key}`,'PUT',body)}catch(e){const code=e instanceof Error?e.message:'';if(code.startsWith('bundle_')||['validation_error','permission_denied','csrf_invalid','unauthenticated'].includes(code))throw e;throw new Error('result_unknown')}try{return scoped(raw,id,key,body)}catch{throw new Error('result_unknown')}},
 async saved(id:string,key:string,body:BundleCommand){return scoped(await privateRequest(`${base}/${id}/commands/${key}`),id,key,body)},
 async skus(q='',cursor?:string){return z.object({items:z.array(sku),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/choices/skus?${new URLSearchParams({q,...(cursor?{cursor}:{})})}`))},
 async collections(q='',cursor?:string){return z.object({items:z.array(collection),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/choices/collections?${new URLSearchParams({q,...(cursor?{cursor}:{})})}`))},
 async media(q='',cursor?:string){return z.object({items:z.array(media),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/choices/media?${new URLSearchParams({q,...(cursor?{cursor}:{})})}`))}
}
