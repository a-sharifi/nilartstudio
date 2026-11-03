"use client"
import {useState,type ReactNode} from "react"
import {ReferenceProductImage,ReferenceBundleImage} from "../../design/ReferenceMedia"
import type {CustomerOrder} from "./orders-api"
import "./order-product.css"
type Entry=NonNullable<CustomerOrder["catalog_items"]>[string]
export function OrderProductLink({entry,en,navigate,children,className}:{entry?:Entry;en:boolean;navigate:(route:string)=>void;children:ReactNode;className?:string}){
 if(!entry)return <>{children}</>
 const href=`/${en?"en":"fa"}/${entry.kind}/${encodeURIComponent(entry.slug)}`
 return <a className={className} href={href} onClick={event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(href)}}>{children}</a>
}
export function OrderProductThumbnail({entry,title,en,navigate}:{entry?:Entry;title:string;en:boolean;navigate:(route:string)=>void}){
 const [failed,setFailed]=useState<string|null>(null)
 const src=entry?.image_url
 const safeImage=src&&/^\/(?!\/)/.test(src)
 return <OrderProductLink entry={entry} en={en} navigate={navigate} className="order-product-thumbnail"><span className="order-product-visual" role={safeImage&&failed!==src?undefined:"img"} aria-label={safeImage&&failed!==src?undefined:title}>
 {safeImage&&failed!==src?<img src={src} alt={title} loading="lazy" decoding="async" onError={()=>setFailed(src)}/>:entry?.kind==="products"?<ReferenceProductImage slug={entry.slug} language={en?1:0}/>:entry?.kind==="bundles"?<ReferenceBundleImage slug={entry.slug} language={en?1:0}/>:<span className="order-product-unavailable">{en?"Image unavailable":"تصویر در دسترس نیست"}</span>}
 </span></OrderProductLink>
}
