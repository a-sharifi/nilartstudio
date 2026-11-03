"use client"
import {OrderProductLink,OrderProductThumbnail} from "./OrderProduct"
import Dropdown from "../../components/ui/Dropdown"
import {Glyph} from "../../design/DashboardPage"
import {orderMoney,type CustomerOrder} from "./orders-api"
import "./orders-list.css"

type Shared={en:boolean;states:Record<string,[string,string]>}
type Toolbar=Shared&{busy:boolean;query:string;applied:string;payment:string;fulfillment:string;setQuery:(value:string)=>void;setApplied:(value:string)=>void;setPayment:(value:string)=>void;setFulfillment:(value:string)=>void;refresh:()=>void}
export function OrdersListToolbar({en,states,busy,query,applied,payment,fulfillment,setQuery,setApplied,setPayment,setFulfillment,refresh}:Toolbar){
 const t=(fa:string,english:string)=>en?english:fa
 const filtered=!!applied||!!payment||!!fulfillment
 return <>
  <div className="ol-heading"><div><span className="ol-eyebrow">{t("حساب کاربری / سفارش‌ها","YOUR ACCOUNT / ORDERS")}</span><h1>{t("سفارش‌های من","My orders")}</h1><p>{t("از ثبت سفارش تا دریافت؛ جزئیات خریدهای شما اینجاست.","Your purchases, delivery updates and order details in one place.")}</p></div><button className="ol-refresh" disabled={busy} onClick={refresh}><Glyph name="refresh" size={17}/>{t("تازه‌سازی","Refresh")}</button></div>
  <section className="ol-toolbar" aria-label={t("جستجو و فیلتر سفارش‌ها","Order search and filters")}>
   <form className="ol-search" onSubmit={event=>{event.preventDefault();setApplied(query.trim())}}><label htmlFor="ol-search">{t("جستجوی شماره سفارش، کالا یا کد کالا","Search order reference, item or SKU")}</label><div><span aria-hidden="true"><Glyph name="search" size={20}/></span><input id="ol-search" type="search" maxLength={200} placeholder={t("شماره سفارش یا نام کالا…","Order number or item name…")} value={query} onChange={event=>setQuery(event.target.value)}/><button type="submit" disabled={busy}>{t("جستجو","Search")}</button></div></form>
   <div className="ol-filter-grid"><div className="ol-filter-field"><label htmlFor="ol-payment">{t("وضعیت پرداخت","Payment status")}</label><Dropdown id="ol-payment" label={t("وضعیت پرداخت","Payment status")} disabled={busy} value={payment} onChange={setPayment} options={[{value:"",label:t("همه پرداخت‌ها","All payments")},...["pending","verification","paid","failed","partially_refunded","refunded"].map(value=>({value,label:states[value][en?1:0]}))]}/></div><div className="ol-filter-field"><label htmlFor="ol-fulfillment">{t("وضعیت تحویل","Delivery status")}</label><Dropdown id="ol-fulfillment" label={t("وضعیت تحویل","Delivery status")} disabled={busy} value={fulfillment} onChange={setFulfillment} options={[{value:"",label:t("همه وضعیت‌های تحویل","All delivery states")},...["unshipped","partial","shipped","delivered","cancelled","on_hold"].map(value=>({value,label:states[value][en?1:0]}))]}/></div></div>
   {filtered&&<div className="ol-applied"><p>{applied?<>{t("نتایج برای","Results for")}: <bdi>{applied}</bdi></>:t("نمایش سفارش‌ها با وضعیت انتخاب‌شده","Showing orders with the selected status")}</p><button type="button" disabled={busy} onClick={()=>{setQuery("");setApplied("");setPayment("");setFulfillment("")}}>{t("پاک کردن فیلترها","Clear filters")}</button></div>}
  </section>
 </>
}
export function OrdersListCards({items,en,states,base,navigate}:{items:CustomerOrder[];base:string;navigate:(route:string)=>void}&Shared){
 const t=(fa:string,english:string)=>en?english:fa
 const account=base.replace(/\/orders$/,"")
 return <section className="ol-history" aria-label={t("تاریخچه سفارش‌ها","Order history")}><div className="ol-history-heading"><h2>{t("تاریخچه سفارش‌ها","Order history")}</h2><span>{items.length.toLocaleString(en?"en":"fa-IR")} {t("سفارش نمایش‌داده‌شده","orders shown")}</span></div><div className="ol-cards">{items.map(item=>{
 const physical=item.snapshot.items.some(line=>line.delivery==="physical"),digital=item.snapshot.items.some(line=>line.delivery==="digital")
 const href=`${base}/${item.id}`
 return <article className="ol-card" key={item.id}>
  <div className="ol-card-top"><div className="ol-reference"><span>{t("شماره سفارش","Order reference")}</span><h3><a href={href} onClick={event=>{event.preventDefault();navigate(href)}}><bdi>{item.snapshot.reference}</bdi></a></h3><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(en?"en":"fa-IR",{timeZone:"Asia/Tehran",year:"numeric",month:"long",day:"numeric"})}</time></div><div className="ol-badges"><span className={`ol-badge ${item.state.payment==="paid"?"is-paid":""}`}><i aria-hidden="true"/>{states[item.state.payment][en?1:0]}</span><span className="ol-badge">{states[item.state.fulfillment][en?1:0]}</span></div></div>
  <ul className="ol-items">{item.snapshot.items.slice(0,3).map(line=><li key={line.id}><OrderProductThumbnail entry={item.catalog_items?.[line.id]} title={en?line.title_en:line.title_fa} en={en} navigate={navigate}/><div><strong><OrderProductLink entry={item.catalog_items?.[line.id]} en={en} navigate={navigate} className="order-product-name">{en?line.title_en:line.title_fa}</OrderProductLink></strong>{(en?line.options_en:line.options_fa)&&<p>{en?line.options_en:line.options_fa}</p>}<span>{t("تعداد","Quantity")}: {line.quantity.toLocaleString(en?"en":"fa-IR")}</span></div></li>)}</ul>
  {item.snapshot.items.length>3&&<p className="ol-more-items">+ {(item.snapshot.items.length-3).toLocaleString(en?"en":"fa-IR")} {t("قلم دیگر در جزئیات سفارش","more items in order details")}</p>}
  <div className="ol-card-bottom"><div className="ol-total"><span>{t("مبلغ کل سفارش","Order total")}</span><strong>{orderMoney(item.snapshot.total_amount,en,item.snapshot.currency)}</strong><small>{physical&&digital?t("تحویل فیزیکی و دیجیتال","Physical & digital delivery"):digital?t("تحویل دیجیتال","Digital delivery"):t("تحویل فیزیکی","Physical delivery")}</small></div><div className="ol-card-actions">{digital&&<a className="ol-secondary-link" href={`${account}/downloads?order=${item.id}`} onClick={event=>{event.preventDefault();navigate(`${account}/downloads?order=${item.id}`)}}>{t("فایل‌های سفارش","Order files")}</a>}<a className="ol-detail-link" href={href} onClick={event=>{event.preventDefault();navigate(href)}}>{t("مشاهده جزئیات سفارش","View order details")}<span aria-hidden="true">{en?"→":"←"}</span></a></div></div>
 </article>
 })}</div></section>
}
