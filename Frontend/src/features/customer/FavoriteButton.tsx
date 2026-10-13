"use client"
import {useEffect,useRef,useState,type ReactNode} from "react"
import {customerApi,type CustomerRecord} from "./api"
import {useAccountAccess} from "../identity/use-account-access"
import {sessionLifecycle} from "../identity/session-lifecycle"
export default function FavoriteButton({kind,id,language,children}:{kind:"product"|"bundle"|"artwork";id:string;language:0|1;children:ReactNode}){
 const access=useAccountAccess(),[saved,setSaved]=useState<CustomerRecord|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),generation=useRef(0),lock=useRef(false),en=language===1
 useEffect(()=>{setSaved(null);if(access.status!=="ready")return;let active=true;const stamp=++generation.current;const load=async()=>{try{let page=await customerApi.list("favorite");const records=page.items;while(page.next_cursor){page=await customerApi.list("favorite",page.next_cursor);records.push(...page.items)}if(active&&stamp===generation.current)setSaved(records.find(row=>row.data.kind===kind && row.data.target_id===id)||null)}catch{if(active)setError(en?"Unable to check favorites.":"بررسی علاقه‌مندی‌ها ممکن نشد.")}};void load();const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setSaved(null);setError("")});return()=>{active=false;generation.current++;clear()}},[access.status,id,kind,en])
 const toggle=async()=>{
  if(lock.current)return
  if(access.status!=="ready"){location.assign(`/${en?"en":"fa"}/auth/login?returnTo=${encodeURIComponent(location.pathname)}`);return}
  lock.current=true;setBusy(true);setError("");const stamp=generation.current
  try{if(saved){await customerApi.remove("favorite",saved.id,saved.version);if(stamp===generation.current)setSaved(null)}else{const result=await customerApi.save("favorite",crypto.randomUUID(),0,{kind,target_id:id});if(stamp===generation.current)setSaved(result)}}catch{if(stamp===generation.current)setError(en?"Favorite change was not confirmed. Refresh before retrying.":"تغییر علاقه‌مندی تأیید نشد. پیش از تکرار صفحه را تازه کنید.")}finally{lock.current=false;setBusy(false)}
 }
 return <><button className={`icon-button${saved?" favorite-active":""}`} type="button" aria-label={saved?(en?"Remove favorite":"حذف از علاقه‌مندی‌ها"):(en?"Save to favorites":"ذخیره در علاقه‌مندی‌ها")} aria-pressed={!!saved} disabled={busy || access.status==="checking" || access.status==="unavailable"} onClick={()=>void toggle()}>{children}</button>{error&&<span role="alert" className="checkout-field-error">{error}</span>}</>
}
