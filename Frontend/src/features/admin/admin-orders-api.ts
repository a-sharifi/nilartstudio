import {z} from "zod"
import {privateRequest} from "./identity-api"
import {order} from "../customer/orders-api"
const schema=order.extend({created_at:z.iso.datetime({offset:true}),updated_at:z.iso.datetime({offset:true}),snapshot:order.shape.snapshot.extend({receipt:order.shape.snapshot.shape.receipt.unwrap().extend({issued_at:z.iso.datetime({offset:true})}).nullable()})})
export const adminOrdersApi={
 async list(cursor?:string,filters?:{q:string;payment:string;fulfillment:string}){const query=new URLSearchParams({limit:"50"});if(cursor)query.set("cursor",cursor);if(filters?.q)query.set("q",filters.q);if(filters?.payment)query.set("payment",filters.payment);if(filters?.fulfillment)query.set("fulfillment",filters.fulfillment);return z.object({items:z.array(schema),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/admin/orders?${query}`))},
 async detail(id:string){const value=schema.parse(await privateRequest(`/api/v1/admin/orders/${id}`));if(value.id!==id)throw new Error("result_unknown");return value}
}
