"use client"
import {useEffect,useRef,useState} from "react"
import DashboardPage,{Glyph} from "../../design/DashboardPage"
import SelectDropdown from "../../components/ui/SelectDropdown"
import {customerApi,type CustomerRecord} from "./api"
import {sessionLifecycle} from "../identity/session-lifecycle"
import {useNavigationGuard} from "../navigation/NavigationGuardProvider"
import "../../design/support.css"
import "../../design/support-conversation.css"
import "../../design/notifications.css"
import "../../design/favorites.css"
import "../../design/account-preferences.css"

type Section="dashboard"|"favorites"|"support"|"notifications"
const names:Record<Section,[string,string]>={dashboard:["حساب شما","Your account"],favorites:["علاقه‌مندی‌ها","Favorites"],support:["پشتیبانی","Support"],notifications:["اعلان‌ها","Notifications"]}
const ids:Record<Section,string>={dashboard:"USER-01",favorites:"USER-10",support:"USER-15",notifications:"USER-17"}
const kindFor:Record<Section,string>={dashboard:"notification",favorites:"favorite",support:"ticket",notifications:"notification"}
const text=(value:unknown)=>typeof value==="string"?value:""
export default function CustomerPages({path,navigate}:{path:string;navigate:(route:string)=>void}){
 const en=path.startsWith("/en/"),ix=en?1:0,prefix=en?"/en":"/fa",account=`${prefix}/account`,t=(fa:string,english:string)=>en?english:fa
 const section=(path.split("/")[3] || "dashboard") as Section,conversation=section==="support"?path.split("/")[4]:undefined
 const [summary,setSummary]=useState<Awaited<ReturnType<typeof customerApi.summary>>|null>(null)
 const [records,setRecords]=useState<CustomerRecord[]>([]),[messages,setMessages]=useState<CustomerRecord[]>([]),[ticket,setTicket]=useState<CustomerRecord|null>(null),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false),[query,setQuery]=useState(""),[filter,setFilter]=useState("all")
 const [subject,setSubject]=useState(""),[body,setBody]=useState(""),[topic,setTopic]=useState("general"),[creating,setCreating]=useState(false),[unknown,setUnknown]=useState(false)
 const generation=useRef(0),lock=useRef(false),recordId=useRef(crypto.randomUUID()),requestId=useRef(crypto.randomUUID()),dirty=useRef(false),pending=useRef<(()=>void)|null>(null),dialog=useRef<HTMLDialogElement>(null)
 const [leaving,setLeaving]=useState(false),register=useNavigationGuard()
 dirty.current=!!(subject || body)
 const guard=(proceed:()=>void)=>{if(lock.current)return false;if(!dirty.current){proceed();return true}pending.current=proceed;setLeaving(true);return false}
 const follow=(route:string)=>guard(()=>navigate(route))
 useEffect(()=>{register(guard);const unload=(event:BeforeUnloadEvent)=>{if(dirty.current || lock.current){event.preventDefault();event.returnValue=""}};window.addEventListener("beforeunload",unload);return()=>{register(null);window.removeEventListener("beforeunload",unload)}},[register])
 useEffect(()=>{if(leaving)dialog.current?.showModal();else dialog.current?.close()},[leaving])
 const load=async(next?:string)=>{
  const stamp=++generation.current;setLoading(true);setError("")
  try {
   const page=await customerApi.list(kindFor[section],next)
   const totals=section==="dashboard"?await customerApi.summary():null
   let detail:CustomerRecord|null=null,thread:CustomerRecord[]=[]
   if(conversation){detail=await customerApi.detail("ticket",conversation);let page=await customerApi.list("message");thread=page.items;while(page.next_cursor){page=await customerApi.list("message",page.next_cursor);thread.push(...page.items)}thread=thread.filter(item=>item.data.ticket_id===conversation).sort((a,b)=>a.created_at.localeCompare(b.created_at))}
   if(stamp!==generation.current)return
   setSummary(totals);setRecords(previous=>next?[...previous,...page.items]:page.items);setCursor(page.next_cursor);setTicket(detail);setMessages(thread);setUnknown(false)
  }catch{if(stamp===generation.current)setError(t("دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.","Unable to load your information. Try again."))}
  finally{if(stamp===generation.current)setLoading(false)}
 }
 useEffect(()=>{void load();const clear=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setSummary(null);setRecords([]);setMessages([]);setTicket(null);setBody("");setSubject("");pending.current=null;setLeaving(false)});const unsubscribe=sessionLifecycle.subscribe(event=>{if(event.type==="revalidate")void load()});return()=>{generation.current++;clear();unsubscribe()}},[path])
 const mutate=async(action:()=>Promise<unknown>,clearDraft=false)=>{
  if(lock.current || unknown)return;lock.current=true;setBusy(true);setError("");setNotice("");const stamp=generation.current
  try{await action();if(stamp!==generation.current)return;if(clearDraft){setBody("");setSubject("");setCreating(false);dirty.current=false;recordId.current=crypto.randomUUID();requestId.current=crypto.randomUUID()}setNotice(t("تغییر ذخیره شد.","Change saved."));await load()}
  catch(error){if(stamp!==generation.current)return;const code=error instanceof Error?error.message:"";if(code==="result_unknown" || code==="record_version_conflict")setUnknown(true);setError(code==="record_version_conflict"?t("اطلاعات تغییر کرده است؛ پیش از ذخیره دوباره دریافت کنید.","Information changed; reload before saving."):t("تغییر تأیید نشد. ورودی‌ها حفظ شده‌اند؛ وضعیت را پیش از تکرار بررسی کنید.","Change unconfirmed. Input retained; check the result before retrying."))}
  finally{lock.current=false;setBusy(false)}
 }
 const visible=records.filter(item=>{if(section==="notifications" && filter==="unread" && item.data.read===true)return false;if(section==="favorites" && filter!=="all" && item.data.kind!==filter)return false;return JSON.stringify(item.data).toLowerCase().includes(query.toLowerCase())})
 const unread=records.filter(item=>item.kind==="notification" && item.data.read!==true).length
 const title=conversation?t("گفتگوی پشتیبانی","Support conversation"):names[section][ix]
 const link=(label:string,route:string)=><a className="text-link" href={route} onClick={event=>{event.preventDefault();follow(route)}}>{label}</a>
 const reload=()=>guard(()=>void load())
 return <DashboardPage page={path} navigate={follow} renderMedia={()=>null} activeSection={section==="dashboard"?"":section} panelTitle={title} liveMode notificationUnreadCount={section==="notifications" && !loading && !error?unread:null}>
  <div className={section==="favorites"?"favorites-page":section==="support"?"support-page":"notifications-page"}>
   <nav className="notifications-breadcrumb" aria-label={t("مسیر صفحه","Breadcrumb")}>{link(t("حساب","Account"),account)}<span>/</span><span aria-current="page">{title}</span></nav>
   <div className="notifications-heading"><div><span className="account-addresses-eyebrow">YOUR ACCOUNT · {conversation?"USER-16":ids[section]}</span><h1>{title}</h1><p>{t("اطلاعات و درخواست‌های همین حساب را مدیریت کنید.","Manage information and requests belonging to this account.")}</p></div><Glyph name={section==="favorites"?"heart":section==="support"?"chat":"bell"} size={30}/></div>
   <div className="notifications-live" role="status">{notice}</div>
   {error&&<section className="notifications-state" role="alert"><p>{error}</p><button className="button secondary" disabled={busy} onClick={reload}>{t("دوباره دریافت کنید","Reload")}</button></section>}
   {loading?<section className="notifications-state" aria-busy="true"><p role="status">{t("در حال دریافت…","Loading…")}</p></section>:!error&&<>
    {section==="support"?<>
     {conversation&&ticket?<div className="conversation-layout"><section className="dash-card"><h2>{text(ticket.data.subject)}</h2><button className="button secondary" disabled={busy || unknown} onClick={()=>void mutate(()=>customerApi.ticketState(ticket,ticket.data.status==="closed"?"submitted":"closed"))}>{ticket.data.status==="closed"?t("بازگشایی تیکت","Reopen ticket"):t("بستن تیکت","Close ticket")}</button><p className="conversation-body" style={{whiteSpace:"pre-wrap"}}>{text(ticket.data.body)}</p><div className="conversation-messages">{messages.map(item=><article className="conversation-message" key={item.id}><strong>{item.data.author==="customer"?t("شما","You"):t("پشتیبانی","Support")}</strong><p style={{whiteSpace:"pre-wrap"}}>{text(item.data.body)}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(en?"en":"fa-IR")}</time></article>)}</div><form className="support-form" onSubmit={event=>{event.preventDefault();void mutate(()=>customerApi.save("message",recordId.current,0,{ticket_id:conversation,body,request_id:requestId.current}),true)}}><label htmlFor="reply-body">{t("پاسخ شما","Your reply")}</label><textarea id="reply-body" value={body} onChange={event=>setBody(event.target.value)} required maxLength={10000} disabled={busy || unknown || ticket.data.status==="closed"}/><button className="button primary" disabled={busy || unknown || !body.trim() || ticket.data.status==="closed"}>{t("ارسال پاسخ","Send reply")}</button></form>{link(t("بازگشت به تیکت‌ها","Back to tickets"),`${account}/support`)}</section></div>:<>
     <button className="button primary" onClick={()=>setCreating(true)} disabled={busy}>{t("تیکت جدید","New ticket")}</button>
     {creating&&<section className="support-new dash-card"><form className="support-form" onSubmit={event=>{event.preventDefault();void mutate(()=>customerApi.save("ticket",recordId.current,0,{topic,subject,body,request_id:requestId.current}),true)}}><label htmlFor="ticket-topic">{t("موضوع","Topic")}</label><SelectDropdown id="ticket-topic" value={topic} disabled={busy || unknown} onChange={event=>setTopic(event.target.value)}>{[["general","عمومی","General"],["account","حساب","Account"],["product","محصول","Product"],["commission","سفارش نقاشی","Commission"]].map(([key,fa,english])=><option key={key} value={key}>{t(fa,english)}</option>)}</SelectDropdown><label htmlFor="ticket-subject">{t("عنوان پیام","Subject")}</label><input id="ticket-subject" value={subject} onChange={event=>setSubject(event.target.value)} minLength={3} maxLength={160} required disabled={busy || unknown}/><label htmlFor="ticket-body">{t("شرح درخواست","Description")}</label><textarea id="ticket-body" value={body} onChange={event=>setBody(event.target.value)} minLength={10} maxLength={10000} required disabled={busy || unknown}/><div className="support-form-actions"><button className="button primary" disabled={busy || unknown}>{t("ثبت تیکت","Submit ticket")}</button><button type="button" className="button secondary" onClick={()=>guard(()=>{setCreating(false);setBody("");setSubject("")})}>{t("انصراف","Cancel")}</button></div></form></section>}
     <div className="support-list">{records.map(item=><article className="support-ticket dash-card" key={item.id}><h2>{text(item.data.subject)}</h2><span>{text(item.data.status)==="submitted"?t("ثبت‌شده","Submitted"):text(item.data.status)}</span><time>{new Date(item.updated_at).toLocaleDateString(en?"en":"fa-IR")}</time>{link(t("مشاهده گفتگو","View conversation"),`${account}/support/${item.id}`)}</article>)}</div>{!records.length&&<section className="support-state"><Glyph name="chat" size={36}/><h2>{t("هنوز تیکتی ندارید","No tickets yet")}</h2></section>}</>}
    </>:<>
     {section==="dashboard"&&summary&&<div className="dash-stats">{([["heart",t("علاقه‌مندی‌ها","Favorites"),summary.favorites,"favorites"],["box",t("آدرس‌ها","Addresses"),summary.addresses,"addresses"],["chat",t("تیکت‌های پشتیبانی","Support tickets"),summary.tickets,"support"],["bell",t("اعلان‌های خوانده‌نشده","Unread notifications"),summary.unread_notifications,"notifications"]] as const).map(([icon,label,count,slug])=><a className="dash-stat" href={`${account}/${slug}`} key={slug} onClick={event=>{event.preventDefault();follow(`${account}/${slug}`)}}><span className="dash-stat-icon"><Glyph name={icon}/></span><strong>{count.toLocaleString(en?"en":"fa-IR")}</strong><span>{label}</span></a>)}</div>}
     {section!=="dashboard"&&<div className="notifications-filters"><label>{t("جستجو","Search")}<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label><label>{t("فیلتر","Filter")}<SelectDropdown value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">{t("همه","All")}</option>{section==="notifications"?<option value="unread">{t("خوانده‌نشده","Unread")}</option>:section==="favorites"?[["product","محصول","Product"],["bundle","پکیج","Bundle"],["artwork","اثر هنری","Artwork"]].map(([key,fa,english])=><option value={key} key={key}>{t(fa,english)}</option>):null}</SelectDropdown></label></div>}
     <div className="notifications-list">{visible.map(item=><article className="notification-card dash-card" key={item.id}>{item.kind==="favorite"?<><h2>{text((item.catalog as Record<string,unknown>|null)?.[en?"title_en":"title_fa"]) || t("این مورد در حال حاضر در دسترس نیست","This item is currently unavailable")}</h2>{item.catalog&&link(t("مشاهده","View"),`${prefix}/${item.data.kind==="product"?"products":item.data.kind==="bundle"?"bundles":"artworks"}/${text((item.catalog as Record<string,unknown>).slug)}`)}<button className="button secondary" disabled={busy || unknown} onClick={()=>void mutate(()=>customerApi.remove("favorite",item.id,item.version))}>{t("حذف از علاقه‌مندی‌ها","Remove favorite")}</button></>:<><h2>{text(item.data[en?"title_en":"title_fa"])}</h2>{item.data.ticket_id&&link(t("مشاهده گفتگو","View conversation"),`${account}/support/${text(item.data.ticket_id)}`)}{item.data.read!==true&&<button className="notifications-text-button" disabled={busy || unknown} onClick={()=>void mutate(()=>customerApi.save("notification",item.id,item.version,{read:true}))}>{t("خوانده شد","Mark read")}</button>}</>}<time dateTime={item.created_at}>{new Date(item.created_at).toLocaleDateString(en?"en":"fa-IR")}</time></article>)}</div>
     {!visible.length&&<section className="notifications-state"><Glyph name={section==="favorites"?"heart":"bell"} size={36}/><h2>{t("موردی برای نمایش نیست","Nothing to display")}</h2><p>{t("اطلاعات تازه پس از ثبت در این حساب نمایش داده می‌شود.","New records appear after they are created for this account.")}</p></section>}
    </>}
    {cursor&&<button className="button secondary" disabled={busy} onClick={()=>void load(cursor)}>{t("نمایش بیشتر","Load more")}</button>}
   </>}
   <dialog ref={dialog} className="support-dialog" aria-labelledby="customer-leave-title" onCancel={()=>{pending.current=null;setLeaving(false)}}><h2 id="customer-leave-title">{t("تغییرات ذخیره نشده","Unsaved changes")}</h2><p>{t("تغییرات ذخیره نشده کنار گذاشته شوند؟","Discard your unsaved changes?")}</p><div className="support-form-actions"><button className="button secondary" onClick={()=>{pending.current=null;setLeaving(false)}}>{t("ادامه ویرایش","Keep editing")}</button><button className="button primary" onClick={()=>{const proceed=pending.current;pending.current=null;dirty.current=false;setLeaving(false);proceed?.()}}>{t("کنار گذاشتن تغییرات","Discard changes")}</button></div></dialog>
  </div>
 </DashboardPage>
}
