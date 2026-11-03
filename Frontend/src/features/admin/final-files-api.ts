import {z} from "zod"
import {privateRequest} from "./identity-api"
const record=z.object({id:z.string().uuid(),order_id:z.string().uuid(),line_id:z.string().uuid(),file_name:z.string(),description:z.string(),size:z.number().int().positive().max(16777216),sha256:z.string().regex(/^[a-f0-9]{64}$/),version:z.number().int().nonnegative(),created_at:z.string(),updated_at:z.string(),order_reference:z.string(),active:z.boolean()})
export type FinalFile=z.infer<typeof record>
export type FileRelease={order_id:string;line_id:string;file_name:string;description:string;content_base64:string}
export const finalFilesApi={
 async list(order:string,cursor?:string){const value=z.object({items:z.array(record),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/admin/downloads?order_id=${order}${cursor?`&cursor=${cursor}`:""}`));if(value.items.some(item=>item.order_id!==order))throw new Error("result_unknown");return value},
 async detail(id:string){const value=record.parse(await privateRequest(`/api/v1/admin/downloads/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async release(id:string,body:FileRelease,size:number,sha256:string){const value=await privateRequest(`/api/v1/admin/downloads/${id}`,"PUT",body);const saved=record.omit({active:true}).parse(value);if(saved.id!==id||saved.order_id!==body.order_id||saved.line_id!==body.line_id||saved.file_name!==body.file_name||saved.description!==body.description||saved.size!==size||saved.sha256!==sha256)throw new Error("result_unknown");return {...saved,active:true}},
 async revoke(item:FinalFile,reason:string){const value=record.omit({active:true}).parse(await privateRequest(`/api/v1/admin/downloads/${item.id}/revoke`,"PUT",{version:item.version,reason}));if(value.id!==item.id||value.order_id!==item.order_id||value.version!==item.version+1||value.sha256!==item.sha256)throw new Error("result_unknown");return {...value,active:false}},
}
export async function readFinalFile(file:File){
 if(!file.name.trim()||!file.size||file.size>16777216||file.name.trim().length>200||/[\/\\\p{C}]/u.test(file.name)||[".",".."].includes(file.name.trim()))throw new Error("invalid_file")
 const bytes=new Uint8Array(await file.arrayBuffer());let binary=""
 for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192))
 const hash=await crypto.subtle.digest("SHA-256",bytes);return {data:btoa(binary),sha256:Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("")}
}
