import {z} from "zod"
import {privateRequest,ManagementApiError} from "../admin/identity-api"
import {sessionLifecycle} from "../identity/session-lifecycle"
const file=z.object({id:z.string().uuid(),order_id:z.string().uuid(),line_id:z.string().uuid(),file_name:z.string().min(1).max(200),description:z.string(),size:z.number().int().positive().max(16777216),sha256:z.string().regex(/^[a-f0-9]{64}$/),version:z.number().int().nonnegative(),created_at:z.string(),updated_at:z.string(),order_reference:z.string()})
export type CustomerDownload=z.infer<typeof file>
export const downloadsApi={
 async list(cursor?:string,orderId?:string,q?:string){const value=z.object({items:z.array(file),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/account/downloads?limit=50${cursor?`&cursor=${encodeURIComponent(cursor)}`:""}${orderId?`&order_id=${encodeURIComponent(orderId)}`:""}${q?`&q=${encodeURIComponent(q)}`:""}`));if(orderId&&value.items.some(item=>item.order_id!==orderId))throw new ManagementApiError("result_unknown");return value},
 async content(item:CustomerDownload,signal:AbortSignal){
  const revision=sessionLifecycle.capture(),current=()=>{if(!sessionLifecycle.current(revision)||signal.aborted)throw new ManagementApiError("permission_denied")}
  const response=await fetch(`/api/v1/account/downloads/${item.id}/content`,{credentials:"same-origin",cache:"no-store",redirect:"error",signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])})
  current()
  if(response.status===401){sessionLifecycle.observe(null,revision);throw new ManagementApiError("unauthenticated")}
  if(!response.ok)throw new ManagementApiError("file_unavailable")
  if(response.headers.get("Content-Type")?.split(";")[0]!=="application/octet-stream")throw new ManagementApiError("file_integrity_error")
  const blob=await response.blob();current()
  if(blob.size!==item.size)throw new ManagementApiError("file_integrity_error")
  const hash=await crypto.subtle.digest("SHA-256",await blob.arrayBuffer());current()
  const digest=Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,"0")).join("")
  if(digest!==item.sha256)throw new ManagementApiError("file_integrity_error")
  return blob
 }
}
