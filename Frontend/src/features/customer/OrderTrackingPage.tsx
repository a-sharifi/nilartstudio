"use client"
import {useEffect,useRef,useState} from "react"
import {useAccountAccess} from "../identity/use-account-access"
import {accountAccessStore} from "../identity/access-store"
import {ordersApi,type CustomerOrder} from "./orders-api"
import "../content/approved-content.css"
import "./order-tracking-page.css"
const paymentLabels:Record<string,[string,string]>={pending:["در انتظار پرداخت","Awaiting payment"],verification:["در حال بررسی پرداخت","Payment under review"],paid:["پرداخت‌شده","Paid"],failed:["پرداخت ناموفق","Payment failed"],partially_refunded:["بازپرداخت جزئی","Partially refunded"],refunded:["بازپرداخت‌شده","Refunded"]}
const deliveryLabels:Record<string,[string,string]>={unshipped:["ارسال‌نشده","Not shipped"],partial:["تحویل جزئی","Partially delivered"],shipped:["ارسال‌شده","Shipped"],delivered:["تحویل‌شده","Delivered"],cancelled:["لغوشده","Cancelled"],on_hold:["در انتظار بررسی","On hold"]}
export default function OrderTrackingPage({language}:{language:0|1}){
 const en=language===1,locale=en?"en":"fa",t=(fa:string,english:string)=>en?english:fa,access=useAccountAccess()
 const allowed=access.status==="ready"&&!!access.access?.permissions.includes("orders.read_self")
 const [query,setQuery]=useState(""),[rows,setRows]=useState<CustomerOrder[]>([]),[cursor,setCursor]=useState<string|null>(null),[loadedOwner,setLoadedOwner]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(false)
 const applied=useRef(""),generation=useRef(0),lock=useRef(false)
 async function load(q:string,next?:string){
  if(!allowed||lock.current)return
  const stamp=++generation.current;lock.current=true;setBusy(true);setError(false)
  if(!next){setRows([]);setCursor(null)}
  try{const result=await ordersApi.list(next,{q});if(stamp===generation.current){setRows(old=>next?[...new Map([...old,...result.items].map(row=>[row.id,row])).values()]:result.items);setCursor(result.next_cursor);setLoadedOwner(access.access?.owner||null)}}
  catch{if(stamp===generation.current)setError(true)}finally{if(stamp===generation.current){setBusy(false);lock.current=false}}
 }
 useEffect(()=>{
  generation.current++;lock.current=false;setRows([]);setCursor(null);setQuery("");applied.current="";setError(false);setBusy(false)
  if(allowed)void load("")
  return()=>{generation.current++;lock.current=false}
 },[allowed,access.access?.owner])
 return <div className="approved-content tracking-live" dir={en?"ltr":"rtl"}><div className="container">
  <nav className="approved-breadcrumb" aria-label={t("مسیر صفحه","Breadcrumb")}><a href={`/${locale}`}>{t("خانه","Home")}</a><span>/</span><span>{t("پیگیری سفارش","Track order")}</span></nav>
  <header className="approved-hero"><div><p className="approved-eyebrow">NILART · FROM OUR STUDIO TO YOUR DOOR</p><h1>{t("پیگیری سفارش","Track your order")}</h1><p className="approved-description">{t("وضعیت پرداخت، آماده‌سازی و ارسال خریدتان را از همین‌جا دنبال کنید.","Follow payment, preparation and delivery updates for your purchases.")}</p></div></header>
  {access.status==="checking"?<p className="approved-state" role="status">{t("در حال بررسی حساب…","Checking your account…")}</p>:access.status==="unavailable"?<div className="tracking-entry"><p role="alert">{t("بررسی حساب ممکن نشد؛ دوباره تلاش کنید.","Could not check your account. Please try again.")}</p><button className="button secondary" onClick={()=>void accountAccessStore.refresh()}>{t("تلاش دوباره","Try again")}</button></div>:!allowed?<div className="tracking-entry"><h2>{t("با شماره‌ای که خرید کرده‌اید وارد شوید","Sign in with the phone used for your order")}</h2><p>{t("برای حفظ حریم خصوصی، جزئیات سفارش فقط در حساب صاحب سفارش نمایش داده می‌شود. پس از ورود، سفارش موردنظر را انتخاب کنید.","Order details are available only to their owner. Sign in, then choose the order you want to track.")}</p><a className="button primary" href={`/${locale}/auth/login?returnTo=${encodeURIComponent(`/${locale}/track-order`)}`}>{t("ورود و پیگیری سفارش","Sign in to track an order")}</a></div>:<section className="tracking-orders" aria-label={t("سفارش‌های شما","Your orders")}>
   <form className="tracking-search" onSubmit={event=>{event.preventDefault();applied.current=query.trim();void load(applied.current)}}><label htmlFor="tracking-reference">{t("شماره سفارش یا نام کالا","Order reference or item name")}</label><div><input id="tracking-reference" type="search" maxLength={200} value={query} onChange={event=>setQuery(event.target.value)} placeholder={t("شماره سفارش را وارد کنید…","Enter an order reference…")}/><button className="button primary" disabled={busy}>{t("جستجو","Search")}</button></div></form>
   {busy&&<p role="status" aria-busy="true">{t("در حال دریافت سفارش‌ها…","Loading your orders…")}</p>}
   {error?<div role="alert"><p>{t("دریافت سفارش‌ها ممکن نشد. اطلاعات جستجو حفظ شده است.","Could not load orders. Your search has been retained.")}</p><button className="button secondary" disabled={busy} onClick={()=>void load(applied.current)}>{t("تلاش دوباره","Try again")}</button></div>:!busy&&!rows.length?<div className="tracking-empty"><h2>{t("سفارشی پیدا نشد","No orders found")}</h2><p>{t("شماره سفارش را بررسی کنید و مطمئن شوید با حساب خریدار وارد شده‌اید.","Check the reference and make sure you are signed in with the purchasing account.")}</p></div>:null}
   <div className="tracking-order-grid">{(loadedOwner===access.access?.owner?rows:[]).map(order=><article className="tracking-order" key={order.id}><header><h2><bdi>{order.snapshot.reference}</bdi></h2><time dateTime={order.created_at}>{new Intl.DateTimeFormat(en?"en":"fa-IR",{dateStyle:"medium"}).format(new Date(order.created_at))}</time></header><p>{order.snapshot.items.map(item=>en?item.title_en:item.title_fa).join(en?", ":"، ")}</p><dl><div><dt>{t("پرداخت","Payment")}</dt><dd>{paymentLabels[order.state.payment]?.[language]||order.state.payment}</dd></div><div><dt>{t("تحویل","Delivery")}</dt><dd>{deliveryLabels[order.state.fulfillment]?.[language]||order.state.fulfillment}</dd></div></dl><a className="button secondary" href={`/${locale}/account/orders/${order.id}`}>{t("جزئیات و رهگیری مرسوله","Order details and shipment tracking")}<span aria-hidden="true">↗</span></a></article>)}</div>
   {cursor&&!error&&<button className="button secondary" disabled={busy} onClick={()=>void load(applied.current,cursor)}>{t("سفارش‌های بیشتر","More orders")}</button>}
  </section>}
  <div className="tracking-support"><div><h2>{t("برای پیگیری کمک می‌خواهید؟","Need help with an order?")}</h2><p>{t("شماره سفارش یا رسید پرداخت را آماده داشته باشید.","Have your order reference or payment receipt ready.")}</p></div><a href="tel:+989120829872" dir="ltr">{t("۰۹۱۲۰۸۲۹۸۷۲","09120829872")}</a></div>
  <nav className="approved-related" aria-label={t("راهنما","Help")}><a href={`/${locale}/returns`}>{t("لغو و مرجوعی","Cancellations and returns")}</a><a href={`/${locale}/faq`}>{t("سؤالات متداول","FAQ")}</a></nav>
 </div></div>
}
