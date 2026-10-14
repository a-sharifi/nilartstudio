"use client"
import "./basket.css"
import {useState} from "react"
import {basketStore,useBasket,type BasketItem} from "./store"
export default function AddToBasket({item,language,disabled=false,label,lineId,onSaved,expectedUnit}:{item:Omit<BasketItem,"quantity"|"choices"|"framed"> & Partial<BasketItem>;language:0|1;disabled?:boolean;label?:string;lineId?:string;onSaved?:()=>void;expectedUnit?:string}){
 const basket=useBasket(),[message,setMessage]=useState(""),t=(fa:string,en:string)=>language===0?fa:en
 return <><button className="button primary product-add-button" disabled={disabled||basket.busy} onClick={async()=>{setMessage("");try{if(lineId)await basketStore.mutate("replace",{line_id:lineId,item,expected_unit:expectedUnit});else await basketStore.add(item,expectedUnit);onSaved?.();setMessage(t("به سبد خرید اضافه شد.","Added to your basket."))}catch(error){setMessage(error instanceof Error&&error.message==="artwork_already_added"?t("این اثر در سبد است؛ قاب آن را از سبد ویرایش کنید.","This artwork is in your basket. Edit its frame from the basket."):t("افزودن تأیید نشد؛ سبد را بررسی کنید و دوباره تلاش کنید.","Addition was not confirmed. Review your basket and try again."))}}}>{basket.busy?t("در حال ذخیره…","Saving…"):label||(lineId?t("ذخیره انتخاب‌ها","Save selections"):t("افزودن به سبد خرید","Add to basket"))}</button>{message&&<p role="status" className="product-feedback">{message} <a className="text-link" href={`/${language===0?"fa":"en"}/cart`}>{t("مشاهده سبد خرید","View basket")}</a></p>}</>
}
