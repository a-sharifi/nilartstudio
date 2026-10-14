import {z} from "zod"
import {privateRequest} from "../admin/identity-api"
import {sessionLifecycle} from "./session-lifecycle"
import type {PasswordDraft} from "../../design/security"
const sessionsSchema=z.array(z.object({id:z.string().uuid(),created_at:z.string().datetime(),expires_at:z.string().datetime(),current:z.boolean()}))
export const securityApi={
 subscribe:sessionLifecycle.subscribe,
 registerPrivateCache:sessionLifecycle.registerPrivateCache.bind(sessionLifecycle),
 async load(){
  const revision=sessionLifecycle.capture()
  const [profileValue,sessionValue,methodValue]=await Promise.all([privateRequest("/api/v1/account/profile"),privateRequest("/api/v1/account/security/sessions"),privateRequest("/api/v1/account/security/methods")])
  const profile=z.object({account_id:z.string().uuid(),phone:z.string()}).parse(profileValue)
  const sessions=sessionsSchema.parse(sessionValue)
  if(!sessionLifecycle.observe(profile.account_id,revision))throw new Error("unauthenticated")
  const methods=z.object({password_enabled:z.boolean(),otp_enabled:z.boolean(),can_change:z.boolean(),sandbox_sms:z.boolean()}).parse(methodValue)
  return {sandboxSms:methods.sandbox_sms,owner:profile.account_id,passwordEnabled:methods.password_enabled,otpEnabled:methods.otp_enabled,phoneVerified:true,maskedPhone:profile.phone.slice(0,5)+"••••"+profile.phone.slice(-4),canChange:methods.can_change,minimum:8,sessionPolicy:"all-sessions" as const,sessionsEnabled:true,canManageSessions:methods.can_change,sessions:sessions.map(row=>({id:row.id,current:row.current,device:["نشست حساب","Account session"] as [string,string],lastActivity:row.created_at}))}
 },
 async change(draft:PasswordDraft){const result=z.object({reauthenticate:z.literal(true)}).parse(await privateRequest("/api/v1/account/security/password","POST",{current_password:draft.current,new_password:draft.next}));sessionLifecycle.authenticated(null,sessionLifecycle.capture());return result},
 async revoke(ids:string[]){for(const id of ids)await privateRequest(`/api/v1/account/security/sessions/${encodeURIComponent(id)}`,"DELETE")}
}
export type LiveSecurityApi=typeof securityApi
