"use client"
import {AdminButton} from "../../components/admin/AdminUI"
import {useEffect,useRef,useState} from "react"
import {z} from "zod"
import {privateRequest} from "./identity-api"
import {sessionLifecycle} from "../identity/session-lifecycle"
const schema=z.object({total_commissions:z.number().int().nonnegative(),statuses:z.record(z.string(),z.number().int().nonnegative())})
export default function CommissionSummary({en,base,navigate}:{en:boolean;base:string;navigate:(path:string)=>void}){
 const t=(fa:string,english:string)=>en?english:fa,[value,setValue]=useState<z.infer<typeof schema>|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("")
 const generation=useRef(0),lock=useRef(false)
 async function load(){if(lock.current)return;lock.current=true;setLoading(true);setError("");const revision=generation.current;try{const result=schema.parse(await privateRequest("/api/v1/admin/commissions/overview/summary"));if(revision===generation.current)setValue(result)}catch{if(revision===generation.current)setError(t("دریافت نمای سفارش‌های نقاشی ممکن نشد.","Unable to load commission overview."))}finally{if(revision===generation.current){lock.current=false;setLoading(false)}}}
 useEffect(()=>{const unregister=sessionLifecycle.registerPrivateCache(()=>{generation.current++;lock.current=false;setValue(null);setLoading(false);setError("")});void load();return()=>{generation.current++;lock.current=false;unregister()}},[])
 const format=(n:number)=>new Intl.NumberFormat(en?"en":"fa").format(n)
 const labels={awaiting_review:t("منتظر بررسی","Awaiting review"),in_progress:t("در حال اجرا","In progress"),awaiting_customer:t("منتظر مشتری","Awaiting customer"),revision_requested:t("نیازمند اصلاح","Revision requested"),approved:t("تأییدشده","Approved"),cancelled:t("لغوشده","Cancelled")}

 return <section className="ad-panel" aria-label={t("نمای سفارش‌های نقاشی","Commission overview")}><div className="ad-panel-head"><h2>{t("نمای سفارش‌های نقاشی","Commission overview")}</h2><AdminButton className="button secondary" disabled={loading} onClick={()=>void load()}>{t("تازه‌سازی نمای سفارش‌های نقاشی","Refresh commission overview")}</AdminButton></div>{loading&&<p role="status">{t("در حال دریافت…","Loading commission overview…")}</p>}{error&&<p role="alert">{error}</p>}{value&&<><p>{t("کل سفارش‌های نقاشی","Total commissions")}: <strong>{format(value.total_commissions)}</strong></p>{value.total_commissions===0&&<p>{t("سفارش نقاشی ثبت نشده است.","No commissions recorded.")}</p>}<div className="ad-lower-grid">{Object.entries(labels).map(([status,label])=><p key={status}>{label}: <strong>{format(value.statuses[status]||0)}</strong></p>)}</div><AdminButton className="button secondary" onClick={()=>navigate(`${base}/commissions`)}>{t("باز کردن صف سفارش‌های نقاشی","Open commission queue")}</AdminButton></>}</section>
}
