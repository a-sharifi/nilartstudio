"use client"
import SystemErrorPage from "../system/SystemErrorPage"
import {useRef,type ReactNode} from "react"
import {useAccountAccess} from "./use-account-access"
import {accountAccessStore} from "./access-store"
export default function PanelAccessBoundary({permission,path,children}:{permission:string|readonly string[];path:string;children:ReactNode}){
 const admitted=useRef(false)
 const state=useAccountAccess(),en=path.startsWith("/en/"),t=(fa:string,english:string)=>en?english:fa
 const checking=state.status==="checking"
 if(checking&&!admitted.current)return <main className="ad-session" aria-busy="true"><p role="status">{t("در حال بررسی دسترسی…","Checking access…")}</p></main>
 if(state.status==="unavailable")return <SystemErrorPage kind="500" english={en} onRetry={()=>void accountAccessStore.refresh()}/>
 if(!checking&&(state.status!=="ready" || !state.access?.permissions.some(value=>typeof permission==="string"?value===permission:permission.includes(value))))return <SystemErrorPage kind="403" english={en} signInHref={`/${en?"en":"fa"}/auth/login?returnTo=${encodeURIComponent(path)}`}/>

 if(!checking)admitted.current=true
 // Preserve editor state during fresh authorization, but hide and disable it until verified.
 return <>{checking&&<main className="ad-session" aria-busy="true"><p role="status">{t("در حال بررسی دسترسی…","Checking access…")}</p></main>}<div hidden={checking} inert={checking} style={checking?{display:"none"}:{display:"contents"}}>{children}</div></>
}
