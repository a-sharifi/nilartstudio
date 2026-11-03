import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),date=z.iso.datetime({offset:true})
const payment=z.object({id:uuid,order_id:uuid,status:z.enum(["requesting","pending","paid","cancelled","failed","unknown"]),reference:z.string().nullable(),amount_rial:z.string().regex(/^\d+$/),sandbox:z.literal(true),inquiry_available:z.boolean(),version:z.number().int().nonnegative(),updated_at:date})
const command=z.object({expected_version:z.number().int().nonnegative(),reason:z.string().trim().min(1).max(1000)})
const inquiry=z.object({id:uuid,payment_id:uuid,actor_id:uuid,intent:command,before:payment,result:payment,created_at:date})
export type AdminPayment=z.infer<typeof payment>
export type PaymentInquiry=z.infer<typeof inquiry>
export type InquiryCommand=z.infer<typeof command>
function check(raw:unknown,id:string,key:string,body:InquiryCommand){const r=inquiry.parse(raw);if(r.id!==key||r.payment_id!==id||r.before.id!==id||r.result.id!==id||r.before.order_id!==r.result.order_id||r.before.amount_rial!==r.result.amount_rial||r.intent.reason!==body.reason||r.intent.expected_version!==body.expected_version||r.before.version!==body.expected_version||r.result.version<=r.before.version)throw new Error("result_unknown");return r}
const base="/api/v1/admin/payments"
export const paymentsApi={
 async list(order?:string,status?:string,cursor?:string){const q=new URLSearchParams();if(order)q.set("order_id",order);if(status)q.set("status",status);if(cursor)q.set("cursor",cursor);const r=z.object({items:z.array(payment),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}?${q}`));if(order&&r.items.some(p=>p.order_id!==order))throw new Error("result_unknown");return r},
 async history(id:string,cursor?:string){const r=z.object({items:z.array(inquiry),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/${id}/inquiries${cursor?`?cursor=${cursor}`:""}`));if(r.items.some(p=>p.payment_id!==id||p.result.id!==id||p.before.id!==id))throw new Error("result_unknown");return r},
 async saved(id:string,key:string,body:InquiryCommand){return check(await privateRequest(`${base}/${id}/inquiries/${key}`),id,key,body)},
 async inquire(id:string,key:string,input:InquiryCommand){const body=command.parse(input);let raw:unknown;try{raw=await privateRequest(`${base}/${id}/inquiries/${key}`,"PUT",body)}catch(error){const code=error instanceof Error?error.message:"";if(code.startsWith("payment_")||["permission_denied","unauthenticated","origin_invalid","csrf_invalid","sandbox_unavailable","validation_error"].includes(code))throw error;throw new Error("result_unknown")}try{return check(raw,id,key,body)}catch{throw new Error("result_unknown")}}
}
