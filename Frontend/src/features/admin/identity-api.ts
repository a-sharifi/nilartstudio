import { z } from "zod"
import {sessionLifecycle} from "../identity/session-lifecycle"
export const accountSchema=z.object({id:z.string().uuid(),phone:z.string(),phone_verified:z.boolean(),blocked:z.boolean(),version:z.number().int().nonnegative(),roles:z.array(z.enum(["customer","artist","operations","finance","admin"])),overrides:z.record(z.string(),z.boolean()),permissions:z.array(z.string())})
export type ManagedAccount=z.infer<typeof accountSchema>
export class ManagementApiError extends Error {}
export async function privateRequest(path:string,method="GET",body?:unknown) {
 const revision=sessionLifecycle.capture()
 const current=()=>{if(!sessionLifecycle.current(revision))throw new ManagementApiError("permission_denied")}
 const headers:Record<string,string>={Accept:"application/json"}
 try {
  if(method!=="GET"){
   const csrf=await fetch("/api/v1/auth/session/csrf",{method:"POST",credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(10000)})
   current()
   if(csrf.status===401){sessionLifecycle.observe(null,revision);throw new ManagementApiError("unauthenticated")}
   if(!csrf.ok)throw new ManagementApiError("csrf_invalid")
   const data=z.object({csrf_token:z.string().min(1)}).parse(await csrf.json());current()
   headers["X-CSRF-Token"]=data.csrf_token
   if(body!==undefined)headers["Content-Type"]="application/json"
  }
  const response=await fetch(path,{method,headers,credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(15000),body:body===undefined?undefined:JSON.stringify(body)})
  current()
  if(response.status===401){sessionLifecycle.observe(null,revision);throw new ManagementApiError("unauthenticated")}
  if(!response.ok){const error=await response.json();current();throw new ManagementApiError(typeof error.code==="string"?error.code:"service_unavailable")}
  if(response.status===204)return null
  const data:unknown=await response.json();current();return data
 } catch(error){if(error instanceof ManagementApiError)throw error;throw new ManagementApiError("result_unknown")}
}
export const identityManagementApi={
 async list(cursor?:string){return z.object({items:z.array(accountSchema),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`/api/v1/admin/identity/accounts${cursor?`?cursor=${encodeURIComponent(cursor)}`:""}`))},
 async permissions(){return z.array(z.string()).parse(await privateRequest("/api/v1/admin/identity/permissions"))},
 async update(account:ManagedAccount,reason:string){const result=accountSchema.parse(await privateRequest(`/api/v1/admin/identity/accounts/${account.id}/access`,"PUT",{version:account.version,roles:account.roles,overrides:account.overrides,blocked:account.blocked,reason}));if(result.id!==account.id)throw new ManagementApiError("result_unknown");return result},
 async audits(id:string){return z.array(z.object({id:z.string().uuid(),actor_id:z.string().uuid().nullable(),account_id:z.string().uuid(),action:z.string(),reason:z.string(),created_at:z.string(),changes:z.record(z.string(),z.unknown())})).parse(await privateRequest(`/api/v1/admin/identity/accounts/${id}/audits`))}
}
