"use client"
import {type ReactNode} from "react"
import {Glyph} from "../../design/DashboardPage"
export default function CustomerPanelHeading({title,path,navigate,icon="box",children}:{title:string;path:string;navigate:(route:string)=>void;icon?:string;children?:ReactNode}){
 const en=path.startsWith("/en/"),account=`/${en?"en":"fa"}/account`
 return <><nav className="customer-breadcrumb" aria-label={en?"Breadcrumb":"مسیر صفحه"}><a href={account} onClick={event=>{if(event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;event.preventDefault();navigate(account)}}>{en?"Account":"حساب"}</a><span>/</span><span aria-current="page">{title}</span></nav><header className="customer-page-heading"><div><span className="customer-eyebrow">YOUR ACCOUNT</span><h1>{title}</h1></div><span className="customer-heading-icon"><Glyph name={icon} size={30}/></span></header>{children&&<div className="customer-page-actions">{children}</div>}</>
}
