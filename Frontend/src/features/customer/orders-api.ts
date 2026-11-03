import {z} from "zod"
import {stockComponent} from "../payments/stock-review"
import {privateRequest} from "../admin/identity-api"
const amount=z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/)
const receipt=z.object({number:z.string(),issued_at:z.string(),paid_amount:amount})
const catalogItem=z.object({kind:z.enum(["products","bundles","artworks"]),slug:z.string().min(1),image_url:z.string().nullable().optional()})
export const order=z.object({catalog_items:z.record(z.string().uuid(),catalogItem).optional(),return_available:z.record(z.string().uuid(),z.number().int().nonnegative()).optional(),active_request_id:z.string().uuid().nullable().optional(),id:z.string().uuid(),version:z.number().int().nonnegative(),created_at:z.string(),updated_at:z.string(),snapshot:z.object({checkout_terms:z.object({settings_version:z.number().int(),policy:z.object({tax_included:z.boolean().optional(),included_tax_amount:amount.optional(),return_days:z.number().int(),return_policy_fa:z.string(),return_policy_en:z.string()}),lines:z.array(z.object({basket_line_id:z.string(),parts:z.array(z.object({delivery:z.enum(['physical','digital']),license_fa:z.string().optional(),license_en:z.string().optional()}))}))}).nullable().optional(),reference:z.string(),currency:z.enum(["IRT","IRR"]),items:z.array(z.object({id:z.string().uuid(),title_fa:z.string(),title_en:z.string(),sku:z.string(),options_fa:z.string(),options_en:z.string(),quantity:z.number().int().positive(),unit_amount:amount,discount_amount:amount,delivery:z.enum(["physical","digital"]),returnable:z.boolean(),commission_id:z.string().uuid().nullable().optional(),stock_components:z.array(stockComponent).nullable().optional()})),shipping_amount:amount,tax_amount:amount,total_amount:amount,recipient:z.string(),address:z.string(),receipt:receipt.nullable()}),state:z.object({digital_delivered:z.record(z.string(),z.number().int().nonnegative()).optional(),payment:z.enum(["pending","verification","paid","failed","partially_refunded","refunded"]),fulfillment:z.enum(["unshipped","partial","shipped","delivered","cancelled","on_hold"]),delivered:z.record(z.string(),z.number().int().nonnegative()),return_until:z.string().nullable(),refunded_amount:amount})})
export type CustomerOrder=z.infer<typeof order>
export const ordersApi={
 async summary(){return z.object({orders:z.number().int().nonnegative(),awaiting_delivery:z.number().int().nonnegative(),active_requests:z.number().int().nonnegative(),available_files:z.number().int().nonnegative()}).parse(await privateRequest("/api/v1/account/orders/summary"))},
 async list(cursor?:string,filters?:{q?:string;payment?:CustomerOrder["state"]["payment"];fulfillment?:CustomerOrder["state"]["fulfillment"]}){const query=new URLSearchParams({limit:"50"});if(cursor)query.set("cursor",cursor);if(filters?.q)query.set("q",filters.q);if(filters?.payment)query.set("payment",filters.payment);if(filters?.fulfillment)query.set("fulfillment",filters.fulfillment);return z.object({items:z.array(order),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/account/orders?${query}`))},
 async detail(id:string){return order.parse(await privateRequest(`/api/v1/account/orders/${encodeURIComponent(id)}`))},
}
// Format the stored amount without a floating-point conversion or a currency conversion.
export function orderMoney(value:string,en:boolean,currency:"IRT"|"IRR"){
 const [whole,fraction]=value.split(".");const number=BigInt(whole).toLocaleString(en?"en":"fa-IR")+(fraction?`${en?".":"٫"}${en?fraction:fraction.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)])}`:"")
 return `${number} ${currency==="IRT"?(en?"toman":"تومان"):(en?"rial":"ریال")}`
}
const request=z.object({initiated_by_staff:z.boolean().optional(),version:z.number().int().nonnegative().default(0),public_reply:z.string().default(""),id:z.string().uuid(),order_id:z.string().uuid(),kind:z.enum(["cancellation","return"]),status:z.enum(["submitted","in_review","approved","rejected","completed"]),payload:z.object({reason:z.string(),quantities:z.record(z.string(),z.number().int().positive())}),created_at:z.string(),updated_at:z.string()})
export type OrderRequest=z.infer<typeof request>
export const orderRequestsApi={
 async list(cursor?:string,filters?:{q?:string;kind?:OrderRequest["kind"];status?:OrderRequest["status"]}){const query=new URLSearchParams({limit:"50"});if(cursor)query.set("cursor",cursor);if(filters?.q)query.set("q",filters.q);if(filters?.kind)query.set("kind",filters.kind);if(filters?.status)query.set("status",filters.status);return z.object({items:z.array(request),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/account/requests?${query}`))},
 async detail(id:string){return request.parse(await privateRequest(`/api/v1/account/requests/${encodeURIComponent(id)}`))},
 async submit(orderId:string,id:string,body:{version:number;kind:"cancellation"|"return";reason:string;quantities:Record<string,number>}){return request.parse(await privateRequest(`/api/v1/account/orders/${orderId}/requests/${id}`,"PUT",body))},
}

const tracking=z.object({request_id:z.string().uuid(),order_reference:z.string(),items:z.array(z.object({id:z.string().uuid(),title_fa:z.string(),title_en:z.string(),options_fa:z.string(),options_en:z.string(),quantity:z.number().int().positive()})),history:z.array(z.object({status:z.enum(["submitted","in_review","approved","rejected","completed"]),reply:z.string(),created_at:z.string(),version:z.number().int().nonnegative()}))})
export type RequestTracking=z.infer<typeof tracking>
export async function requestTracking(id:string){const value=tracking.parse(await privateRequest(`/api/v1/account/requests/${encodeURIComponent(id)}/tracking`));if(value.request_id!==id)throw new Error("result_unknown");return value}
