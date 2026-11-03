import {z} from 'zod'
import {privateRequest} from './identity-api'
import {canonical} from './finance-api'
const uuid=z.string().uuid(),word=(n:number)=>z.string().trim().min(1).max(n)
export const artworkContent=z.object({slug:word(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),title_fa:word(240),title_en:word(240),description_fa:z.string().trim().max(10000),description_en:z.string().trim().max(10000),artist_fa:word(200),artist_en:word(200),medium:z.enum(['colored-pencil','oil','acrylic','mixed-media']),style:z.enum(['landscape','abstract']),width_cm:z.number().min(1).max(10000),height_cm:z.number().min(1).max(10000),edition:z.enum(['original','print','digital']),linked_sku_id:uuid.nullable(),price_amount:z.string().trim().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$/).nullable(),weight_grams:z.number().int().min(1).max(100000000).nullable(),returnable:z.boolean().nullable(),license_fa:z.string().trim().max(10000),license_en:z.string().trim().max(10000),image_credit:word(1000),frame_fa:z.string().max(200).nullable().optional(),frame_en:z.string().max(200).nullable().optional(),gallery:z.array(z.object({asset_id:uuid,revision_id:uuid,alt_fa:word(500),alt_en:word(500)})).max(30)})
export const artworkCommand=z.object({expected_version:z.number().int().nonnegative(),action:z.enum(['draft','publish','unpublish']),content:artworkContent,reason:word(1000).min(5)})
const record=z.object({id:uuid,slug:z.string(),title_fa:z.string(),title_en:z.string(),version:z.number().int().nonnegative(),content:artworkContent.nullable(),published_revision:uuid.nullable(),published:z.boolean()})
const receipt=z.object({id:uuid,artwork_id:uuid,actor_id:uuid,version:z.number().int().positive(),intent:artworkCommand,result:record,created_at:z.iso.datetime({offset:true})})
export type ArtworkContent=z.infer<typeof artworkContent>
export type ArtworkCommand=z.infer<typeof artworkCommand>
export type ArtworkRecord=z.infer<typeof record>
export type ArtworkReceipt=z.infer<typeof receipt>
const base='/api/v1/admin/catalog/artworks'
function scoped(raw:unknown,id:string,key:string,body:ArtworkCommand){const r=receipt.parse(raw);if(r.id!==key||r.artwork_id!==id||r.result.id!==id||r.version!==body.expected_version+1||r.result.version!==r.version||canonical(r.intent)!==canonical(artworkCommand.parse(body))||canonical(r.result.content)!==canonical(r.intent.content))throw new Error('result_unknown');return r}
export const artworkAuthoringApi={
 async list(q='',cursor?:string){return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${new URLSearchParams({q,...(cursor?{cursor}:{})})}`))},
 async read(id:string){const r=record.parse(await privateRequest(`${base}/${id}`));if(r.id!==id)throw new Error('result_unknown');return r},
 async history(id:string,before?:number){const r=z.array(receipt).parse(await privateRequest(`${base}/${id}/history${before?'?before='+before:''}`));if(r.some(v=>v.artwork_id!==id))throw new Error('result_unknown');return r},
 async save(id:string,key:string,body:ArtworkCommand){let raw:unknown;try{raw=await privateRequest(`${base}/${id}/commands/${key}`,'PUT',body)}catch(e){const code=e instanceof Error?e.message:'';if(code.startsWith('artwork_')||code.startsWith('bundle_')||['validation_error','permission_denied','unauthenticated','csrf_invalid'].includes(code))throw e;throw new Error('result_unknown')}try{return scoped(raw,id,key,body)}catch{throw new Error('result_unknown')}},
 async saved(id:string,key:string,body:ArtworkCommand){return scoped(await privateRequest(`${base}/${id}/commands/${key}`),id,key,body)}
}
