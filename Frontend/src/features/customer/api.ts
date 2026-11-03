import {z} from "zod"
import {privateRequest,ManagementApiError} from "../admin/identity-api"
import type {Address} from "../../design/address"
const record=z.object({id:z.string().uuid(),kind:z.enum(["address","preferences","favorite","ticket","message","notification"]),version:z.number().int().nonnegative(),data:z.record(z.string(),z.unknown()),created_at:z.string(),updated_at:z.string(),catalog:z.object({slug:z.string(),title_fa:z.string(),title_en:z.string()}).nullable().optional()})
export type CustomerRecord=z.infer<typeof record>
export const customerApi={
 async summary(){return z.object({favorites:z.number().int().nonnegative(),addresses:z.number().int().nonnegative(),tickets:z.number().int().nonnegative(),unread_notifications:z.number().int().nonnegative()}).parse(await privateRequest("/api/v1/account/panel/summary"))},
 async list(kind:string,cursor?:string,ticketId?:string,filters?:{q?:string;status?:string;read?:string;category?:string;favoriteType?:string}){const page=z.object({items:z.array(record),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/account/panel/${kind}?limit=100${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}${ticketId?`&ticket_id=${encodeURIComponent(ticketId)}`:""}${filters?.q?`&q=${encodeURIComponent(filters.q)}`:""}${filters?.status?`&status=${encodeURIComponent(filters.status)}`:""}${filters?.read?`&read_filter=${encodeURIComponent(filters.read)}`:""}${filters?.category?`&category=${encodeURIComponent(filters.category)}`:""}${filters?.favoriteType?`&favorite_type=${encodeURIComponent(filters.favoriteType)}`:""}`));if(page.items.some(item=>item.kind!==kind||(ticketId&&item.data.ticket_id!==ticketId)))throw new Error("Invalid record kind");return page},
 async all(kind:string,ticketId?:string,filters?:{q?:string;status?:string;read?:string;category?:string;favoriteType?:string}):Promise<CustomerRecord[]>{
  const items:CustomerRecord[]=[],seen=new Set<string>();let cursor:string|undefined
  do{const page=await this.list(kind,cursor,ticketId,filters);items.push(...page.items);if(!page.next_cursor)break;if(seen.has(page.next_cursor))throw new Error("pagination_loop");seen.add(page.next_cursor);cursor=page.next_cursor}while(cursor)
  return [...new Map(items.map(item=>[item.id,item])).values()]
 },
 async markAllRead(){
  const items=await this.all("notification")
  for(const item of items){if(item.data.read!==true)await this.save("notification",item.id,item.version,{read:true})}
 },
 async detail(kind:string,id:string){return record.parse(await privateRequest(`/api/v1/account/panel/${kind}/${encodeURIComponent(id)}`))},
 async save(kind:string,id:string,version:number,data:unknown){return record.parse(await privateRequest(`/api/v1/account/panel/${kind}/${id}`,"PUT",{version,data}))},
 async ticketState(ticket:CustomerRecord,status:"closed"|"submitted"){return record.parse(await privateRequest(`/api/v1/account/panel/tickets/${ticket.id}/state`,"PUT",{version:ticket.version,status}))},
 async remove(kind:string,id:string,version:number){await privateRequest(`/api/v1/account/panel/${kind}/${id}?version=${version}`,"DELETE")}
}
const addressData=z.object({name:z.string(),phone:z.string(),province:z.string(),city:z.string(),street:z.string(),postal:z.string(),label:z.string(),default:z.boolean()})
export const addressApi={
 async load(){const items=await customerApi.all("address");return items.map(item=>({...addressData.parse(item.data),id:item.id,version:item.version}))},
 async save(address:Address){const {id,version,...data}=address;await customerApi.save("address",id||crypto.randomUUID(),version,data);return this.load()},
 async remove(address:Address){await customerApi.remove("address",address.id,address.version);return this.load()}
}

import {accountPreferencesFixture,type AccountPreferenceDraft,type AccountPreferenceRecord} from "../../design/account-preferences"
export const preferencesApi={
 async load(language:"fa"|"en"){
  const [profile,page,methods]=await Promise.all([privateRequest("/api/v1/account/profile"),customerApi.list("preferences"),privateRequest("/api/v1/account/security/methods")])
  const owner=z.object({account_id:z.string().uuid()}).parse(profile).account_id
  const current=page.items[0]
  const fallback=accountPreferencesFixture("normal",language)
  const choices=Object.fromEntries(fallback.policy.categories.map(category=>[category.id,{inApp:true,sms:false}]))
  const values=z.object({language:z.enum(["fa","en"]),choices:z.record(z.string(),z.record(z.string(),z.boolean()))}).parse(current?.data || {language,choices})
  return {id:current?.id||crypto.randomUUID(),record:{...fallback.record,...values,owner,version:current?.version||0} as AccountPreferenceRecord,policy:{...fallback.policy,smsStatus:z.object({order_sms_enabled:z.boolean().default(false)}).parse(methods).order_sms_enabled?"ready" as const:"unavailable" as const}}
 },
 async save(id:string,record:AccountPreferenceRecord,draft:AccountPreferenceDraft){
  const result=await customerApi.save("preferences",id,record.version,draft)
  return {...record,...draft,version:result.version}
 }
}

import type {SupportDraft,Ticket} from "../../design/support"
const mapTicket=(item:CustomerRecord,owner:string):Ticket=>({id:item.id,owner,title:[String(item.data.subject),String(item.data.subject)],topic:String(item.data.topic),order:typeof item.data.order_id==="string"?item.data.order_id:"",status:item.data.status==="awaiting_customer"?"waiting":item.data.status==="awaiting_reply"?"review":item.data.status==="closed"?"closed":"submitted",updated:item.updated_at,unread:0})
import {ordersApi} from "./orders-api"
export const supportApi={
 async relatedOrders(){
  const items:Awaited<ReturnType<typeof ordersApi.list>>["items"]=[],seen=new Set<string>();let cursor:string|undefined
  do{const page=await ordersApi.list(cursor);items.push(...page.items);if(!page.next_cursor)break;if(seen.has(page.next_cursor))throw new Error("pagination_loop");seen.add(page.next_cursor);cursor=page.next_cursor}while(cursor)
  return [...new Map(items.map(item=>[item.id,item])).values()].map(item=>({id:item.id,reference:item.snapshot.reference,items:item.snapshot.items.map(line=>({id:line.id,title_fa:line.title_fa,title_en:line.title_en}))}))
 },
 async load(filters?:{q?:string;status?:string;read?:string;category?:string;favoriteType?:string}){const owner=z.object({account_id:z.string().uuid()}).parse(await privateRequest("/api/v1/account/profile")).account_id;const items=await customerApi.all("ticket",undefined,filters);return {owner,tickets:items.map(item=>mapTicket(item,owner))}},
 async lookup(id:string,owner:string){try{const saved=await customerApi.detail("ticket",id);if(saved.kind!=="ticket"||saved.id!==id)throw new Error("Invalid ticket result");return mapTicket(saved,owner)}catch(error){if(error instanceof ManagementApiError&&error.message==="record_not_found")return null;throw error}},
 async submit(draft:SupportDraft,key:string,owner:string){const result=await customerApi.save("ticket",key,0,{topic:draft.topic,subject:draft.subject,body:draft.description,request_id:key,...(draft.order?{order_id:draft.order}:{}),...(draft.item?{line_id:draft.item}:{})});return mapTicket(result,owner)}
}
