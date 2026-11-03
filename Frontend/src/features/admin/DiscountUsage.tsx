"use client"
import {AdminButton} from "../../components/admin/AdminUI"
import {useEffect,useRef,useState} from "react"
import {z} from "zod"
import {privateRequest} from "./identity-api"
import {sessionLifecycle} from "../identity/session-lifecycle"
export default function DiscountUsage({id,en}:{id:string;en:boolean}){
 const t=(fa:string,english:string)=>en?english:fa,[data,setData]=useState<{redeemed:number;reserved:number}|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false),generation=useRef(0),lock=useRef(false)
 useEffect(()=>{const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;lock.current=false;setData(null);setError("");setBusy(false)});return()=>{generation.current++;clear()}},[])
 async function load(){if(lock.current)return;lock.current=true;setBusy(true);setError("");const stamp=generation.current;try{const value=z.object({redeemed:z.number().int().nonnegative(),reserved:z.number().int().nonnegative()}).parse(await privateRequest(`/api/v1/admin/discounts/rules/${id}/usage`));if(stamp===generation.current)setData(value)}catch{if(stamp===generation.current)setError(t("دریافت مصرف ممکن نشد.","Unable to load usage."))}finally{if(stamp===generation.current){lock.current=false;setBusy(false)}}}
 return <section className="catalog-audit"><h3>{t("مصرف کد","Code usage")}</h3><AdminButton className="button secondary" disabled={busy} onClick={()=>void load()}>{t("دریافت مصرف ثبت‌شده","Load recorded usage")}</AdminButton>{error&&<p role="alert">{error}</p>}{data&&<p>{t("مصرف قطعی","Redeemed")}: {data.redeemed} · {t("رزرو پرداخت","Reserved for payment")}: {data.reserved}</p>}<p>{t("رزرو پرداخت نامشخص یا قابل ادامه تا تعیین نتیجه حفظ می‌شود؛ تلاش ردشده پیش از ساخت درگاه مصرف قطعی نیست.","Uncertain or resumable payments retain their reservation until resolved. A rejected gateway request is not a redemption.")}</p></section>
}
