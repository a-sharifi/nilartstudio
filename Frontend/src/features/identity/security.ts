import {z} from "zod"
import {privateRequest} from "../admin/identity-api"
import {sessionLifecycle} from "./session-lifecycle"
import type {PasswordDraft} from "../../design/security"
export const securityApi={
 subscribe:sessionLifecycle.subscribe,
 registerPrivateCache:sessionLifecycle.registerPrivateCache.bind(sessionLifecycle),
 async load(){
  const revision=sessionLifecycle.capture()
  const [profileValue,methodValue]=await Promise.all([privateRequest("/api/v1/account/profile"),privateRequest("/api/v1/account/security/methods")])
  const profile=z.object({account_id:z.string().uuid(),phone:z.string()}).parse(profileValue)
  if(!sessionLifecycle.observe(profile.account_id,revision))throw new Error("unauthenticated")
  const methods=z.object({password_enabled:z.boolean(),otp_enabled:z.boolean(),can_change:z.boolean(),sandbox_sms:z.boolean()}).parse(methodValue)
  return {sandboxSms:methods.sandbox_sms,owner:profile.account_id,passwordEnabled:methods.password_enabled,otpEnabled:methods.otp_enabled,phoneVerified:true,maskedPhone:profile.phone.slice(0,5)+"••••"+profile.phone.slice(-4),canChange:methods.can_change,minimum:8,sessionPolicy:"all-sessions" as const}
 },
 async change(draft:PasswordDraft){const result=z.object({reauthenticate:z.literal(true)}).parse(await privateRequest("/api/v1/account/security/password","POST",{current_password:draft.current,new_password:draft.next}));sessionLifecycle.authenticated(null,sessionLifecycle.capture());return result},
}
export type LiveSecurityApi=typeof securityApi
