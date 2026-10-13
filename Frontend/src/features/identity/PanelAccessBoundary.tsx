"use client"
import type {ReactNode} from "react"
import {useAccountAccess} from "./use-account-access"
import {accountAccessStore} from "./access-store"
export default function PanelAccessBoundary({permission,path,children}:{permission:string|readonly string[];path:string;children:ReactNode}){
 const state=useAccountAccess(),en=path.startsWith("/en/"),t=(fa:string,english:string)=>en?english:fa
 if(state.status==="checking")return <main className="ad-session" aria-busy="true"><p role="status">{t("در حال بررسی دسترسی…","Checking access…")}</p></main>
 if(state.status==="unavailable")return <main className="ad-session"><h1>{t("بررسی دسترسی ممکن نشد","Unable to verify access")}</h1><button className="button primary" onClick={()=>void accountAccessStore.refresh()}>{t("دوباره تلاش کنید","Try again")}</button></main>
 if(state.status!=="ready" || !state.access?.permissions.some(value=>typeof permission==="string"?value===permission:permission.includes(value)))return <main className="ad-session"><h1>{t("دسترسی مجاز نیست","Access denied")}</h1><p>{t("برای ادامه با حساب دارای مجوز وارد شوید.","Sign in with an authorized account to continue.")}</p><a className="button primary" href={`/${en?"en":"fa"}/auth/login?returnTo=${encodeURIComponent(path)}`}>{t("ورود به حساب","Sign in")}</a><a className="button secondary" href={en?"/en":"/fa"}>{t("بازگشت به فروشگاه","Back to shop")}</a></main>
 return children
}
