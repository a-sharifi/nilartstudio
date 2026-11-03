import {z} from "zod"
import {privateRequest} from "./identity-api"

const label=z.object({id:z.string().uuid(),title_fa:z.string().trim().min(1).max(300),title_en:z.string().trim().min(1).max(300),order:z.number().int().nonnegative()})
const choice=z.object({option_id:z.string().uuid(),value_id:z.string().uuid()})
const combination=z.object({code:z.string().trim().min(1).max(160),selections:z.array(choice).max(20)})
const option=label.extend({values:z.array(label).min(1).max(100)})
export const optionDocument=z.object({options:z.array(option).max(20),combinations:z.array(combination).max(1000)}).superRefine((doc,ctx)=>{
 const unique=(values:unknown[])=>new Set(values).size===values.length
 if(!unique(doc.options.map(o=>o.id))||!unique(doc.options.map(o=>o.order))||!unique(doc.options.flatMap(o=>o.values.map(v=>v.id)))||doc.options.some(o=>!unique(o.values.map(v=>v.order))))ctx.addIssue({code:"custom",message:"duplicate_options"})
 const keys:string[]=[]
 for(const row of doc.combinations){
  if(row.selections.length!==doc.options.length||!unique(row.selections.map(s=>s.option_id))||row.selections.some(s=>!doc.options.find(o=>o.id===s.option_id)?.values.some(v=>v.id===s.value_id)))ctx.addIssue({code:"custom",message:"invalid_selection"})
  keys.push(JSON.stringify([...row.selections].sort((a,b)=>a.option_id.localeCompare(b.option_id))))
 }
 if(!unique(keys)||!unique(doc.combinations.map(c=>c.code)))ctx.addIssue({code:"custom",message:"duplicate_combinations"})
})
const recordSchema=optionDocument.safeExtend({configuration_id:z.string().uuid().nullable(),product_id:z.string().uuid(),version:z.number().int().nonnegative()})
const mappingSchema=z.object({sku_id:z.string().uuid(),product_id:z.string().uuid(),code:z.string(),published:z.boolean(),version:z.number().int().nonnegative(),mapping:z.object({configuration_id:z.string().uuid(),configuration_version:z.number().int().positive(),combination_code:z.string(),current:z.boolean(),snapshot:z.object({options:z.array(option),combination})}).nullable()})
const auditState=z.object({sku_id:z.string().uuid(),product_id:z.string().uuid(),code:z.string(),published:z.boolean(),version:z.number().int(),action:z.string().optional(),reason:z.string().optional(),mapping:z.object({combination_code:z.string(),configuration_version:z.number().int()}).nullable().optional()})
const skuAudit=z.object({id:z.string().uuid(),sku_id:z.string().uuid(),product_id:z.string().uuid(),actor_id:z.string().uuid(),previous_version:z.number().int(),version:z.number().int(),created_at:z.iso.datetime({offset:true}),before:auditState.nullable(),after:auditState})
export type SKUAudit=z.infer<typeof skuAudit>
export type OptionDocument=z.infer<typeof optionDocument>
export type OptionRecord=z.infer<typeof recordSchema>
export type SKUMapping=z.infer<typeof mappingSchema>
const path=(id:string)=>`/api/v1/admin/catalog/products/${id}/options`
function record(data:unknown,id:string){const value=recordSchema.parse(data);if(value.product_id!==id)throw new Error("result_unknown");return value}
function mapping(data:unknown,id:string,product:string){const value=mappingSchema.parse(data);if(value.sku_id!==id||value.product_id!==product)throw new Error("result_unknown");return value}
export const optionsApi={
 async skuHistory(id:string,product:string,before?:number){
  const page=z.object({items:z.array(skuAudit),next_before_version:z.number().int().nullable()}).parse(await privateRequest(`/api/v1/admin/catalog/skus/${id}/audits${before?`?before_version=${before}`:""}`))
  if(page.items.some(a=>a.sku_id!==id||a.product_id!==product||a.after.sku_id!==id||a.after.product_id!==product||a.after.version!==a.version||(a.before&&(a.before.sku_id!==id||a.before.product_id!==product))))throw new Error("result_unknown")
  return page
 },
 async read(id:string){return record(await privateRequest(path(id)),id)},
 async save(previous:OptionRecord,document:OptionDocument){const value=record(await privateRequest(path(previous.product_id),"PUT",{version:previous.version,...optionDocument.parse(document)}),previous.product_id);if(value.version!==previous.version+1||!value.configuration_id)throw new Error("result_unknown");return value},
 async history(id:string,before?:number){return z.object({items:z.array(z.object({id:z.string().uuid(),product_id:z.string().uuid(),version:z.number().int(),created_at:z.iso.datetime({offset:true}),before:optionDocument,after:optionDocument})),next_before_version:z.number().int().nullable()}).parse(await privateRequest(`${path(id)}/audits${before?`?before_version=${before}`:""}`))},
 async mapping(id:string,product:string){return mapping(await privateRequest(`/api/v1/admin/catalog/skus/${id}/options`),id,product)},
 async publication(previous:SKUMapping,published:boolean,reason:string){
  const value=z.object({sku_id:z.string().uuid(),product_id:z.string().uuid(),code:z.string(),published:z.boolean(),version:z.number().int()}).parse(await privateRequest(`/api/v1/admin/catalog/skus/${previous.sku_id}/publication`,"POST",{version:previous.version,published,reason}))
  if(value.sku_id!==previous.sku_id||value.product_id!==previous.product_id||value.code!==previous.code||value.published!==published||value.version!==previous.version+1)throw new Error("result_unknown")
  return value
 },
 async rename(previous:SKUMapping,code:string){
  const value=z.object({sku_id:z.string().uuid(),product_id:z.string().uuid(),code:z.string(),published:z.boolean(),version:z.number().int()}).parse(await privateRequest(`/api/v1/admin/catalog/skus/${previous.sku_id}`,"PUT",{version:previous.version,code}))
  if(value.sku_id!==previous.sku_id||value.product_id!==previous.product_id||value.code!==code||value.published||value.version!==previous.version+1)throw new Error("result_unknown")
  return value
 },
 async map(previous:SKUMapping,configuration:OptionRecord|null){
  const selection=configuration?{configuration_id:configuration.configuration_id,configuration_version:configuration.version,combination_code:previous.code}:null
  const value=mapping(await privateRequest(`/api/v1/admin/catalog/skus/${previous.sku_id}/options`,"PUT",{version:previous.version,mapping:selection}),previous.sku_id,previous.product_id)
  if(value.version!==previous.version+1||value.code!==previous.code)throw new Error("result_unknown")
  if(configuration&&(!value.mapping||value.mapping.configuration_id!==configuration.configuration_id||value.mapping.configuration_version!==configuration.version||!value.mapping.current||value.mapping.combination_code!==previous.code))throw new Error("result_unknown")
  if(!configuration&&value.mapping!==null)throw new Error("result_unknown")
  return value
 }
}
