"use client"
import {useEffect,useRef} from "react"
import type {AnchorHTMLAttributes,ButtonHTMLAttributes,FormHTMLAttributes,ReactNode,TableHTMLAttributes} from "react"
import "./admin-ui.css"
export type AdminIconName="up"|"down"|"edit"|"view"|"external"|"history"|"delete"|"download"|"options"|"review"|"copy"|"refresh"|"search"|"close"|"add"
const paths:Record<AdminIconName,ReactNode>={
 up:<path d="m5 14 7-7 7 7"/>,down:<path d="m5 10 7 7 7-7"/>,
 edit:<><path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/></>,
 view:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
 external:<><path d="M14 3h7v7M21 3l-11 11"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></>,
 history:<><path d="M3 4v5h5M3.5 9a9 9 0 1 1 .5 8"/><path d="M12 7v5l3 2"/></>,
 delete:<><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></>,
 download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
 options:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>,
 review:<><path d="M9 3H5v18h14V3h-4M9 2h6v4H9Z"/><path d="m8 13 3 3 5-6"/></>,
 copy:<><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
 refresh:<><path d="M20 4v5h-5M4 20v-5h5M20 9a8 8 0 0 0-14-4M4 15a8 8 0 0 0 14 4"/></>,
 search:<><circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/></>,
 close:<path d="m6 6 12 12M18 6 6 18"/>,
 add:<path d="M12 4v16M4 12h16"/>,
}
export function AdminIcon({name}:{name:AdminIconName}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>}
export function AdminButton({className="button secondary",size="md",icon,children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{size?:"sm"|"md";icon?:AdminIconName}){return <button {...props} className={`admin-button admin-button--${size} ${className}`}>{icon&&<AdminIcon name={icon}/>}<span>{children}</span></button>}
type ActionCommon={icon:AdminIconName;children:ReactNode;tone?:"default"|"danger"}
type ActionProps=ActionCommon&(({as?:"button"}&ButtonHTMLAttributes<HTMLButtonElement>)|({as:"a"}&AnchorHTMLAttributes<HTMLAnchorElement>))
export function AdminAction(props:ActionProps){const {icon,children,tone="default",className="",...rest}=props;const content=<><AdminIcon name={icon}/><span className="admin-sr-only">{children}</span><span className="admin-action-tooltip" aria-hidden="true">{children}</span></>;const shared={className:`admin-action admin-action--${tone} ${className}`,title:typeof children==="string"?children:undefined};if(rest.as==="a"){const {as,...anchor}=rest;void as;return <a {...anchor} {...shared}>{content}</a>}const {as,...button}=rest;void as;return <button type="button" {...button} {...shared}>{content}</button>}
export function AdminFilters({className="",children,onSubmit,...props}:FormHTMLAttributes<HTMLFormElement>){return <form {...props} onSubmit={onSubmit??(event=>event.preventDefault())} className={`admin-filters ${className}`}><div className="admin-filter-fields">{children}</div></form>}
export function AdminTable({className="",children,...props}:TableHTMLAttributes<HTMLTableElement>){
 const table=useRef<HTMLTableElement>(null)
 useEffect(()=>{
  const element=table.current;if(!element)return
  const headers=Array.from(element.querySelectorAll("thead tr:last-child th")).map(header=>header.textContent?.trim()??"")
  element.querySelectorAll("tbody tr").forEach(row=>Array.from(row.children).forEach((cell,index)=>{
   if(cell.tagName!=="TD"||cell.hasAttribute("colspan"))return
   cell.setAttribute("data-label",headers[index]??"")
   cell.classList.toggle("admin-row-actions",!!cell.querySelector(".admin-action"))
  }))
 },[children])
 return <div className="admin-table-scroll" tabIndex={0}><table ref={table} {...props} className={`admin-table ${className}`}>{children}</table></div>
}
export type AdminColumn<T>={key:string;title:ReactNode;render:(row:T)=>ReactNode;action?:boolean}
export function AdminDataTable<T>({columns,rows,rowKey,caption}:{columns:AdminColumn<T>[];rows:T[];rowKey:(row:T)=>string;caption:string}){return <AdminTable><caption className="admin-sr-only">{caption}</caption><thead><tr>{columns.map(c=><th scope="col" key={c.key} className={c.action?"admin-actions-cell":undefined}>{c.title}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={rowKey(row)}>{columns.map(c=><td key={c.key} className={c.action?"admin-actions-cell":undefined}>{c.render(row)}</td>)}</tr>)}</tbody></AdminTable>}
