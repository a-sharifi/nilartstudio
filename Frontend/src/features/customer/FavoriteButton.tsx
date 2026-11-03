"use client"
import {useEffect,useRef,useState,type ReactNode} from "react"
import {customerApi,type CustomerRecord} from "./api"
import {useAccountAccess} from "../identity/use-account-access"
import {sessionLifecycle} from "../identity/session-lifecycle"
export default function FavoriteButton({kind,id,language,children,className="icon-button"}:{kind:"product"|"bundle"|"artwork";id:string;language:0|1;children:ReactNode;className?:string}){
 const access=useAccountAccess(),[saved,setSaved]=useState<CustomerRecord|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[checked,setChecked]=useState(false),[revision,setRevision]=useState(0)
 const generation=useRef(0),lock=useRef(false),en=language===1
 const canWrite=access.status==="ready" && !!access.access?.permissions.includes("account.write_self")
 useEffect(()=>{
  setSaved(null);setChecked(false);setError("")
  if(access.status!=="ready")return
  let active=true;const stamp=++generation.current
  const load=async()=>{
   try{const records=await customerApi.all("favorite");if(active&&stamp===generation.current){setSaved(records.find(row=>row.data.kind===kind && row.data.target_id===id)||null);setChecked(true)}}
   catch{if(active&&stamp===generation.current)setError(en?"Unable to check favorites. Reload before making changes.":"بررسی علاقه‌مندی‌ها ممکن نشد. پیش از تغییر دوباره دریافت کنید.")}
  }
  void load()
  const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setSaved(null);setChecked(false);setError("")})
  return()=>{active=false;generation.current++;clear()}
 },[access.status,access.access?.owner,id,kind,en,revision])
 const toggle=async()=>{
  if(lock.current)return
  if(access.status==="denied"){location.assign(`/${en?"en":"fa"}/auth/login?returnTo=${encodeURIComponent(location.pathname)}`);return}
  if(!checked || !canWrite)return
  lock.current=true;setBusy(true);setError("");const stamp=generation.current
  try{if(saved){await customerApi.remove("favorite",saved.id,saved.version);if(stamp===generation.current)setSaved(null)}else{const result=await customerApi.save("favorite",crypto.randomUUID(),0,{kind,target_id:id});if(stamp===generation.current)setSaved(result)}}
  catch{if(stamp===generation.current){setChecked(false);setError(en?"Favorite change was not confirmed. Reload before retrying.":"تغییر علاقه‌مندی تأیید نشد. پیش از تکرار دوباره دریافت کنید.")}}
  finally{lock.current=false;setBusy(false)}
 }
 const disabled=busy || access.status==="checking" || access.status==="unavailable" || (access.status==="ready" && (!checked || !canWrite))
 return <><button className={`${className}${saved?" favorite-active saved":""}`} type="button" aria-label={saved?(en?"Remove favorite":"حذف از علاقه‌مندی‌ها"):(en?"Save to favorites":"ذخیره در علاقه‌مندی‌ها")} aria-pressed={!!saved} disabled={disabled} onClick={()=>void toggle()}>{children}</button>{error&&<span role="alert" className="checkout-field-error">{error}<button type="button" className="text-link" disabled={busy} onClick={()=>setRevision(value=>value+1)}>{en?"Reload favorites":"دریافت دوباره علاقه‌مندی‌ها"}</button></span>}</>
}
