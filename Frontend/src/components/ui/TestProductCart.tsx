"use client"
import {useEffect,useState} from "react"
import type {PublishedSKU} from "../../features/catalog/product-detail"
import {tomanAmount} from "../../features/basket/money"
import AddToBasket from "../../features/basket/AddToBasket"
import {useBasket} from "../../features/basket/store"
/** Published products use the shared saved basket; checkout authorization is separate. */
export default function TestProductCart({sku,language,lineId,initialQuantity=1,onSaved,editingMissing=false}:{sku:PublishedSKU|undefined;title:string;language:0|1;lineId?:string;initialQuantity?:number;onSaved?:()=>void;editingMissing?:boolean}){
 const [quantity,setQuantity]=useState(1),basket=useBasket(),t=(fa:string,en:string)=>language===0?fa:en
 useEffect(()=>setQuantity(initialQuantity),[initialQuantity])
 const eligible=!!sku?.price&&!editingMissing
 return <><div className="quantity-section"><label htmlFor="published-product-quantity">{t("تعداد محصول","Quantity")}</label><div className="quantity-stepper"><button disabled={!eligible||basket.busy||quantity===1} onClick={()=>setQuantity(value=>value-1)} aria-label={t("کم‌کردن تعداد","Decrease quantity")}>−</button><input id="published-product-quantity" value={quantity.toLocaleString(language===0?"fa-IR":"en-US")} readOnly disabled={!eligible}/><button disabled={!eligible||basket.busy||quantity===99} onClick={()=>setQuantity(value=>value+1)} aria-label={t("افزایش تعداد","Increase quantity")}>+</button></div></div>
 <AddToBasket item={{kind:"product",item_id:sku?.id||"",quantity}} language={language} disabled={!eligible} lineId={lineId} onSaved={onSaved} expectedUnit={sku?.price?tomanAmount(sku.price.amount,sku.price.currency):undefined}/><p className="product-reservation-note">{t("سبد ذخیره می‌شود؛ افزودن به سبد موجودی را رزرو نمی‌کند. پرداخت هنوز فعال نیست.","Your basket is saved; adding items does not reserve stock. Payment is not available yet.")}</p></>
}
