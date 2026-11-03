"use client"
import {AdminButton} from "../../components/admin/AdminUI"
import {useEffect,useRef,useState} from "react"
import {z} from "zod"
import {privateRequest} from "./identity-api"
import {sessionLifecycle} from "../identity/session-lifecycle"
const schema=z.object({total_tickets:z.number().int().nonnegative(),statuses:z.record(z.string(),z.number().int().nonnegative())})
export default function SupportSummary({en,base,navigate}:{en:boolean;base:string;navigate:(path:string)=>void}){
 const t=(fa:string,english:string)=>en?english:fa,[value,setValue]=useState<z.infer<typeof schema>|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("")
 const generation=useRef(0),lock=useRef(false)
 async function load(){if(lock.current)return;lock.current=true;setLoading(true);setError("");const revision=generation.current;try{const result=schema.parse(await privateRequest("/api/v1/admin/customer/ticket-summary"));if(revision===generation.current)setValue(result)}catch{if(revision===generation.current)setError(t("دریافت نمای پشتیبانی ممکن نشد.","Unable to load support overview."))}finally{if(revision===generation.current){lock.current=false;setLoading(false)}}}
 useEffect(()=>{const unregister=sessionLifecycle.registerPrivateCache(()=>{generation.current++;lock.current=false;setValue(null);setLoading(false);setError("")});void load();return()=>{generation.current++;lock.current=false;unregister()}},[])
 const format=(n:number)=>new Intl.NumberFormat(en?"en":"fa").format(n)
 const labels={submitted:t("ثبت‌شده","Submitted"),awaiting_reply:t("منتظر پاسخ پشتیبانی","Awaiting staff reply"),awaiting_customer:t("منتظر مشتری","Awaiting customer"),closed:t("بسته","Closed")}
 return <section className="ad-panel" aria-label={t("نمای پشتیبانی","Support overview")}><div className="ad-panel-head"><h2>{t("نمای پشتیبانی","Support overview")}</h2><AdminButton className="button secondary" disabled={loading} onClick={()=>void load()}>{t("تازه‌سازی نمای پشتیبانی","Refresh support overview")}</AdminButton></div>{loading&&<p role="status">{t("در حال دریافت…","Loading support overview…")}</p>}{error&&<p role="alert">{error}</p>}{value&&<><p>{t("کل تیکت‌ها","Total tickets")}: <strong>{format(value.total_tickets)}</strong></p>{value.total_tickets===0&&<p>{t("تیکتی ثبت نشده است.","No tickets recorded.")}</p>}<div className="ad-lower-grid">{Object.entries(labels).map(([status,label])=><p key={status}>{label}: <strong>{format(value.statuses[status]||0)}</strong></p>)}</div><AdminButton className="button secondary" onClick={()=>navigate(`${base}/support`)}>{t("باز کردن صندوق پشتیبانی","Open support inbox")}</AdminButton></>}</section>
}
