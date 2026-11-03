import {z} from "zod"
import {privateRequest} from "./identity-api"
const count=z.number().int().nonnegative(),uuid=z.string().uuid(),amount=z.string().regex(/^\d+(?:\.\d+)?$/)
export const workspaceProduct=z.object({id:uuid,slug:z.string(),title_fa:z.string(),title_en:z.string(),published:z.boolean(),version:count,collections:z.array(z.object({id:uuid,title_fa:z.string(),title_en:z.string()})),thumbnail_url:z.string().nullable(),sku_count:count,published_sku_count:count,unpriced_sku_count:count,prices:z.array(z.object({currency:z.enum(["IRT","IRR"]),minimum:amount,maximum:amount}))})
const pageSchema=z.object({items:z.array(workspaceProduct),total:count,counts:z.object({total:count,published:count,draft:count,attention:count}),page:z.number().int().positive(),page_size:z.number().int().positive()})
export type WorkspaceProduct=z.infer<typeof workspaceProduct>
export type ProductFilters={q:string;status:"all"|"published"|"draft";collection:string;attention:boolean;sort:"name"|"name_desc"|"drafts_first";page:number}
export const productsWorkspaceApi={async list(filters:ProductFilters,language:"fa"|"en"){
 const query=new URLSearchParams({q:filters.q,status:filters.status,attention:String(filters.attention),sort:filters.sort,page:String(filters.page),page_size:"24",language})
 if(filters.collection)query.set("collection",filters.collection)
 const result=pageSchema.parse(await privateRequest(`/api/v1/admin/catalog/product-workspace?${query}`))
 if(result.page!==filters.page||result.items.length>result.page_size)throw new Error("result_unknown")
 return result
}}
export function exactProductMoney(value:string,en:boolean,currency:"IRT"|"IRR"){
 const [whole,fraction=""]=value.split("."),trimmed=fraction.replace(/0+$/,"")
 const number=BigInt(whole).toLocaleString(en?"en":"fa-IR")+(trimmed?(en?".":"٫")+(en?trimmed:trimmed.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)])):"")
 return `${number} ${currency==="IRT"?(en?"toman":"تومان"):(en?"rial":"ریال")}`
}
