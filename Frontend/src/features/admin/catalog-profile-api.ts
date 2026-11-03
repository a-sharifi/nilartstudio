import {z} from 'zod'
import {privateRequest} from './identity-api'
import {canonical} from './finance-api'
export const profileKind=z.enum(['products','skus','collections'])
const uuid=z.string().uuid(),word=(max:number)=>z.string().trim().min(1).max(max)
export const profileContent=z.object({specifications:z.array(z.object({label_fa:word(160),label_en:word(160),value_fa:word(1000),value_en:word(1000)})).max(50),gallery:z.array(z.object({asset_id:uuid,revision_id:uuid,alt_fa:word(500),alt_en:word(500)})).max(30),delivery:z.enum(['physical','digital']).nullable(),weight_grams:z.number().int().min(1).max(100000000).nullable(),returnable:z.boolean().nullable(),length_cm:z.number().positive().max(300).nullable().default(null),width_cm:z.number().positive().max(300).nullable().default(null),height_cm:z.number().positive().max(300).nullable().default(null),weight_estimated:z.boolean().default(false)})
export const profileCommand=z.object({expected_version:z.number().int().nonnegative(),action:z.enum(['draft','publish','unpublish']),content:profileContent,reason:word(1000).min(5)})
const record=z.object({kind:profileKind,entity_id:uuid,version:z.number().int().nonnegative(),content:profileContent.nullable(),published_revision:uuid.nullable()})
const receipt=z.object({id:uuid,kind:profileKind,entity_id:uuid,actor_id:uuid,version:z.number().int().positive(),intent:profileCommand,result:record,created_at:z.iso.datetime({offset:true})})
export type ProfileKind=z.infer<typeof profileKind>
export type ProfileContent=z.infer<typeof profileContent>
export type ProfileCommand=z.infer<typeof profileCommand>
export type ProfileRecord=z.infer<typeof record>
export type ProfileReceipt=z.infer<typeof receipt>
function url(kind:ProfileKind,id:string){return `/api/v1/admin/catalog/profiles/${kind}/${id}`}
function scoped(raw:unknown,kind:ProfileKind,id:string,key:string,body:ProfileCommand){const r=receipt.parse(raw);if(r.id!==key||r.kind!==kind||r.entity_id!==id||r.result.kind!==kind||r.result.entity_id!==id||r.version!==body.expected_version+1||r.result.version!==r.version||canonical(r.intent)!==canonical(profileCommand.parse(body))||canonical(r.result.content)!==canonical(r.intent.content))throw new Error('result_unknown');return r}
export const catalogProfileApi={
 async read(kind:ProfileKind,id:string){const r=record.parse(await privateRequest(url(kind,id)));if(r.kind!==kind||r.entity_id!==id)throw new Error('result_unknown');return r},
 async history(kind:ProfileKind,id:string,before?:number){const r=z.array(receipt).parse(await privateRequest(url(kind,id)+'/history'+(before?'?before='+before:'')));if(r.some(v=>v.kind!==kind||v.entity_id!==id))throw new Error('result_unknown');return r},
 async save(kind:ProfileKind,id:string,key:string,body:ProfileCommand){let raw:unknown;try{raw=await privateRequest(url(kind,id)+'/commands/'+key,'PUT',body)}catch(e){const code=e instanceof Error?e.message:'';if(code.startsWith('profile_')||['validation_error','permission_denied','unauthenticated','csrf_invalid'].includes(code))throw e;throw new Error('result_unknown')}try{return scoped(raw,kind,id,key,body)}catch{throw new Error('result_unknown')}},
 async saved(kind:ProfileKind,id:string,key:string,body:ProfileCommand){return scoped(await privateRequest(url(kind,id)+'/commands/'+key),kind,id,key,body)}
}
