import {z} from "zod"
import {privateRequest} from "./identity-api"
const base=z.object({id:z.string().uuid(),version:z.number().int().nonnegative(),created_at:z.iso.datetime({offset:true}),updated_at:z.iso.datetime({offset:true})})
const ticket=base.extend({kind:z.literal("ticket"),data:z.object({subject:z.string(),body:z.string(),topic:z.string(),status:z.enum(["submitted","awaiting_reply","awaiting_customer","closed"])})})
const message=base.extend({kind:z.literal("message"),data:z.object({ticket_id:z.string().uuid(),body:z.string(),author:z.enum(["customer","support"]),request_id:z.string().uuid()})})
export type SupportTicket=z.infer<typeof ticket>
export type SupportMessage=z.infer<typeof message>
const path="/api/v1/admin/customer/tickets"
export const supportAdminApi={
 async list(cursor?:string,status?:SupportTicket["data"]["status"],search?:string){const query=new URLSearchParams();if(cursor)query.set("cursor",cursor);if(status)query.set("status",status);if(search)query.set("q",search);return z.object({items:z.array(ticket),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${path}${query.size?`?${query}`:""}`))},
 async ticket(id:string){const value=ticket.parse(await privateRequest(`${path}/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async messages(id:string,cursor?:string,requestId?:string){const value=z.object({items:z.array(message),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${path}/${id}/messages${requestId?`?request_id=${requestId}`:cursor?`?cursor=${cursor}`:""}`));if(value.items.some(m=>m.data.ticket_id!==id))throw new Error("result_unknown");return value},
 async audits(id:string,cursor?:string){return z.object({items:z.array(z.object({id:z.string().uuid(),actor_id:z.string().uuid().nullable(),created_at:z.iso.datetime({offset:true}),action:z.enum(["customer.support_reply","customer.support_state"]),reason:z.string(),changes:z.object({record_id:z.literal(id),before:z.string().optional(),after:z.string().optional(),previous_version:z.number().int().optional(),version:z.number().int().optional()})})),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${path}/${id}/audits${cursor?`?cursor=${cursor}`:""}`))},
 async state(record:SupportTicket,status:"closed"|"submitted",reason:string){const value=ticket.parse(await privateRequest(`${path}/${record.id}/state`,"PUT",{version:record.version,status,reason}));if(value.id!==record.id||value.version!==record.version+1||value.data.status!==status)throw new Error("result_unknown");return value},
 async reply(record:SupportTicket,body:string,request_id:string){const value=message.parse(await privateRequest(`${path}/${record.id}/reply`,"POST",{version:record.version,body,request_id}));if(value.data.ticket_id!==record.id||value.data.body!==body||value.data.request_id!==request_id||value.data.author!=="support")throw new Error("result_unknown");return value}
}
