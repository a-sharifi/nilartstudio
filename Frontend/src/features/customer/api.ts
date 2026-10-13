import {z} from "zod"
import {privateRequest} from "../admin/identity-api"
import type {Address} from "../../design/address"
const record=z.object({id:z.string().uuid(),kind:z.enum(["address","preferences","favorite","ticket","message","notification"]),version:z.number().int().nonnegative(),data:z.record(z.string(),z.unknown()),created_at:z.string(),updated_at:z.string(),catalog:z.object({slug:z.string(),title_fa:z.string(),title_en:z.string()}).nullable().optional()})
export type CustomerRecord=z.infer<typeof record>
export const customerApi={
 async summary(){return z.object({favorites:z.number().int().nonnegative(),addresses:z.number().int().nonnegative(),tickets:z.number().int().nonnegative(),unread_notifications:z.number().int().nonnegative()}).parse(await privateRequest("/api/v1/account/panel/summary"))},
 async list(kind:string,cursor?:string){const page=z.object({items:z.array(record),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/account/panel/${kind}?limit=100${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}`));if(page.items.some(item=>item.kind!==kind))throw new Error("Invalid record kind");return page},
 async detail(kind:string,id:string){return record.parse(await privateRequest(`/api/v1/account/panel/${kind}/${encodeURIComponent(id)}`))},
 async save(kind:string,id:string,version:number,data:unknown){return record.parse(await privateRequest(`/api/v1/account/panel/${kind}/${id}`,"PUT",{version,data}))},
 async ticketState(ticket:CustomerRecord,status:"closed"|"submitted"){return record.parse(await privateRequest(`/api/v1/account/panel/tickets/${ticket.id}/state`,"PUT",{version:ticket.version,status}))},
 async remove(kind:string,id:string,version:number){await privateRequest(`/api/v1/account/panel/${kind}/${id}?version=${version}`,"DELETE")}
}
const addressData=z.object({name:z.string(),phone:z.string(),province:z.string(),city:z.string(),street:z.string(),postal:z.string(),label:z.string(),default:z.boolean()})
export const addressApi={
 async load(){const list=await customerApi.list("address");if(list.next_cursor)throw new Error("pagination_required");return list.items.map(item=>({...addressData.parse(item.data),id:item.id,version:item.version}))},
 async save(address:Address){const {id,version,...data}=address;await customerApi.save("address",id||crypto.randomUUID(),version,data);return this.load()},
 async remove(address:Address){await customerApi.remove("address",address.id,address.version);return this.load()}
}

import {accountPreferencesFixture,type AccountPreferenceDraft,type AccountPreferenceRecord} from "../../design/account-preferences"
export const preferencesApi={
 async load(language:"fa"|"en"){
  const [profile,page]=await Promise.all([privateRequest("/api/v1/account/profile"),customerApi.list("preferences")])
  const owner=z.object({account_id:z.string().uuid()}).parse(profile).account_id
  const current=page.items[0]
  const fallback=accountPreferencesFixture("normal",language)
  const choices=Object.fromEntries(fallback.policy.categories.map(category=>[category.id,{inApp:true,sms:false}]))
  const values=z.object({language:z.enum(["fa","en"]),choices:z.record(z.string(),z.record(z.string(),z.boolean()))}).parse(current?.data || {language,choices})
  return {id:current?.id||crypto.randomUUID(),record:{...fallback.record,...values,owner,version:current?.version||0} as AccountPreferenceRecord,policy:{...fallback.policy,smsStatus:"unavailable" as const}}
 },
 async save(id:string,record:AccountPreferenceRecord,draft:AccountPreferenceDraft){
  const result=await customerApi.save("preferences",id,record.version,draft)
  return {...record,...draft,version:result.version}
 }
}

import type {SupportDraft,Ticket} from "../../design/support"
const mapTicket=(item:CustomerRecord,owner:string):Ticket=>({id:item.id,owner,title:[String(item.data.subject),String(item.data.subject)],topic:String(item.data.topic),order:"",status:item.data.status==="awaiting_customer"?"waiting":item.data.status==="awaiting_reply"?"review":item.data.status==="closed"?"closed":"submitted",updated:item.updated_at,unread:0})
export const supportApi={
 async load(){const owner=z.object({account_id:z.string().uuid()}).parse(await privateRequest("/api/v1/account/profile")).account_id;let page=await customerApi.list("ticket");const items=[...page.items];while(page.next_cursor){page=await customerApi.list("ticket",page.next_cursor);items.push(...page.items)}return {owner,tickets:items.map(item=>mapTicket(item,owner))}},
 async submit(draft:SupportDraft,key:string,owner:string){const result=await customerApi.save("ticket",key,0,{topic:draft.topic,subject:draft.subject,body:draft.description,request_id:key});return mapTicket(result,owner)}
}
