"use client"
import {useEffect,useRef,useState} from "react"
import {requestTracking,type RequestTracking} from "./orders-api"
import {sessionLifecycle} from "../identity/session-lifecycle"
const labels={submitted:["ثبت درخواست","Request submitted"],in_review:["شروع بررسی","Review started"],approved:["تأیید برای پردازش","Approved for processing"],rejected:["رد درخواست","Request rejected"],completed:["تکمیل ثبت‌شده","Recorded completion"]}
export default function RequestTrackingDetails({id,en}:{id:string;en:boolean}){
 const t=(fa:string,english:string)=>en?english:fa
 const [value,setValue]=useState<RequestTracking|null>(null),[error,setError]=useState(false),[loading,setLoading]=useState(true),[reload,setReload]=useState(0),generation=useRef(0)
 useEffect(()=>{const stamp=++generation.current;setValue(null);setError(false);setLoading(true);const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setValue(null);setError(false);setLoading(false)});void requestTracking(id).then(result=>{if(stamp===generation.current)setValue(result)}).catch(()=>{if(stamp===generation.current)setError(true)}).finally(()=>{if(stamp===generation.current)setLoading(false)});return()=>{generation.current++;clear()}},[id,reload])
 return <section aria-label={t("پیگیری درخواست","Request tracking")}>
 {loading&&<p role="status">{t("در حال دریافت تاریخچه…","Loading history…")}</p>}{error&&<><p role="alert">{t("دریافت تاریخچه درخواست ممکن نشد.","Unable to load request history.")}</p><button className="button secondary" onClick={()=>setReload(old=>old+1)}>{t("دریافت دوباره تاریخچه","Retry history")}</button></>}
 {value&&<><h3>{value.order_reference}</h3><h4>{t("اقلام درخواست","Requested items")}</h4><ul>{value.items.map(item=><li key={item.id}><span>{en?item.title_en:item.title_fa}</span>{(en?item.options_en:item.options_fa)&&<span> · {en?item.options_en:item.options_fa}</span>} · {t("تعداد","Quantity")}: {item.quantity.toLocaleString(en?"en":"fa-IR")}</li>)}</ul><h4>{t("تاریخچه بررسی","Review history")}</h4><ol>{value.history.map(event=><li key={event.version}><strong>{labels[event.status][en?1:0]}</strong><p><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString(en?"en":"fa-IR",{timeZone:"Asia/Tehran"})}</time></p>{event.reply&&<p style={{whiteSpace:"pre-wrap"}}>{event.reply}</p>}</li>)}</ol></>}
 </section>
}
