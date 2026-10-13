"use client"
import {useEffect,useRef,useState} from "react"
import {z} from "zod"
import DashboardPage,{Glyph} from "../../design/DashboardPage"
import AuthPasswordInput from "../../design/AuthPasswordInput"
import {privateRequest} from "../admin/identity-api"
import {sessionLifecycle} from "./session-lifecycle"
import "../../design/security.css"
export default function PhoneChangePage({path,navigate}:{path:string;navigate:(route:string)=>void}){
 const en=path.startsWith("/en/"),t=(fa:string,english:string)=>en?english:fa
 const [phone,setPhone]=useState(""),[password,setPassword]=useState(""),[code,setCode]=useState(""),[visible,setVisible]=useState(false),[challenge,setChallenge]=useState<{challenge_id:string;expires_at:string;sandbox:boolean}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(false),[unknown,setUnknown]=useState(false)
 const generation=useRef(0),lock=useRef(false)
 useEffect(()=>{const clear=()=>{generation.current++;setPhone("");setPassword("");setCode("");setChallenge(null);setVisible(false);setError("")};const unregister=sessionLifecycle.registerPrivateCache(clear);return()=>{generation.current++;unregister()}},[])
 const submit=async()=>{
  if(lock.current || unknown)return
  lock.current=true;setBusy(true);setError("")
  const request=generation.current
  try{
   if(challenge){
    z.object({reauthenticate:z.literal(true)}).parse(await privateRequest("/api/v1/account/security/phone/verify","POST",{challenge_id:challenge.challenge_id,code:code.replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))}))
    if(request!==generation.current)return
    sessionLifecycle.authenticated(null,sessionLifecycle.capture());setSuccess(true)
   }else{
    const value=z.object({challenge_id:z.string().uuid(),expires_at:z.string().datetime(),sandbox:z.boolean()}).parse(await privateRequest("/api/v1/account/security/phone/request","POST",{phone,current_password:password}))
    if(request!==generation.current)return
    setChallenge(value);setPassword("");setVisible(false)
   }
  }catch(error){if(request!==generation.current)return;const key=error instanceof Error?error.message:"";if(key==="result_unknown")setUnknown(true);setError(key==="incorrect_current_password"?t("رمز فعلی درست نیست.","Current password is incorrect."):key==="phone_unavailable"?t("این شماره قابل استفاده نیست.","This phone number is unavailable."):key==="invalid_or_expired_challenge"?t("کد اشتباه یا منقضی شده است.","Code is incorrect or expired."):key==="rate_limited"?t("تعداد تلاش‌ها محدود شده است؛ بعداً تلاش کنید.","Too many attempts; try again later."):key==="result_unknown"?t("نتیجه تأیید نشده است؛ پیش از تلاش دوباره نشست و شماره حساب را بررسی کنید.","Result unconfirmed; check your session and account phone before retrying."):t("تغییر شماره تأیید نشد.","Phone change was not confirmed."))}
  finally{lock.current=false;setBusy(false)}
 }
 return <DashboardPage page={path} navigate={navigate} renderMedia={()=>null} activeSection="security" panelTitle={t("تغییر شماره تلفن","Change phone number")} liveMode><div className="security-page"><div className="security-heading"><div><h1>{t("تغییر شماره تلفن","Change phone number")}</h1><p>{t("رمز فعلی و کد تأیید شماره جدید لازم است. پس از تأیید، همه نشست‌ها پایان می‌یابند.","Your current password and a code sent to the new number are required. Confirmation ends all sessions.")}</p></div><Glyph name="shield" size={31}/></div>{success?<section className="security-state security-success"><h2>{t("شماره تأیید و تغییر کرد.","Phone number verified and changed.")}</h2><a className="button primary" href={`/${en?"en":"fa"}/auth/login`}>{t("ورود دوباره","Sign in again")}</a></section>:<section className="security-card"><form onSubmit={event=>{event.preventDefault();void submit()}}><label htmlFor="new-phone">{t("شماره جدید","New phone number")}</label><input id="new-phone" type="tel" dir="ltr" value={phone} disabled={busy || !!challenge || unknown} onChange={event=>setPhone(event.target.value)} required/>{challenge?<><p role="status">{challenge.sandbox?t("کد آزمایشی در صندوق پیامک محلی است؛ پیامک واقعی ارسال نشده است.","The test code is in the local SMS inbox; no real SMS was sent."):t("کد تأیید درخواست شد.","Verification code requested.")}</p><label htmlFor="phone-code">{t("کد تأیید","Verification code")}</label><input id="phone-code" dir="ltr" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} disabled={busy || unknown} onChange={event=>setCode(event.target.value)} required/></>:<><label htmlFor="phone-current-password">{t("رمز فعلی","Current password")}</label><AuthPasswordInput id="phone-current-password" label={t("رمز فعلی","Current password")} value={password} visible={visible} disabled={busy || unknown} autoComplete="current-password" en={en} onChange={setPassword} onToggle={()=>setVisible(value=>!value)}/></>}{error&&<p className="security-operation-error" role="alert">{error}</p>}<button className="button primary" disabled={busy || unknown}>{busy?t("در حال بررسی…","Checking…"):challenge?t("تأیید و تغییر شماره","Confirm and change phone"):t("درخواست کد تأیید","Request verification code")}</button></form><a className="text-link" href={`/${en?"en":"fa"}/account/security`}>{t("بازگشت به امنیت حساب","Back to account security")}</a></section>}</div></DashboardPage>
}
