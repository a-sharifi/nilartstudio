"use client"
import {AdminButton,AdminTable} from "../../components/admin/AdminUI"
import {useEffect,useRef,useState} from "react"
import {sessionLifecycle} from "../identity/session-lifecycle"
import {adminCatalogApi,type PriceRecord} from "./catalog-api"
export default function PriceHistory({record,en}:{record:PriceRecord;en:boolean}){
 const t=(fa:string,english:string)=>en?english:fa
 const [rows,setRows]=useState<Awaited<ReturnType<typeof adminCatalogApi.priceHistory>>["items"]>([]),[before,setBefore]=useState<number|null>(null),[loaded,setLoaded]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("")
 const revision=useRef(0),lock=useRef(false)
 useEffect(()=>{const unregister=sessionLifecycle.registerPrivateCache(()=>{revision.current++;setRows([]);setBefore(null);setLoaded(false);setLoading(false);setError("")});return()=>{revision.current++;unregister()}},[])
 async function load(append=false){
  if(lock.current)return
  lock.current=true;setLoading(true);setError("");const current=revision.current
  try{const page=await adminCatalogApi.priceHistory(record.sku_id,record.product_id,append&&before?before:undefined);if(current!==revision.current)return;setRows(old=>append?[...old,...page.items]:page.items);setBefore(page.next_before_version);setLoaded(true)}catch{if(current===revision.current)setError(t("دریافت تاریخچه قیمت ممکن نشد.","Unable to load price history."))}finally{lock.current=false;if(current===revision.current)setLoading(false)}
 }
 const amount=(value:PriceRecord["price"])=>value?`${value.amount} ${value.currency}`:t("بدون قیمت","Unpriced")
 return <div className="catalog-audit"><h3>{t("تاریخچه قیمت SKU","SKU price history")}</h3><p>{t("مبلغ‌ها دقیق‌اند؛ تبدیل واحد پول یا تغییر موجودی انجام نمی‌شود.","Amounts are exact; history does not convert currencies or change inventory.")}</p><AdminButton type="button" className="button secondary" disabled={loading} onClick={()=>void load()}>{t("دریافت تاریخچه قیمت","Load price history")}</AdminButton>{loading&&<p role="status">{t("در حال دریافت…","Loading history…")}</p>}{error&&<p role="alert">{error}</p>}{loaded&&!rows.length&&<p>{t("تغییر قیمتی ثبت نشده است.","No price changes recorded.")}</p>}{rows.map(row=><article className="catalog-audit" key={row.id}><h4>{t("نسخه","Version")} {row.previous_version} → {row.version}</h4><p>{new Intl.DateTimeFormat(en?"en":"fa",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Tehran"}).format(new Date(row.created_at))}</p><p>{t("عامل تغییر","Changed by")}: <bdi>{row.actor_id}</bdi></p><div className="identity-accounts"><AdminTable className="ad-table"><thead><tr><th>{t("قبل","Before")}</th><th>{t("بعد","After")}</th></tr></thead><tbody><tr><td><bdi>{amount(row.before.price)}</bdi></td><td><bdi>{amount(row.after.price)}</bdi></td></tr></tbody></AdminTable></div></article>)}{before&&<AdminButton type="button" className="button secondary" disabled={loading} onClick={()=>void load(true)}>{t("تاریخچه قدیمی‌تر قیمت","Older price history")}</AdminButton>}</div>
}
