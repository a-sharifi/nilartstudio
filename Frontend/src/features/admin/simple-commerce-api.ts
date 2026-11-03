import {z} from 'zod'
import {privateRequest} from './identity-api'
const variant=z.object({id:z.string().uuid(),product_id:z.string().uuid().optional(),code:z.string(),options_fa:z.string().default(''),options_en:z.string().default(''),title_fa:z.string(),title_en:z.string(),sale_price:z.string().nullable(),currency:z.string().nullable(),price_version:z.number(),unit_cost:z.string().nullable(),cost_version:z.number(),quantity:z.string(),reserved:z.string(),available:z.string(),stock_version:z.number(),average_cost:z.string().nullable()})
export type SimpleVariant=z.infer<typeof variant>
export type SimpleEdit={sku_id:string;kind:'variant'|'purchase';cost_version:number;stock_version:number;price_version:number;unit_cost:string;sale_price:string|null;quantity:number;supplier:string;document_date:string;reason:string}
const receipt=z.object({id:z.string().uuid(),sku_id:z.string().uuid(),kind:z.enum(['variant','purchase']),quantity:z.number(),total_cost:z.string(),intent:z.unknown()})
export const simpleApi={
 async variant(id:string){const r=variant.parse(await privateRequest(`/api/v1/admin/simple/variants/${id}`));if(r.id!==id)throw Error('result_unknown');return r},
 async variants(q:string,page:number){return z.object({items:z.array(variant),total:z.number(),page:z.number()}).parse(await privateRequest(`/api/v1/admin/simple/variants?${new URLSearchParams({q,page:String(page)})}`))},
 async save(key:string,body:SimpleEdit){const r=receipt.parse(await privateRequest(`/api/v1/admin/simple/commands/${key}`,'PUT',body));if(r.id!==key||r.sku_id!==body.sku_id)throw Error('result_unknown');return r},
 async receipt(key:string){return receipt.parse(await privateRequest(`/api/v1/admin/simple/commands/${key}`))},
 async purchases(page:number){return z.object({items:z.array(z.object({id:z.string(),code:z.string(),title_fa:z.string(),title_en:z.string(),intent:z.object({quantity:z.number(),unit_cost:z.string(),supplier:z.string(),document_date:z.string()}),result:z.object({total_cost:z.string()}),created_at:z.string()})),total:z.number()}).parse(await privateRequest(`/api/v1/admin/simple/purchases?page=${page}`))},
 async profit(){return z.object({currency:z.literal('IRT'),sales:z.string(),refunds:z.string(),net_sales:z.string(),cost_of_sales:z.string(),expenses:z.string(),profit:z.string().nullable(),incomplete_lines:z.number(),orders:z.number(),purchases:z.string()}).parse(await privateRequest('/api/v1/admin/simple/profit'))}
}
