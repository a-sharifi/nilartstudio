"use client"
import type {ReactNode} from "react"
import {OrderProductLink,OrderProductThumbnail} from "./OrderProduct"
import RefundTracking from "./RefundTracking"
import ShipmentTracking from "./ShipmentTracking"
import OrderStockOutcome from "./OrderStockOutcome"
import CopyReference from "./CopyReference"
import {orderMoney,type CustomerOrder} from "./orders-api"
import "./order-detail.css"

export default function OrderDetail({order,en,base,navigate,statuses}:{order:CustomerOrder;en:boolean;base:string;navigate:(path:string)=>void;statuses:Record<string,[string,string]>}) {
 const t=(fa:string,english:string)=>en?english:fa
 const {snapshot,state}=order
 const money=(value:string)=>orderMoney(value,en,snapshot.currency)
 const account=base.replace(/\/orders$/,"")
 const digital=snapshot.items.some(item=>item.delivery==="digital"||item.stock_components?.some(c=>c.delivery==="digital"))
 const physical=snapshot.items.some(item=>item.delivery==="physical")
 const link=(path:string,label:ReactNode,className="od-link")=><a className={className} href={path} onClick={event=>{event.preventDefault();navigate(path)}}>{label}</a>
 const date=(value:string)=>new Date(value).toLocaleDateString(en?"en":"fa-IR",{timeZone:"Asia/Tehran",year:"numeric",month:"long",day:"numeric"})
 return <div className="order-detail">
  {physical&&snapshot.items.some(item=>item.stock_components?.length)&&<OrderStockOutcome id={order.id} en={en} refresh={String(order.version)}/>}
  <section className="od-overview" aria-label={t("خلاصه سفارش","Order overview")}>
   <div className="od-reference"><span className="od-eyebrow">{t("شماره سفارش","Order reference")}</span><h2><bdi>{snapshot.reference}</bdi></h2><time dateTime={order.created_at}>{t("ثبت‌شده در","Placed on")} {date(order.created_at)}</time></div>
   <div className="od-statuses"><div><span>{t("وضعیت پرداخت","Payment status")}</span><strong className={`od-status ${state.payment==="paid"?"is-positive":""}`}>{statuses[state.payment][en?1:0]}</strong></div><div><span>{t("وضعیت تحویل","Delivery status")}</span><strong className={`od-status ${state.fulfillment==="delivered"?"is-positive":""}`}>{statuses[state.fulfillment][en?1:0]}</strong></div></div>
  </section>
  <div className="od-layout"><div className="od-main">
   {snapshot.items.some(item=>item.stock_components?.length)&&<>{physical&&<ShipmentTracking id={order.id} en={en} refresh={String(order.version)}/>}<RefundTracking id={order.id} en={en} active={["partially_refunded","refunded"].includes(order.state.payment)}/></>}
   <section className="od-card" aria-labelledby="od-items"><div className="od-section-heading"><h2 id="od-items">{t("اقلام سفارش","Order items")}</h2><span>{snapshot.items.length.toLocaleString(en?"en":"fa-IR")} {t("قلم","items")}</span></div>
    <ul className="od-items">{snapshot.items.map(item=><li className="od-item" key={item.id}><OrderProductThumbnail entry={order.catalog_items?.[item.id]} title={en?item.title_en:item.title_fa} en={en} navigate={navigate}/><div className="od-item-content"><div className="od-item-heading"><h3><OrderProductLink entry={order.catalog_items?.[item.id]} en={en} navigate={navigate} className="order-product-name">{en?item.title_en:item.title_fa}</OrderProductLink></h3><span className="od-delivery-label">{item.delivery==="digital"?t("فایل دیجیتال","Digital file"):t("ارسال فیزیکی","Physical delivery")}</span></div>{(en?item.options_en:item.options_fa)&&<p className="od-options">{en?item.options_en:item.options_fa}</p>}<div className="od-item-meta"><span>{t("کد کالا","SKU")}: <bdi>{item.sku}</bdi></span><span>{t("تعداد","Quantity")}: {item.quantity.toLocaleString(en?"en":"fa-IR")}</span></div><dl className="od-item-pricing"><div><dt>{t("قیمت واحد","Unit price")}</dt><dd>{money(item.unit_amount)}</dd></div><div><dt>{t("تخفیف ردیف","Line discount")}</dt><dd>{money(item.discount_amount)}</dd></div></dl>{item.commission_id&&link(`${account}/commissions/${item.commission_id}/artwork-review`,t("بررسی اثر","Review artwork"))}</div></li>)}</ul>
   </section>
   {digital&&<section className="od-digital"><div><span className="od-eyebrow">{t("تحویل دیجیتال","DIGITAL DELIVERY")}</span><h2>{t("فایل‌های این سفارش","Your order files")}</h2><p>{t("فایل‌های آزادشده برای دریافت در کتابخانهٔ شما قرار می‌گیرند.","Released files are available in your download library.")}</p></div>{link(`${account}/downloads?order=${order.id}`,t("مشاهده فایل‌های سفارش","View order files"),"button primary")}</section>}
   {snapshot.checkout_terms&&<section className="od-card"><h2>{t('شرایط ثبت‌شده هنگام خرید','Terms recorded at checkout')}</h2><p>{en?snapshot.checkout_terms.policy.return_policy_en:snapshot.checkout_terms.policy.return_policy_fa}</p>{physical?<p>{t('مهلت مرجوعی از تحویل','Return window from delivery')}: {snapshot.checkout_terms.policy.return_days} {t('روز','days')}</p>:<p>{t('مجوزهای دیجیتال قابل مرجوعی نیستند.','Digital licenses are non-returnable.')}</p>}{snapshot.checkout_terms.lines.flatMap(line=>line.parts.filter(p=>p.delivery==='digital'&&(p.license_fa||p.license_en))).map((part,index)=><p key={index}>{en?part.license_en:part.license_fa}</p>)}</section>}
   <section className="od-card" aria-labelledby="od-recipient"><div className="od-section-heading"><h2 id="od-recipient">{physical?t("گیرنده و نشانی ارسال","Recipient & delivery address"):t("اطلاعات گیرنده","Recipient details")}</h2></div><div className="od-recipient"><span className="od-recipient-mark" aria-hidden="true">{snapshot.recipient.trim().slice(0,1)||"—"}</span><div><strong dir="auto">{snapshot.recipient||t("گیرنده ثبت نشده است","No recipient recorded")}</strong>{snapshot.address?<p dir="auto">{snapshot.address}</p>:<p>{physical?t("نشانی ارسال ثبت نشده است.","No delivery address recorded."):t("این سفارش به نشانی پستی نیاز ندارد.","This order does not require a postal address.")}</p>}</div></div><p className="od-footnote">{t("اطلاعات ثبت‌شده هنگام سفارش؛ ویرایش دفترچهٔ آدرس، این نشانی را تغییر نمی‌دهد.","Recorded at checkout. Changes to your address book do not change this order.")}</p></section>
  </div><aside className="od-aside">
   <section className="od-card od-payment" aria-labelledby="od-payment"><div className="od-section-heading"><h2 id="od-payment">{t("جزئیات پرداخت","Payment details")}</h2></div><dl className="od-totals"><div><dt>{t("هزینه ارسال","Shipping")}</dt><dd>{money(snapshot.shipping_amount)}</dd></div><div><dt>{snapshot.checkout_terms?.policy.tax_included?t("مالیات داخل قیمت","Tax included in prices"):t("مالیات","Tax")}</dt><dd>{money(snapshot.checkout_terms?.policy.tax_included?(snapshot.checkout_terms.policy.included_tax_amount||"0"):snapshot.tax_amount)}</dd></div><div className="od-total"><dt>{t("مبلغ کل سفارش","Order total")}</dt><dd>{money(snapshot.total_amount)}</dd></div><div><dt>{t("بازپرداخت ثبت‌شده","Recorded refund")}</dt><dd>{money(state.refunded_amount)}</dd></div></dl>{snapshot.receipt?link(`${base}/${order.id}/receipt`,t("مشاهده رسید","View receipt"),"button secondary"): <p className="od-footnote">{t("هنوز رسید پرداختی ثبت نشده است.","No payment receipt has been recorded yet.")}</p>}</section>
   <section className="od-card od-help"><h2>{t("پیگیری سفارش","Manage your order")}</h2><p>{t("درخواست‌ها را ثبت کنید یا برای راهنمایی با پشتیبانی در تماس باشید.","Submit a request or contact support for help with your order.")}</p><div className="od-action-list">{link(`${base}/${order.id}/cancel`,t("درخواست لغو","Request cancellation"))}{link(`${base}/${order.id}/return`,t("درخواست مرجوعی","Request return"))}{link(`${account}/support`,t("پشتیبانی","Support"))}</div><div className="od-copy"><CopyReference value={snapshot.reference} en={en} kind="order"/></div></section>
  </aside></div>
 </div>
}
