import {z} from "zod"
import {privateRequest} from "../admin/identity-api"
export {readSupportFile} from "./support-file-formats"
const record=z.object({id:z.string().uuid(),ticket_id:z.string().uuid(),file_name:z.string(),size:z.number().int().positive().max(5242880),sha256:z.string().regex(/^[0-9a-f]{64}$/),created_at:z.string()})
export type SupportAttachment=z.infer<typeof record>
export const attachmentBase=(staff:boolean)=>staff?"/api/v1/admin/support":"/api/v1/account/support"
export const supportAttachmentsApi={
 async list(ticket:string,staff=false){const value=z.array(record).max(5).parse(await privateRequest(`${attachmentBase(staff)}/${ticket}/attachments`));if(value.some(file=>file.ticket_id!==ticket))throw new Error("result_unknown");return value},
 async upload(ticket:string,id:string,file_name:string,content_base64:string,size:number,staff=false){const value=record.parse(await privateRequest(`${attachmentBase(staff)}/${ticket}/attachments/${id}`,"PUT",{file_name,content_base64}));if(value.id!==id||value.ticket_id!==ticket||value.file_name!==file_name||value.size!==size)throw new Error("result_unknown");return value},
}
