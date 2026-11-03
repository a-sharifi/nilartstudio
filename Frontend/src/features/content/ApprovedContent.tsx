"use client"

import {useEffect, useState, type ReactNode} from "react"
import {z} from "zod"
import {pageContent} from "../admin/content-api"
import "./approved-content.css"

const schema = z.object({slug:z.string(), revision_id:z.string().uuid(), content:pageContent, published_at:z.iso.datetime({offset:true})})
export function contentSections(body:string) {
 const chunks=body.split(/^##\s+/m)
 return chunks.filter(chunk=>chunk.trim()).map((chunk,index)=>{
  const headed=index>0 || body.startsWith("## ")
  const newline=chunk.indexOf("\n")
  return {id:`section-${index+1}`,title:headed ? (newline<0?chunk:chunk.slice(0,newline)).trim():"",body:headed?(newline<0?"":chunk.slice(newline+1)).trim():chunk.trim()}
 })
}
function inline(text:string):ReactNode[] {
 return text.split(/(\[[^\]]+\]\([^)]+\))/g).map((part,index)=>{
  const match=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if(!match)return part
  const [,label,href]=match
  // Content is text, never HTML. Only explicitly safe link destinations are rendered.
  if(!/^(?:https:\/\/|tel:\+?[\d]+$|mailto:[^\s]+$|\/(?!\/))/.test(href))return label
  return <a key={index} href={href} dir={href.startsWith("tel:")?"ltr":undefined}>{label}</a>
 })
}
function Copy({body}:{body:string}) {
 return <>{body.split(/\n\s*\n/).filter(Boolean).map((block,index)=>{
  const lines=block.split("\n")
  return lines.every(line=>line.startsWith("- "))?<ul key={index}>{lines.map((line,i)=><li key={i}>{inline(line.slice(2))}</li>)}</ul>:<p key={index}>{lines.map((line,i)=><span key={i}>{i>0&&<br/>}{inline(line)}</span>)}</p>
 })}</>
}
export default function ApprovedContent({path,language}:{path:string;language:0|1}) {
 const en=language===1, locale=en?"en":"fa",slug=path.replace(/^\/(?:fa\/|en\/)?/,"").replace(/\/$/,"").replace("guides/buying","buying-guide")
 const [result,setResult]=useState<z.infer<typeof schema>|null>(null),[state,setState]=useState("loading"),[retry,setRetry]=useState(0),[query,setQuery]=useState("")
 useEffect(()=>{
  let current=true;const controller=new AbortController();setResult(null);setState("loading")
  void fetch(`/api/v1/content/${slug}`,{cache:"no-store",signal:controller.signal}).then(async response=>{
   if(response.status===404){if(current)setState("unpublished");return}
   if(!response.ok)throw new Error()
   const value=schema.parse(await response.json());if(value.slug!==slug)throw new Error()
   if(current){setResult(value);setState("ready")}
  }).catch(()=>{if(current)setState("error")})
  return()=>{current=false;controller.abort()}
 },[slug,retry])
 const normalize=(text:string)=>text.normalize("NFKC").replace(/ي/g,"ی").replace(/ك/g,"ک").toLocaleLowerCase()
 const title=result?(en?result.content.title_en:result.content.title_fa):""
 const description=result?(en?result.content.description_en:result.content.description_fa):""
 const sections=result?contentSections(en?result.content.body_en:result.content.body_fa):[]
 const visible=slug==="faq"?sections.filter(section=>normalize(section.title+" "+section.body).includes(normalize(query.trim()))):sections
 return <div className={`approved-content approved-${slug}`} dir={en?"ltr":"rtl"}>
  <div className="container">
   <nav className="approved-breadcrumb" aria-label={en?"Breadcrumb":"مسیر صفحه"}><a href={`/${locale}`}>{en?"Home":"خانه"}</a><span aria-hidden="true">/</span><span>{title|| (en?"Information":"اطلاعات")}</span></nav>
   {state==="loading"?<div className="approved-state" role="status" aria-busy="true">{en?"Loading…":"در حال دریافت اطلاعات…"}</div>:state==="error"?<div className="approved-state"><h1>{en?"Content unavailable":"دریافت محتوا ممکن نشد"}</h1><p role="alert">{en?"Please try again.":"دوباره تلاش کنید."}</p><button className="button secondary" onClick={()=>setRetry(v=>v+1)}>{en?"Try again":"تلاش دوباره"}</button></div>:result?<>
    <header className="approved-hero"><div><p className="approved-eyebrow">NILART · ART & EVERYDAY</p><h1>{title}</h1>{description&&<p className="approved-description">{description}</p>}</div>{slug==="about"&&<div className="approved-brand"><img src="/brand/nilart-logo.webp" alt={en?"Nilart":"نیل‌آرت"} width="280" height="140"/></div>}</header>
    {slug==="returns"&&<div className="approved-actions"><div><h2>{en?"Start with your order":"از سفارش خود شروع کنید"}</h2><p>{en?"Sign in with the account used for purchase to submit or follow a request.":"برای ثبت یا پیگیری درخواست، با حسابی که خرید کرده‌اید وارد شوید."}</p></div><a className="button primary" href={`/${locale}/account/orders`}>{en?"Choose an order":"انتخاب سفارش"}</a><a className="button secondary" href={`/${locale}/account/requests`}>{en?"My requests":"درخواست‌های من"}</a></div>}
    <div className="approved-layout">
     {visible.some(section=>section.title)&&<aside className="approved-index"><nav aria-label={en?"On this page":"در این صفحه"}><p>{en?"On this page":"در این صفحه"}</p>{visible.filter(section=>section.title).map(section=><a key={section.id} href={`#${section.id}`}>{section.title}</a>)}</nav>{slug!=="contact"&&<a className="approved-help" href={`/${locale}/contact`}>{en?"Have a question? Contact us":"پرسشی دارید؟ با ما در تماس باشید"}<span aria-hidden="true">↗</span></a>}</aside>}
     <article className="approved-copy" aria-label={title}>{slug==="faq"&&<form className="approved-faq-search" onSubmit={event=>event.preventDefault()}><label htmlFor="faq-query">{en?"Search questions":"جستجو در پرسش‌ها"}</label><input id="faq-query" type="search" maxLength={200} value={query} onChange={event=>setQuery(event.target.value)} placeholder={en?"For example: paper, payment, delivery…":"مثلاً کاغذ، پرداخت، ارسال…"}/><p role="status">{en?`${visible.length} questions`:`${visible.length.toLocaleString("fa-IR")} پرسش`}</p></form>}{slug==="faq"?visible.length?visible.map(section=><details key={section.id} id={section.id} className="approved-faq-item"><summary>{section.title}</summary><div><Copy body={section.body}/></div></details>):<div className="approved-state"><h2>{en?"No matching questions":"پرسشی پیدا نشد"}</h2><p>{en?"Try another word or contact us.":"واژه دیگری را امتحان کنید یا با ما تماس بگیرید."}</p><a href={`/${locale}/contact`}>{en?"Contact us":"تماس با ما"}</a></div>:sections.map((section,index)=><section id={section.id} key={section.id} className="approved-section">{section.title&&<div className="approved-section-heading"><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><h2>{section.title}</h2></div>}<Copy body={section.body}/></section>)}{slug==="about"&&<a className="button primary" href={`/${locale}/collections`}>{en?"Explore the collections":"دیدن کالکشن‌ها"}<span aria-hidden="true">←</span></a>}</article>
    </div>
    <nav className="approved-related" aria-label={en?"More information":"بیشتر بخوانید"}>{[["about",en?"About":"درباره ما"],["contact",en?"Contact":"تماس"],["terms",en?"Purchase terms":"قوانین خرید"],["privacy",en?"Privacy":"حریم خصوصی"]].filter(([route])=>route!==slug).map(([route,label])=><a key={route} href={`/${locale}/${route}`}>{label}<span aria-hidden="true">↗</span></a>)}</nav>
   </>:<div className="approved-state"><h1>{en?"This page has not been published":"این صفحه هنوز منتشر نشده است"}</h1><p>{en?"Approved information will appear here after publication.":"اطلاعات تأییدشده پس از انتشار در این صفحه نمایش داده می‌شوند."}</p></div>}
  </div>
 </div>
}
