import {z} from "zod"
import {privateRequest} from "./identity-api"
const record=z.object({initiated_by_staff:z.boolean().optional(),id:z.string().uuid(),order_id:z.string().uuid(),version:z.number().int().nonnegative(),kind:z.enum(["cancellation","return"]),status:z.enum(["submitted","in_review","approved","rejected","completed"]),public_reply:z.string(),payload:z.object({reason:z.string(),quantities:z.record(z.string(),z.number().int().positive())}),created_at:z.string(),updated_at:z.string()})
export type ReviewRequest=z.infer<typeof record>
export type ReviewIntent={version:number;status:"in_review"|"approved"|"rejected";reply:string}
const base="/api/v1/admin/order-requests"
export const orderReviewApi={
 async list(cursor?:string,filters?:{q:string;status?:ReviewRequest["status"];kind?:ReviewRequest["kind"];order_id?:string}){const query=new URLSearchParams({limit:"50"});if(cursor)query.set("cursor",cursor);if(filters?.q)query.set("q",filters.q);if(filters?.status)query.set("status",filters.status);if(filters?.order_id)query.set("order_id",z.string().uuid().parse(filters.order_id));if(filters?.kind)query.set("kind",filters.kind);return z.object({items:z.array(record),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${base}?${query}`))},
 async history(id:string,cursor?:string){return z.object({items:z.array(z.object({id:z.string().uuid(),request_id:z.literal(id),actor_id:z.string().uuid(),status:z.enum(["in_review","approved","rejected"]),reply:z.string(),expected_version:z.number().int().nonnegative(),created_at:z.iso.datetime({offset:true})})),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${base}/${id}/reviews${cursor?`?cursor=${cursor}`:""}`))},
 async detail(id:string){const value=record.parse(await privateRequest(`${base}/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async review(id:string,key:string,intent:ReviewIntent){const value=record.parse(await privateRequest(`${base}/${id}/reviews/${key}`,"PUT",intent));if(value.id!==id||value.version!==intent.version+1||value.status!==intent.status||value.public_reply!==intent.reply)throw new Error("result_unknown");return value},
}
