"use client"
import {AdminButton} from "../../components/admin/AdminUI"
import {useEffect,useRef,useState} from "react"
import AdminDashboard from "../../design/AdminDashboard"
import {useAccountAccess} from "../identity/use-account-access"
import {sessionLifecycle} from "../identity/session-lifecycle"
import {useNavigationGuard} from "../navigation/NavigationGuardProvider"
import type {NavigationGuard} from "../navigation/history-guard"
import {catalogManagementApi,type EntryDraft,type EntryKind,type ManagedEntry} from "./catalog-api"
import "./account-management.css"

const blank:EntryDraft={slug:"",title_fa:"",title_en:"",description_fa:"",description_en:"",collection_ids:[],category_ids:[]}
const draftOf=(record:ManagedEntry):EntryDraft=>({slug:record.slug,title_fa:record.title_fa,title_en:record.title_en,description_fa:record.description_fa,description_en:record.description_en,collection_ids:record.collection_ids,category_ids:record.category_ids})
const canonical=(draft:EntryDraft)=>JSON.stringify({...draft,collection_ids:[...draft.collection_ids].sort(),category_ids:[...draft.category_ids].sort()})

export default function CatalogEditor({path,navigate,embedded=false,registerOverride,onSaved}:{path:string;navigate:(path:string)=>void;embedded?:boolean;registerOverride?:(guard:NavigationGuard|null)=>void;onSaved?:()=>void}){
 const en=path.startsWith("/en/"),t=(fa:string,english:string)=>en?english:fa
 const parts=path.split("/"),kind=parts[3] as EntryKind,isNew=parts[4]==="new",base=`/${en?"en":"fa"}/admin`
 const [entryId]=useState(()=>isNew?crypto.randomUUID():parts[4])
 const access=useAccountAccess()
 const [record,setRecord]=useState<ManagedEntry|null>(null),[draft,setDraft]=useState<EntryDraft>(blank),[reason,setReason]=useState("")
 const [collections,setCollections]=useState<ManagedEntry[]>([]),[categories,setCategories]=useState<ManagedEntry[]>([])
 const [audits,setAudits]=useState<Awaited<ReturnType<typeof catalogManagementApi.audits>>["items"]>([]),[before,setBefore]=useState<number|null>(null)
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[mustReload,setMustReload]=useState(false)
 const [publication,setPublication]=useState<boolean|null>(null),[publicationReason,setPublicationReason]=useState("")
 const [leaving,setLeaving]=useState(false)
 const generation=useRef(0),lock=useRef(false),dirty=useRef(false),pending=useRef<(()=>void)|null>(null)
 const leaveDialog=useRef<HTMLDialogElement>(null),publicationDialog=useRef<HTMLDialogElement>(null),globalGuard=useNavigationGuard(),registerGuard=registerOverride??globalGuard
 const contentChanged=canonical(draft)!==canonical(record?draftOf(record):blank)
 dirty.current=contentChanged||!!reason.trim()||!!publicationReason.trim()
 const guard=(proceed:()=>void)=>{if(lock.current)return false;if(dirty.current){pending.current=proceed;setLeaving(true);return false}proceed();return true}
 useEffect(()=>{
  registerGuard(guard)
  const unload=(event:BeforeUnloadEvent)=>{if(dirty.current||lock.current){event.preventDefault();event.returnValue=""}}
  window.addEventListener("beforeunload",unload)
  return()=>{registerGuard(null);window.removeEventListener("beforeunload",unload)}
 },[registerGuard])
 useEffect(()=>{if(leaving)leaveDialog.current?.showModal();else leaveDialog.current?.close()},[leaving])
 useEffect(()=>{if(publication!==null)publicationDialog.current?.showModal();else publicationDialog.current?.close()},[publication])
 function accept(value:ManagedEntry){setRecord(value);setDraft(draftOf(value));setReason("");setMustReload(false);setPublication(null);setPublicationReason("")}
 async function history(id=entryId,append=false){
  const request=generation.current
  try{const page=await catalogManagementApi.audits(kind,id,append&&before?before:undefined);if(request!==generation.current)return;setAudits(old=>append?[...old,...page.items]:page.items);setBefore(page.next_before_version)}
  catch{if(request===generation.current)setError(t("دریافت تاریخچه ممکن نشد.","Unable to load history."))}
 }
 async function load(force=false){
  const request=++generation.current;setLoading(true);setError("");setMessage("")
  try{
   const [value,collectionChoices,categoryChoices]=await Promise.all([
    isNew&&!force?Promise.resolve(null):catalogManagementApi.read(kind,entryId),
    kind==="products"?catalogManagementApi.choices("collections"):Promise.resolve([]),
    kind==="products"?catalogManagementApi.choices("categories"):Promise.resolve([])
   ])
   if(request!==generation.current)return
   setCollections(collectionChoices);setCategories(categoryChoices)
   if(value){accept(value);await history()}else{setRecord(null);setDraft(blank);setReason("");setMustReload(false)}
  }catch(cause){
   if(request!==generation.current)return
   const code=cause instanceof Error?cause.message:""
   if(force&&isNew&&code==="catalog_entry_not_found"){
    setMustReload(false);setMessage(t("سرویس تأیید کرد این شناسه ثبت نشده است. پیش‌نویس را بررسی و دوباره ذخیره کنید.","The server confirmed this ID was not created. Review your draft before saving again."))
   }else setError(t("دریافت رکورد ممکن نشد. ورودی‌ها حفظ شده‌اند.","Unable to load the record. Your inputs are preserved."))
  }finally{if(request===generation.current)setLoading(false)}
 }
 useEffect(()=>{
  const unregister=sessionLifecycle.registerPrivateCache(()=>{generation.current++;dirty.current=false;setRecord(null);setDraft(blank);setReason("");setCollections([]);setCategories([]);setAudits([]);setBefore(null);setError("");setMessage("");setPublication(null);setPublicationReason("");setLeaving(false);pending.current=null})
  void load()
  return()=>{generation.current++;unregister()}
 },[])
 function mutationError(cause:unknown){
  const code=cause instanceof Error?cause.message:""
  if(["catalog_version_conflict","result_unknown"].includes(code))setMustReload(true)
  const messages:Record<string,[string,string]>={
   catalog_version_conflict:["رکورد تغییر کرده است. پیش از ذخیره، دوباره دریافت کنید.","This record changed. Reload before saving."],
   catalog_identity_conflict:["شناسه مسیر یا شناسه رکورد تکراری است. رکورد موجود را بررسی کنید.","The slug or record ID already exists. Review the existing record."],
   published_slug_immutable:["شناسه مسیر رکورد منتشرشده قابل تغییر نیست.","A published record's slug cannot be changed."],
   catalog_dependency_unpublished:["کالکشن‌ها و دسته‌های مرتبط باید ابتدا منتشر شوند.","Linked collections and categories must be published first."],
   catalog_membership_not_found:["یکی از کالکشن‌ها یا دسته‌های انتخاب‌شده دیگر موجود نیست.","A selected collection or category no longer exists."],
   validation_error:["عنوان‌ها، شناسه مسیر و دلیل تغییر را بررسی کنید.","Check the titles, slug and reason for change."],
   result_unknown:["نتیجه تأیید نشد. برای بررسی وضعیت، رکورد را دوباره دریافت کنید.","Result unconfirmed. Reload this record to check its state."],
  }
  const pair=messages[code]
  if(!pair&&!['catalog_dependency_unpublished','validation_error'].includes(code))setMustReload(true)
  setError(pair?t(...pair):t("ذخیره تأیید نشد. مجوز و وضعیت رکورد را دوباره بررسی کنید.","Save was not confirmed. Recheck access and reload the record."))
 }
 async function save(){
  if(lock.current||mustReload||!reason.trim())return
  lock.current=true;setBusy(true);setError("");setMessage("");const request=generation.current
  try{
   const value=record?await catalogManagementApi.update(record,draft,reason):await catalogManagementApi.create(kind,entryId,draft,reason)
   if(request!==generation.current)return
   accept(value);dirty.current=false;onSaved?.();setMessage(t("متن ذخیره و در تاریخچه ثبت شد.","Content saved and audited."));await history(value.id)
   if(isNew&&request===generation.current){lock.current=false;navigate(`${base}/${kind}/${value.id}/edit`)}
  }catch(cause){if(request===generation.current)mutationError(cause)}
  finally{lock.current=false;setBusy(false)}
 }
 async function publish(){
  if(!record||publication===null||!publicationReason.trim()||lock.current||mustReload)return
  lock.current=true;setBusy(true);setError("");setMessage("");const request=generation.current
  try{
   const value=await catalogManagementApi.publication(record,publication,publicationReason)
   if(request!==generation.current)return
   accept(value);onSaved?.();setMessage(value.published?t("رکورد منتشر و در تاریخچه ثبت شد.","Record published and audited."):t("نمایش عمومی متوقف و در تاریخچه ثبت شد.","Record unpublished and audited."));await history(value.id)
  }catch(cause){if(request===generation.current){setPublication(null);setPublicationReason("");mutationError(cause)}}
  finally{lock.current=false;setBusy(false)}
 }
 function membership(field:"collection_ids"|"category_ids",id:string,checked:boolean){setDraft(current=>({...current,[field]:checked?[...current[field],id]:current[field].filter(value=>value!==id)}))}
 const name=kind==="products"?t("محصول","Product"):kind==="collections"?t("کالکشن","Collection"):t("دسته","Category")
 const content=<>
  <section className="ad-panel">
   <div className="ad-panel-head"><button className="ad-link" disabled={busy} onClick={()=>{guard(()=>navigate(`${base}/${kind}`))}}>← {t("بازگشت به فهرست","Back to list")}</button>{record&&<span className={`ad-badge ${record.published?"green":"warm"}`}>{record.published?t("منتشرشده","Published"):t("پیش‌نویس","Draft")} · {new Intl.NumberFormat(en?"en":"fa").format(record.version)}</span>}<AdminButton className="button secondary" disabled={loading||busy} onClick={()=>{guard(()=>void load(!!record||mustReload))}}>{t("دریافت دوباره","Reload record")}</AdminButton></div>
   {loading&&<p role="status" aria-busy="true">{t("در حال دریافت…","Loading…")}</p>}
   {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
   {!loading&&(record||isNew)&&<form className="identity-editor" onSubmit={event=>{event.preventDefault();void save()}}>
    <fieldset disabled={busy||mustReload} className="catalog-fields"><legend>{t("متن دوزبانه","Bilingual content")}</legend>
     <label>{t("شناسه مسیر","Slug")}<input className="admin-price-input" value={draft.slug} dir="ltr" maxLength={160} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" readOnly={!!record?.published} onChange={event=>setDraft({...draft,slug:event.target.value})}/></label>
     <p className="ad-footnote">{t("حروف کوچک انگلیسی، عدد و خط تیره. شناسه رکورد منتشرشده ثابت است.","Lowercase Latin letters, numbers and hyphens. Published slugs are fixed.")}</p>
     <label>{t("عنوان فارسی","Persian title")}<input className="admin-price-input" dir="rtl" value={draft.title_fa} maxLength={300} required onChange={event=>setDraft({...draft,title_fa:event.target.value})}/></label>
     <label>{t("عنوان انگلیسی","English title")}<input className="admin-price-input" dir="ltr" value={draft.title_en} maxLength={300} required onChange={event=>setDraft({...draft,title_en:event.target.value})}/></label>
     <label>{t("شرح فارسی","Persian description")}<textarea dir="rtl" value={draft.description_fa} maxLength={10000} onChange={event=>setDraft({...draft,description_fa:event.target.value})}/></label>
     <label>{t("شرح انگلیسی","English description")}<textarea dir="ltr" value={draft.description_en} maxLength={10000} onChange={event=>setDraft({...draft,description_en:event.target.value})}/></label>
    </fieldset>
    {kind==="products"&&[["collection_ids",collections,t("کالکشن‌ها","Collections")],["category_ids",categories,t("دسته‌ها","Categories")]].map(([field,choices,label])=>{
     const key=field as "collection_ids"|"category_ids",items=choices as ManagedEntry[]
     return <fieldset key={key} disabled={busy||mustReload} className="catalog-memberships"><legend>{label as string}</legend>{items.length?items.map(choice=><label key={choice.id}><input type="checkbox" checked={draft[key].includes(choice.id)} onChange={event=>membership(key,choice.id,event.target.checked)}/>{en?choice.title_en:choice.title_fa} · {choice.published?t("منتشرشده","Published"):t("پیش‌نویس","Draft")}</label>):<p>{t("رکوردی ثبت نشده است.","No records found.")}</p>}{draft[key].filter(id=>!items.some(choice=>choice.id===id)).map(id=><label key={id}><input type="checkbox" checked onChange={()=>membership(key,id,false)}/><span dir="ltr">{id}</span> · {t("رکورد در دسترس نیست","Unavailable record")}</label>)}</fieldset>
    })}
    <label>{t("دلیل تغییر","Reason for change")}<input className="admin-price-input" value={reason} required maxLength={1000} disabled={busy||mustReload} onChange={event=>setReason(event.target.value)}/></label>
    <p>{record?.published?t("ذخیره، متن عمومی را بلافاصله تغییر می‌دهد. انتشار SKU و اطلاعات تصویر مستقل است.","Saving immediately changes public text. SKU and presentation publication are separate."):t("ذخیره، پیش‌نویس را ثبت می‌کند؛ انتشار اقدام مستقل و نیازمند تأیید است.","Saving records a draft. Publication is a separate confirmed action.")}</p>
    <AdminButton className="button primary" disabled={busy||mustReload||!reason.trim()}>{busy?t("در حال ذخیره…","Saving…"):t("تأیید و ذخیره متن","Confirm and save content")}</AdminButton>
   </form>}
  </section>
  {record&&(kind==='products'||kind==='collections')&&<AdminButton disabled={busy} onClick={()=>guard(()=>navigate(`${base}/${kind}/${entryId}/profile`))}>{t('مشخصات و تصاویر تأییدشده','Specifications and approved images')}</AdminButton>}
  {record&&<section className="ad-panel"><div className="ad-panel-head"><div><h2>{t("انتشار","Publication")}</h2><p>{t("ابتدا تغییرات متن را ذخیره کنید. این اقدام موجودی، قیمت یا انتشار SKU را تغییر نمی‌دهد.","Save content edits first. This action does not change stock, prices or SKU publication.")}</p></div><AdminButton className="button secondary" disabled={busy||mustReload||contentChanged||!!reason.trim()} onClick={()=>{setPublication(!record.published);setPublicationReason("")}}>{record.published?t("توقف نمایش عمومی","Unpublish"):t("انتشار رکورد","Publish record")}</AdminButton></div></section>}
  {!!record&&<section className="ad-panel"><div className="ad-panel-head"><h2>{t("تاریخچه تغییرات","Change history")}</h2><button className="ad-link" disabled={busy} onClick={()=>void history()}>{t("دریافت تاریخچه","Reload history")}</button></div>{audits.length?audits.map(audit=><article className="ad-money-row" key={audit.id}><div><strong>{{created:t("ایجاد پیش‌نویس","Draft created"),edited:t("ویرایش متن","Content edited"),published:t("انتشار","Published"),unpublished:t("توقف نمایش عمومی","Unpublished")}[audit.action]||audit.action} · {audit.reason}</strong><small><time>{new Date(audit.created_at).toLocaleString(en?"en-GB":"fa-IR",{timeZone:"Asia/Tehran"})}</time> · {t("نسخه","Version")} {new Intl.NumberFormat(en?"en":"fa").format(audit.version)}</small></div></article>):<p>{t("تاریخچه‌ای ثبت نشده است.","No history recorded.")}</p>}{before&&<AdminButton className="button secondary" disabled={busy} onClick={()=>void history(entryId,true)}>{t("تاریخچه قدیمی‌تر","Older history")}</AdminButton>}</section>}
  <dialog ref={publicationDialog} className="ad-destination" aria-labelledby="catalog-publication" onCancel={event=>{if(busy){event.preventDefault();return}setPublication(null);setPublicationReason("")}}>
   <h2 id="catalog-publication">{publication?t("تأیید انتشار","Confirm publication"):t("تأیید توقف نمایش عمومی","Confirm unpublishing")}</h2>
   <p>{publication?t("متن ذخیره‌شده در فروشگاه عمومی قابل مشاهده می‌شود. کالکشن‌ها و دسته‌های محصول باید منتشر باشند.","Saved text will become visible in the public store. Product collections and categories must be published."):t("رکورد از فروشگاه عمومی پنهان می‌شود. ارتباط‌ها و تاریخچه حذف نمی‌شوند؛ محصولات یا پکیج‌های وابسته ممکن است از نتایج عمومی حذف شوند.","This record will be hidden from the public store. Links and history remain; dependent products or bundles may disappear from public results.")}</p>
   <form className="identity-editor" onSubmit={event=>{event.preventDefault();void publish()}}><label>{t("دلیل انتشار یا توقف","Publication reason")}<input className="admin-price-input" required maxLength={1000} value={publicationReason} disabled={busy} onChange={event=>setPublicationReason(event.target.value)}/></label><AdminButton className="button primary" disabled={busy||!publicationReason.trim()}>{busy?t("در حال ثبت…","Submitting…"):publication?t("تأیید و انتشار","Confirm and publish"):t("تأیید و توقف نمایش","Confirm and unpublish")}</AdminButton><AdminButton type="button" className="button secondary" disabled={busy} onClick={()=>{setPublication(null);setPublicationReason("")}}>{t("انصراف","Cancel")}</AdminButton></form>
  </dialog>
  <dialog ref={leaveDialog} className="modal" aria-labelledby="catalog-leave" onCancel={()=>{setLeaving(false);pending.current=null}}><h2 id="catalog-leave">{t("تغییرات ذخیره نشده","Unsaved changes")}</h2><p>{t("تغییرات کنار گذاشته شوند؟","Discard your changes?")}</p><AdminButton className="button secondary" onClick={()=>{setLeaving(false);pending.current=null}}>{t("ادامه ویرایش","Keep editing")}</AdminButton><AdminButton className="button primary" onClick={()=>{const action=pending.current;pending.current=null;dirty.current=false;setLeaving(false);action?.()}}>{t("کنار گذاشتن","Discard")}</AdminButton></dialog>
 </>
 return embedded?content:<AdminDashboard live={{path,title:`${name} · ${isNew&&!record?t("پیش‌نویس جدید","New draft"):t("ویرایش","Edit")}`,navigate:route=>{guard(()=>navigate(route))},permissions:access.access?.permissions||[],children:content}}/>
}
