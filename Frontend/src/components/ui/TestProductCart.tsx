"use client"
import { useEffect, useState } from "react"
import type { PublishedSKU } from "../../features/catalog/product-detail"
type Line = {skuId:string;code:string;title:string;amount:string;currency:string;quantity:number}
const key = "nilart-reference-test-cart-v1"
/** Local browser basket for reference fixtures. Never creates an order or reserves stock. */
export default function TestProductCart({sku,title,language}:{sku:PublishedSKU|undefined;title:string;language:0|1}) {
  const t=(fa:string,en:string)=>language===0?fa:en
  const [quantity,setQuantity]=useState(1)
  const [lines,setLines]=useState<Line[]>([])
  const [message,setMessage]=useState("")
  const [local,setLocal]=useState(false)
  useEffect(()=>{
    setLocal(["localhost","127.0.0.1"].includes(window.location.hostname))
    try {const stored:unknown=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(stored)) setLines(stored.filter((row):row is Line=>!!row && typeof row.skuId==="string" && typeof row.title==="string" && typeof row.amount==="string" && Number.isInteger(row.quantity) && row.quantity>0 && row.quantity<=99))} catch { /* A corrupt basket is ignored; no order is created. */ }
  },[])
  const eligible=local && !!sku?.price && sku.code.startsWith("TEST-REF-")
  const add=()=>{
    if(!sku?.price || !eligible || !["localhost","127.0.0.1"].includes(window.location.hostname)) return
    try {
      const stored:unknown=JSON.parse(localStorage.getItem(key)||"[]")
      const rows=Array.isArray(stored)?stored.filter((row):row is Line=>!!row && typeof row.skuId==="string" && typeof row.title==="string" && typeof row.amount==="string" && Number.isInteger(row.quantity) && row.quantity>0 && row.quantity<=99):[]
      const previous=rows.find(row=>row.skuId===sku.id)
      const next=[...rows.filter(row=>row.skuId!==sku.id),{skuId:sku.id,code:sku.code,title,amount:sku.price.amount,currency:sku.price.currency,quantity:Math.min(99,(previous?.quantity||0)+quantity)}]
      localStorage.setItem(key,JSON.stringify(next));setLines(next);setMessage(t("به سبد آزمایشی اضافه شد.","Added to the test basket."))
    } catch {setMessage(t("ذخیره سبد ممکن نشد.","Unable to save the basket."))}
  }
  return <><div className="quantity-section"><label htmlFor="published-product-quantity">{t("تعداد محصول","Quantity")}</label><div className="quantity-stepper"><button disabled={!eligible || quantity===1} onClick={()=>setQuantity(value=>value-1)} aria-label={t("کم‌کردن تعداد","Decrease quantity")}>−</button><input id="published-product-quantity" value={quantity.toLocaleString(language===0?"fa-IR":"en-US")} readOnly disabled={!eligible}/><button disabled={!eligible || quantity===99} onClick={()=>setQuantity(value=>value+1)} aria-label={t("افزایش تعداد","Increase quantity")}>+</button></div></div>
  <button className="button primary product-add-button" disabled={!eligible} onClick={add}>{t("افزودن به سبد آزمایشی","Add to test basket")}</button><p className="product-reservation-note">{t("فقط آزمایش محلی؛ قیمت نمونه است. موجودی رزرو نمی‌شود و پرداخت یا سفارش واقعی ثبت نمی‌شود.","Local testing only: sample prices, no stock reservation, payment or real order.")}</p>
  {message&&<p role="status">{message}</p>}{lines.length>0&&<section aria-label={t("سبد آزمایشی","Test basket")}><h2>{t("سبد آزمایشی","Test basket")}</h2>{lines.map(line=><p key={line.skuId}>{line.title} · {line.quantity} × {line.amount} {line.currency} <button className="text-link" onClick={()=>{const next=lines.filter(row=>row.skuId!==line.skuId);try{localStorage.setItem(key,JSON.stringify(next));setLines(next)}catch{setMessage(t("ذخیره سبد ممکن نشد.","Unable to save the basket."))}}}>{t("حذف","Remove")}</button></p>)}</section>}</>
}
