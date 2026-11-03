"use client"

import {useEffect, useRef, useState, type MouseEvent} from "react"
import DashboardPage, {Glyph} from "../../design/DashboardPage"
import {customerApi, type CustomerRecord} from "./api"
import {sessionLifecycle} from "../identity/session-lifecycle"
import {commissionsApi,type CustomerCommission} from "./commissions-api"
import {downloadsApi,type CustomerDownload} from "./downloads-api"
import {ordersApi,orderMoney,type CustomerOrder} from "./orders-api"
import {useAccountAccess} from "../identity/use-account-access"
import "./customer-panel.css"

type Summary = Awaited<ReturnType<typeof customerApi.summary>>
const sectionNames: Record<string, [string, string, string]> = {
 orders: ["سفارش‌های من", "My orders", "box"],
 downloads: ["دانلودها", "Downloads", "download"],
 commissions: ["نقاشی‌های سفارشی", "Your commissions", "paint"],
 requests: ["درخواست‌های من", "My requests", "clock"],
}
export default function AccountPanel({path,navigate}:{path:string;navigate:(route:string)=>void}) {
 const access=useAccountAccess(),canReadOrders=access.status==="ready"&&!!access.access?.permissions.includes("orders.read_self")
 const [reviews,setReviews]=useState<CustomerCommission[]|null>(null)
 const [commerce,setCommerce]=useState<Awaited<ReturnType<typeof ordersApi.summary>>|null>(null)
 const [readyFiles,setReadyFiles]=useState<CustomerDownload[]|null>(null)
 const [orders,setOrders]=useState<CustomerOrder[]|null>(null)
 const en=path.startsWith("/en/"), prefix=en?"/en":"/fa", account=`${prefix}/account`
 const t=(fa:string,english:string)=>en?english:fa
 const section=path.split("/")[3] || "", unavailable=!!section
 const name=sectionNames[section] || ["این بخش حساب", "Account workflow", "clock"]
 const title=unavailable?name[en?1:0]:t("داشبورد شما","Your dashboard")
 const [summary,setSummary]=useState<Summary|null>(null), [updates,setUpdates]=useState<CustomerRecord[]>([])
 const [loading,setLoading]=useState(!unavailable), [error,setError]=useState(false)
 const generation=useRef(0)
 useEffect(()=>{
  const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setSummary(null);setUpdates([]);setOrders(null);setCommerce(null);setReviews(null);setReadyFiles(null)})
  return ()=>{generation.current++;clear()}
 },[])
 const load=async()=>{
  const stamp=++generation.current;setLoading(true);setError(false)
  try {
   const [totals,page,recent,counts,artworkReviews,files]=await Promise.all([customerApi.summary(),customerApi.list("notification"),canReadOrders?ordersApi.list().then(page=>page.items.slice(0,3)).catch(()=>null):Promise.resolve(null),canReadOrders?ordersApi.summary().catch(()=>null):Promise.resolve(null),commissionsApi.list(undefined,"awaiting_customer").then(page=>page.items.slice(0,3)).catch(()=>null),canReadOrders?downloadsApi.list().then(page=>page.items.slice(0,3)).catch(()=>null):Promise.resolve(null)])
   if(stamp!==generation.current)return
   setReadyFiles(files);setReviews(artworkReviews);setOrders(recent);setCommerce(counts);setSummary(totals);setUpdates(page.items.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,3))
  }catch{if(stamp===generation.current)setError(true)}
  finally{if(stamp===generation.current)setLoading(false)}
 }
 useEffect(()=>{
  if(unavailable)return
  void load()
  const unsubscribe=sessionLifecycle.subscribe(event=>{if(event.type==="revalidate")void load()})
  return ()=>{generation.current++;unsubscribe()}
 },[unavailable,canReadOrders])
 const follow=(route:string)=>(event:MouseEvent<HTMLAnchorElement>)=>{
  if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return
  event.preventDefault();navigate(route)
 }
 const link=(label:string,route:string,primary=false)=><a className={primary?"button primary":"text-link"} href={route} onClick={follow(route)}>{label}<Glyph name="arrow" size={16}/></a>
 const heading=(label:string,route?:string)=><div className="dash-section-heading"><h2>{label}</h2>{route&&link(t("مشاهده همه","View all"),route)}</div>
 return <DashboardPage page={path} navigate={navigate} renderMedia={()=>null} liveMode panelTitle={title} activeSection={section} notificationUnreadCount={summary?.unread_notifications ?? null}>
  <div className="customer-panel">
   <nav className="dash-breadcrumb" aria-label={t("مسیر صفحه","Breadcrumb")}>{link(t("حساب کاربری","Your account"),account)}<span>/</span><span aria-current="page">{title}</span></nav>
   <div className="dash-title-row"><div><div className="dash-greeting">{t("خوش آمدید به فضای هنری خود","Welcome to your little art space")}</div><h1>{title}</h1><p>{t("اطلاعات و اقدام‌های مهم حساب خود را اینجا ببینید.","Find your account information and important actions here.")}</p></div>{!unavailable&&<button className="button secondary" onClick={()=>void load()} disabled={loading}>{t("تازه‌سازی","Refresh")}</button>}</div>
   {unavailable?<section className="dash-card dash-empty"><span className="dash-empty-art"><Glyph name={name[2]} size={36}/></span><h2>{t("این بخش هنوز آماده نیست","This section is not available yet")}</h2><p>{section==="downloads"?t("فایل‌های نهایی آزادشده برای سفارش‌های دیجیتال را در بخش دانلودها ببینید. برای دریافت راهنمایی با پشتیبانی تماس بگیرید.","Private file downloads are currently unavailable. Contact support if you need help."):t("تاریخچه و وضعیت سفارش‌ها و درخواست‌ها فعلاً در دسترس نیست. برای دریافت راهنمایی با پشتیبانی تماس بگیرید.","Order and request history is currently unavailable. Contact support if you need help.")}</p><div>{link(t("بازگشت به داشبورد","Back to dashboard"),account,true)}{link(t("تماس با پشتیبانی","Contact support"),`${account}/support`)}</div></section>:<>
    {loading?<div className="dash-skeletons" aria-busy="true" aria-label={t("در حال دریافت داشبورد","Loading dashboard")}><div className="dash-stats">{[0,1,2,3].map(i=><div className="skeleton dash-skeleton-stat" key={i}/>)}</div><div className="skeleton dash-skeleton-orders"/></div>:error?<section className="dash-card dash-empty" role="alert"><Glyph name="clock" size={36}/><h2>{t("دریافت اطلاعات ممکن نشد","Unable to load your account")}</h2><p>{t("برای دریافت اطلاعات حساب دوباره تلاش کنید.","Try again to retrieve your account information.")}</p><button className="button primary" onClick={()=>void load()}>{t("تلاش دوباره","Try again")}</button></section>:summary&&<>
     <div className="dash-stats">{([
      ["heart",t("علاقه‌مندی‌ها","Favorites"),summary.favorites,"favorites"],
      ["pin",t("آدرس‌های ذخیره‌شده","Saved addresses"),summary.addresses,"addresses"],
      ["chat",t("تیکت‌های پشتیبانی","Support tickets"),summary.tickets,"support"],
      ["bell",t("اعلان‌های خوانده‌نشده","Unread notifications"),summary.unread_notifications,"notifications"],
     ] as const).map(([icon,label,count,slug])=><a className="dash-stat" key={slug} href={`${account}/${slug}`} onClick={follow(`${account}/${slug}`)}><span className="dash-stat-icon"><Glyph name={icon}/></span><strong>{count.toLocaleString(en?"en":"fa-IR")}</strong><span>{label}</span><Glyph name="arrow" size={15}/></a>)}</div>
     {canReadOrders&&<section aria-label={t("فعالیت سفارش‌های شما","Your order activity")}>{commerce?<div className="dash-stats">{([
      ["box",t("سفارش‌های ثبت‌شده","Recorded orders"),commerce.orders,"orders"],
      ["clock",t("سفارش‌های پرداخت‌شده در انتظار تحویل","Paid orders awaiting delivery"),commerce.awaiting_delivery,"orders"],
      ["chat",t("درخواست‌های فعال","Active requests"),commerce.active_requests,"requests"],
      ["download",t("فایل‌های آماده دانلود","Available downloads"),commerce.available_files,"downloads"],
     ] as const).map(([icon,label,count,slug])=><a className="dash-stat" key={label} href={`${account}/${slug}`} onClick={follow(`${account}/${slug}`)}><span className="dash-stat-icon"><Glyph name={icon}/></span><strong>{count.toLocaleString(en?"en":"fa-IR")}</strong><span>{label}</span><Glyph name="arrow" size={15}/></a>)}</div>:<div className="dash-card"><p>{t("دریافت آمار سفارش‌ها ممکن نشد.","Unable to load order activity.")}</p><button className="button secondary" onClick={()=>void load()}>{t("دریافت دوباره آمار","Retry activity")}</button></div>}</section>}
     <div className="dash-content-grid"><div className="dash-primary-column">
      <section>{heading(t("سفارش‌های شما","Your orders"),`${account}/orders`)}{orders?.length?<div>{orders.map(order=><article className="dash-card customer-order-card" key={order.id}><h3>{link(order.snapshot.reference,`${account}/orders/${order.id}`)}</h3><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleDateString(en?"en":"fa-IR",{timeZone:"Asia/Tehran"})}</time><p>{orderMoney(order.snapshot.total_amount,en,order.snapshot.currency)}</p></article>)}</div>:canReadOrders&&orders===null?<div className="dash-card dash-empty"><p>{t("دریافت سفارش‌های اخیر ممکن نشد.","Unable to load recent orders.")}</p><button className="button secondary" onClick={()=>void load()}>{t("تلاش دوباره","Try again")}</button></div>:<div className="dash-card dash-empty"><span className="dash-empty-art"><Glyph name="paint" size={36}/></span><h2>{t("انتخاب هنری بعدی شما از اینجا شروع می‌شود","Your next art discovery starts here")}</h2><p>{t("کالکشن‌ها و آثار را ببینید یا سفارش‌های ثبت‌شده برای حساب خود را مشاهده کنید.","Explore collections and artworks, or view orders recorded for your account.")}</p><div>{link(t("کشف کالکشن‌ها","Explore collections"),`${prefix}/collections`,true)}{link(t("دیدن نقاشی‌ها","Explore artworks"),`${prefix}/artworks`)}</div></div>}</section>
      <section>{heading(t("نقاشی‌های سفارشی","Your commissions"),`${account}/commissions`)}{reviews===null?<div className="dash-card"><p>{t("دریافت آثار منتظر بررسی ممکن نشد.","Unable to load artworks awaiting your review.")}</p><button className="button secondary" onClick={()=>void load()}>{t("دریافت دوباره آثار","Retry artworks")}</button></div>:reviews.length?<div>{reviews.map(item=><article className="dash-card customer-order-card" key={item.id}><h3>{item.brief.idea}</h3><p>{t("نسخه تازه اثر منتظر نظر شماست.","A new artwork version is awaiting your review.")}</p><time dateTime={item.updated_at}>{new Date(item.updated_at).toLocaleDateString(en?"en":"fa-IR",{timeZone:"Asia/Tehran"})}</time><p>{link(t("مشاهده نسخه و ثبت نظر","View version and give feedback"),`${account}/commissions/${item.id}/artwork-review`,true)}</p></article>)}</div>:<div className="dash-card dash-commission customer-commission"><span className="dash-private-art"><Glyph name="paint" size={28}/></span><div><h3>{t("یک اثر، فقط برای شما","A piece, just for you")}</h3><p>{t("ایده خود را برای یک نقاشی شخصی با ما در میان بگذارید.","Share your idea for a personal artwork with us.")}</p>{link(t("شروع سفارش نقاشی","Start a commission"),`${prefix}/commissions`)}</div></div>}</section>
      {canReadOrders&&<section aria-label={t("فایل‌های آماده شما","Your ready files")}>{heading(t("فایل‌های آماده شما","Your ready files"),`${account}/downloads`)}{readyFiles===null?<div className="dash-card dash-file"><p>{t("دریافت فایل‌های آماده ممکن نشد.","Unable to load ready files.")}</p><button className="text-link" onClick={()=>void load()}>{t("دریافت دوباره فایل‌ها","Retry files")}</button></div>:readyFiles.length?readyFiles.map(file=><article className="dash-card dash-file customer-ready-file" key={file.id}><span className="dash-file-icon"><Glyph name="download" size={24}/></span><div><h3><bdi>{file.file_name}</bdi></h3><p><bdi>{file.order_reference}</bdi> · {file.size.toLocaleString(en?"en":"fa-IR")} {t("بایت","bytes")}</p><span className="dash-ready"><Glyph name="check" size={13}/>{t("فایل مشتری · آماده دانلود","Customer file · Ready to download")}</span></div>{link(t("مشاهده و دانلود","View and download"),`${account}/downloads?order=${file.order_id}`)}</article>):<div className="dash-card dash-file"><p>{t("فایل آماده‌ای برای دانلود ندارید.","You have no files ready to download.")}</p></div>}</section>}
     </div><aside className="dash-secondary-column">
      <section>{heading(t("تازه‌های حساب شما","Your account updates"),`${account}/notifications`)}<div className="dash-card dash-updates">{updates.length?updates.map(item=><article className="dash-update" key={item.id}><Glyph name={item.data.category==="support"?"chat":"bell"}/><div><strong>{String(item.data[en?"title_en":"title_fa"] || t("اعلان حساب","Account notification"))}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(en?"en":"fa-IR",{timeZone:"Asia/Tehran",dateStyle:"medium",timeStyle:"short"})}</time>{link(t("مشاهده اعلان","View notification"),`${account}/notifications`)}</div></article>):<p>{t("هنوز اعلانی برای حساب شما ثبت نشده است.","No notifications have been recorded for your account yet.")}</p>}</div></section>
      <section>{heading(t("دسترسی سریع","Quick access"))}<div className="dash-card dash-quick">{[["user","profile","ویرایش پروفایل","Edit profile"],["pin","addresses","مدیریت آدرس‌ها","Manage addresses"],["shield","security","امنیت حساب","Account security"],["chat","support","پشتیبانی","Support"]].map(([icon,slug,fa,english])=><a key={slug} href={`${account}/${slug}`} onClick={follow(`${account}/${slug}`)}><Glyph name={icon}/><span>{t(fa,english)}</span><Glyph name="arrow" size={16}/></a>)}</div></section>
     </aside></div>
    </>}
   </>}
   <footer className="dash-footer"><span>{t("هنر، همراه لحظه‌های شما","Art, alongside your everyday")}</span><small>MADE WITH CARE, KEPT WITH LOVE</small></footer>
  </div>
 </DashboardPage>
}
