"use client"
import {useEffect,useRef,useState} from "react"
import {sessionLifecycle} from "../identity/session-lifecycle"
export default function CopyReference({value,en,kind}:{value:string;en:boolean;kind:"ticket"|"order"}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),generation=useRef(0),lock=useRef(false)
 const t=(fa:string,english:string)=>en?english:fa
 useEffect(()=>{const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setBusy(false);setMessage("")});return()=>{generation.current++;clear()}},[value])
 const copy=async()=>{if(lock.current)return;lock.current=true;setBusy(true);setMessage("");const stamp=generation.current,revision=sessionLifecycle.capture();try{await navigator.clipboard.writeText(value);if(stamp===generation.current&&sessionLifecycle.current(revision))setMessage(kind==="ticket"?t("شماره تیکت کپی شد.","Ticket number copied."):t("شماره سفارش کپی شد.","Order reference copied."))}catch{if(stamp===generation.current&&sessionLifecycle.current(revision))setMessage(t("کپی ممکن نشد؛ شماره را دستی انتخاب و کپی کنید.","Could not copy; select and copy the reference manually."))}finally{lock.current=false;if(stamp===generation.current)setBusy(false)}}
 return <div><p><bdi style={{userSelect:"text",overflowWrap:"anywhere"}}>{value}</bdi></p><button className="button secondary" disabled={busy} onClick={()=>void copy()}>{kind==="ticket"?t("کپی شماره تیکت","Copy ticket number"):t("کپی شماره سفارش","Copy order reference")}</button>{message&&<p role="status">{message}</p>}</div>
}
