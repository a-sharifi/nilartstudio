import {z} from "zod"
import {privateRequest} from "./identity-api"
const item=z.object({id:z.string().uuid(),slug:z.string(),title_fa:z.string(),title_en:z.string(),published:z.boolean().optional(),version:z.number().int().optional()})
const money=z.object({amount:z.string().regex(/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/),currency:z.enum(["IRT","IRR"])})
const sku=z.object({id:z.string().uuid(),code:z.string(),price:money.nullable()})
const price=z.object({sku_id:z.string().uuid(),product_id:z.string().uuid(),code:z.string(),version:z.number().int().nonnegative(),price:money.nullable()})
export type CatalogItem=z.infer<typeof item>
export type PriceRecord=z.infer<typeof price>
export const adminCatalogApi={
 async list(kind:string,page=1,status="all",query=""){
  const managed=["collections","categories","products"].includes(kind)
  const path=managed?`/api/v1/admin/catalog/entries/${kind}`:`/api/v1/catalog/${kind}`
  return z.object({items:z.array(managed?managedEntrySchema:item),total:z.number().int().nonnegative()}).parse(await privateRequest(`${path}?page=${page}&page_size=24${managed?`&status=${status}${query?`&q=${encodeURIComponent(query)}`:""}`:""}`))
 },
 async skus(productId:string){return z.array(sku.extend({published:z.boolean(),version:z.number().int().nonnegative()})).parse(await privateRequest(`/api/v1/admin/catalog/entries/products/${productId}/skus`))},
 async createSku(productId:string,code:string){
  const result=z.object({sku_id:z.string().uuid(),product_id:z.string().uuid(),code:z.string(),published:z.literal(false),version:z.number().int().positive()}).parse(await privateRequest(`/api/v1/admin/catalog/products/${productId}/skus`,"POST",{code}))
  if(result.product_id!==productId||result.code!==code)throw new Error("result_unknown")
  return result
 },
 async priceHistory(id:string,productId:string,before?:number){
  const state=z.object({price:money.nullable()})
  const result=z.object({items:z.array(z.object({id:z.string().uuid(),sku_id:z.string().uuid(),product_id:z.string().uuid(),actor_id:z.string().uuid(),previous_version:z.number().int().nonnegative(),version:z.number().int().positive(),created_at:z.iso.datetime({offset:true}),before:state,after:state})),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`/api/v1/admin/catalog/skus/${id}/price/audits${before?`?before_version=${before}`:""}`))
  if(result.items.some(row=>row.sku_id!==id||row.product_id!==productId))throw new Error("result_unknown")
  return result
 },
 async price(id:string){const result=price.parse(await privateRequest(`/api/v1/admin/catalog/skus/${id}/price`));if(result.sku_id!==id)throw new Error("result_unknown");return result},
 async save(record:PriceRecord,amount:string,currency:"IRT"|"IRR"){const value=amount===""?null:money.parse({amount,currency});const result=price.parse(await privateRequest(`/api/v1/admin/catalog/skus/${record.sku_id}/price`,"PUT",{version:record.version,price:value}));if(result.sku_id!==record.sku_id)throw new Error("result_unknown");return result}
}

export const managedEntrySchema=z.object({
 id:z.string().uuid(),kind:z.enum(["collections","categories","products"]),slug:z.string(),
 title_fa:z.string(),title_en:z.string(),description_fa:z.string(),description_en:z.string(),
 collection_ids:z.array(z.string().uuid()),category_ids:z.array(z.string().uuid()),
 published:z.boolean(),version:z.number().int().nonnegative()
})
export type ManagedEntry=z.infer<typeof managedEntrySchema>
export type EntryKind=ManagedEntry["kind"]
export type EntryDraft=Pick<ManagedEntry,"slug"|"title_fa"|"title_en"|"description_fa"|"description_en"|"collection_ids"|"category_ids">
const auditSchema=z.object({id:z.string().uuid(),action:z.string(),reason:z.string(),actor_id:z.string().uuid(),version:z.number().int(),created_at:z.string(),before:managedEntrySchema.nullable(),after:managedEntrySchema})
const entryPath=(kind:EntryKind,id?:string)=>`/api/v1/admin/catalog/entries/${kind}${id?`/${id}`:""}`
function checkEntry(value:unknown,kind:EntryKind,id:string){const result=managedEntrySchema.parse(value);if(result.id!==id||result.kind!==kind)throw new Error("result_unknown");return result}
export const catalogManagementApi={
 async read(kind:EntryKind,id:string){return checkEntry(await privateRequest(entryPath(kind,id)),kind,id)},
 async create(kind:EntryKind,id:string,draft:EntryDraft,reason:string){return checkEntry(await privateRequest(entryPath(kind),"POST",{id,...draft,reason}),kind,id)},
 async update(record:ManagedEntry,draft:EntryDraft,reason:string){return checkEntry(await privateRequest(entryPath(record.kind,record.id),"PUT",{...draft,version:record.version,reason}),record.kind,record.id)},
 async publication(record:ManagedEntry,published:boolean,reason:string){return checkEntry(await privateRequest(`${entryPath(record.kind,record.id)}/publication`,"POST",{version:record.version,published,reason}),record.kind,record.id)},
 async audits(kind:EntryKind,id:string,before?:number){return z.object({items:z.array(auditSchema),next_before_version:z.number().int().nullable()}).parse(await privateRequest(`${entryPath(kind,id)}/audits${before?`?before_version=${before}`:""}`))},
 async choices(kind:"collections"|"categories"){
  const items:ManagedEntry[]=[]
  for(let page=1;page<=100;page++){
   const result=z.object({items:z.array(managedEntrySchema),total:z.number().int().nonnegative()}).parse(await privateRequest(`${entryPath(kind)}?page=${page}&page_size=100`))
   items.push(...result.items)
   if(items.length>=result.total)return items
   if(!result.items.length)throw new Error("result_unknown")
  }
  throw new Error("result_unknown")
 }
}
