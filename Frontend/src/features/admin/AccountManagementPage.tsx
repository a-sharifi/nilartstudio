"use client"
import {AdminAction,AdminButton,AdminFilters,AdminTable} from "../../components/admin/AdminUI"
import "./account-management.css"
import {useEffect,useRef,useState} from "react"
import AdminDashboard from "../../design/AdminDashboard"
import Dropdown from "../../components/ui/Dropdown"
import {identityManagementApi, type ManagedAccount} from "./identity-api"
import {useAccountAccess} from "../identity/use-account-access"
import {sessionLifecycle} from "../identity/session-lifecycle"
import {accountAccessStore} from "../identity/access-store"
import {useNavigationGuard} from "../navigation/NavigationGuardProvider"

const roles=["customer","artist","operations","finance","admin"] as const
export default function AccountManagementPage({path,navigate}:{path:string;navigate:(path:string)=>void}){
 const en=path.startsWith("/en/"),t=(fa:string,english:string)=>en?english:fa
 const artists=/\/artists\/?$/.test(path)
 const access=useAccountAccess()
 const [rows,setRows]=useState<ManagedAccount[]>([]),[permissions,setPermissions]=useState<string[]>([]),[selected,setSelected]=useState<ManagedAccount|null>(null),[reason,setReason]=useState(""),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("")
 const [query,setQuery]=useState(""),[appliedQuery,setAppliedQuery]=useState("")
 const [roleFilter,setRoleFilter]=useState<typeof roles[number]|"all">("all")
 const [statusFilter,setStatusFilter]=useState<"all"|"active"|"restricted">("all")
 const [mustReload,setMustReload]=useState(false)
 const [audits,setAudits]=useState<Awaited<ReturnType<typeof identityManagementApi.audits>>>([])
 const generation=useRef(0),lock=useRef(false)
 const registerGuard=useNavigationGuard(),dirty=useRef(false),locked=useRef(false),pending=useRef<(()=>void)|null>(null),leaveDialog=useRef<HTMLDialogElement>(null)
 const [leaving,setLeaving]=useState(false)
 const original=rows.find(row=>row.id===selected?.id)
 dirty.current=!!selected && (!!reason.trim() || JSON.stringify([selected.roles,selected.overrides,selected.blocked])!==JSON.stringify([original?.roles,original?.overrides,original?.blocked]))
 locked.current=busy
 const requestNavigation=(proceed:()=>void)=>{
  if(locked.current)return false
  if(!dirty.current){proceed();return true}
  pending.current=proceed;setLeaving(true);return false
 }
 useEffect(()=>{registerGuard(requestNavigation);const unload=(event:BeforeUnloadEvent)=>{if(dirty.current || locked.current){event.preventDefault();event.returnValue=""}};window.addEventListener("beforeunload",unload);return()=>{registerGuard(null);window.removeEventListener("beforeunload",unload)}},[registerGuard])
 useEffect(()=>{if(leaving)leaveDialog.current?.showModal();else leaveDialog.current?.close()},[leaving])
 const load=async(next?:string,search=appliedQuery,filter=roleFilter,status=statusFilter)=>{
  const request=++generation.current;setLoading(true);setError("");setRows([]);setCursor(null);setSelected(null);setAudits([]);setReason("")
  try {const [page,keys]=await Promise.all([identityManagementApi.list(next,artists?"artist":filter==="all"?undefined:filter,search,status==="all"?undefined:status==="restricted"),identityManagementApi.permissions()]);if(request!==generation.current)return;setMustReload(false);setRows(page.items);setPermissions(keys);setCursor(page.next_cursor);setSelected(null);setAudits([]);setReason("")}
  catch(cause){if(request===generation.current)setError(cause instanceof Error&&cause.message==="invalid_phone_search"?t("شماره تلفن یا بخشی از آن را وارد کنید.","Enter a phone number or part of one."):t("دریافت کاربران ممکن نشد.","Unable to load accounts."))}
  finally{if(request===generation.current)setLoading(false)}
 }
 useEffect(()=>{
  const unregister=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setQuery("");setAppliedQuery("");setRoleFilter("all");setStatusFilter("all");setRows([]);setSelected(null);setAudits([]);setReason("");setError("");setMessage("");setPermissions([]);setLeaving(false);pending.current=null})
  void load()
  return()=>{generation.current++;unregister()}
 // The page remounts when the authenticated boundary changes.
 },[])
 const save=async()=>{
  if(!selected || !reason.trim() || lock.current || mustReload)return
  lock.current=true;setBusy(true);setError("");setMessage("")
  const request=generation.current
  try {const result=await identityManagementApi.update(selected,reason);if(request!==generation.current)return;setRows(old=>old.map(row=>row.id===result.id?result:row));if((artists&&!result.roles.includes("artist"))||(!artists&&roleFilter!=="all"&&!result.roles.includes(roleFilter))||(statusFilter==="active"&&result.blocked)||(statusFilter==="restricted"&&!result.blocked)){setRows(old=>old.filter(row=>row.id!==result.id));setSelected(null)}else setSelected(result);setReason("");setMessage(t("دسترسی ذخیره و در تاریخچه ثبت شد.","Access saved and audited."));setAudits([]);if(result.id===access.access?.owner)void accountAccessStore.refresh()}
  catch(error){if(request!==generation.current)return;const code=error instanceof Error?error.message:"";if(["access_version_conflict","result_unknown"].includes(code))setMustReload(true);setError(code==="access_version_conflict"?t("دسترسی تغییر کرده است. اطلاعات را دوباره دریافت کنید.","Access changed. Reload before editing."):code==="last_access_manager"?t("آخرین مسئول مدیریت دسترسی قابل حذف یا محدود کردن نیست.","The last access manager cannot be removed or restricted."):code==="result_unknown"?t("نتیجه تأیید نشد. پیش از ارسال دوباره، اطلاعات را دریافت کنید.","Result unconfirmed. Reload before resubmitting."):t("تغییر ذخیره نشد. مجوز، نشست و اطلاعات را بررسی کنید.","Change was not saved. Check permission, session and input."))}
  finally{lock.current=false;setBusy(false)}
 }
 const select=async(row:ManagedAccount)=>{
  if(busy)return
  setSelected({...row,roles:[...row.roles],overrides:{...row.overrides}});setReason("");setError("");setMessage("");setAudits([])
  const request=++generation.current
  try{const result=await identityManagementApi.audits(row.id);if(request===generation.current)setAudits(result)}catch{if(request===generation.current)setError(t("دریافت تاریخچه ممکن نشد.","Unable to load history."))}
 }
 return <AdminDashboard live={{path,title:artists?t("هنرمندان","Artists"):t("کاربران و دسترسی‌ها","Users & permissions"),navigate:route=>{requestNavigation(()=>navigate(route))},permissions:access.access?.permissions||[],children:<>
  <section className="ad-panel">{artists&&<p>{t("حساب‌های دارای نقش هنرمند. تخصیص سفارش و تسویه هنوز متصل نیستند؛ افزودن نقش هنرمند از صفحه کاربران انجام می‌شود.","Accounts with the artist role. Assignment and settlement are not connected yet; assign the artist role from Users.")}</p>}<div className="ad-panel-head"><p>{t("نقش‌ها، مجوزهای مستقل و محدودیت حساب را با دلیل ثبت‌شده مدیریت کنید.","Manage roles, individual permissions and restrictions with a recorded reason.")}</p><AdminButton className="button secondary" disabled={busy || loading} onClick={()=>{requestNavigation(()=>void load())}}>{t("دریافت دوباره","Reload")}</AdminButton></div>
<AdminFilters className="identity-editor support-subject-search" onSubmit={event=>{event.preventDefault();requestNavigation(()=>{const value=query.trim();setAppliedQuery(value);setCursor(null);void load(undefined,value)})}}>  {!artists&&<label className="admin-role-filter">{t("نقش حساب","Account role")}<Dropdown label={t("نقش حساب","Account role")} autocomplete={false} disabled={busy||loading} value={roleFilter} options={[{value:"all",label:t("همه نقش‌ها","All roles")},...roles.map(value=>({value,label:({customer:t("مشتری","Customer"),artist:t("هنرمند","Artist"),operations:t("عملیات","Operations"),finance:t("مالی","Finance"),admin:t("مدیر","Admin")})[value]}))]} onChange={value=>{requestNavigation(()=>{const filter=value as typeof roleFilter;setRoleFilter(filter);setCursor(null);void load(undefined,appliedQuery,filter)})}}/></label>}
  <label className="admin-role-filter">{t("وضعیت حساب","Account status")}<Dropdown label={t("وضعیت حساب","Account status")} autocomplete={false} disabled={busy||loading} value={statusFilter} options={[{value:"all",label:t("همه وضعیت‌ها","All statuses")},{value:"active",label:t("فعال","Active")},{value:"restricted",label:t("محدود","Restricted")}]} onChange={value=>{requestNavigation(()=>{const status=value as typeof statusFilter;setStatusFilter(status);void load(undefined,appliedQuery,roleFilter,status)})}}/></label>
  <label>{t("جست‌وجوی شماره تلفن","Search phone number")}<input type="search" maxLength={32} value={query} disabled={busy||loading} onChange={event=>setQuery(event.target.value)}/></label><div><AdminButton className="button secondary" disabled={busy||loading}>{t("جست‌وجو","Search")}</AdminButton>{(query||appliedQuery)&&<AdminButton type="button" className="button secondary" disabled={busy||loading} onClick={()=>{requestNavigation(()=>{setQuery("");setAppliedQuery("");setCursor(null);void load(undefined,"")})}}>{t("پاک‌کردن جست‌وجو","Clear search")}</AdminButton>}</div></AdminFilters>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {loading?<p role="status" aria-busy="true">{t("در حال دریافت کاربران…","Loading accounts…")}</p>:rows.length?<div className="ad-table-wrap identity-accounts"><AdminTable className="ad-table"><thead><tr><th>{t("تلفن","Phone")}</th><th>{t("نقش‌ها","Roles")}</th><th>{t("وضعیت","Status")}</th><th>{t("اقدام","Action")}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td dir="ltr">{row.phone}</td><td>{row.roles.join(" · ")}</td><td>{row.blocked?t("محدود","Restricted"):t("فعال","Active")}</td><td><AdminAction icon="options" className="text-link" disabled={busy} onClick={()=>{requestNavigation(()=>void select(row))}}>{t("ویرایش دسترسی","Edit access")}</AdminAction></td></tr>)}</tbody></AdminTable></div>:!error&&<p>{t("کاربری ثبت نشده است.","No accounts found.")}</p>}
  {cursor&&<AdminButton className="button secondary" disabled={busy || loading} onClick={()=>{requestNavigation(()=>void load(cursor))}}>{t("صفحه بعد","Next page")}</AdminButton>}</section>
  {selected&&<section className="ad-panel"><div className="ad-panel-head"><h2 dir="ltr">{selected.phone}</h2></div><form className="identity-editor" onSubmit={event=>{event.preventDefault();void save()}}><fieldset disabled={busy}><legend>{t("نقش‌ها","Roles")}</legend>{roles.map(role=><label key={role}><input type="checkbox" checked={selected.roles.includes(role)} onChange={event=>setSelected({...selected,roles:event.target.checked?[...selected.roles,role]:selected.roles.filter(value=>value!==role)})}/>{role}</label>)}</fieldset><fieldset disabled={busy}><legend>{t("مجوزهای مستقل","Individual permissions")}</legend>{permissions.map(permission=><label key={permission}><span dir="ltr">{permission}</span><Dropdown label={permission} disabled={busy} options={[{value:"inherit",label:t("طبق نقش","From role")},{value:"allow",label:t("مجاز","Allow")},{value:"deny",label:t("غیرمجاز","Deny")}]} value={permission in selected.overrides?(selected.overrides[permission]?"allow":"deny"):"inherit"} onChange={value=>{const overrides={...selected.overrides};if(value==="inherit")delete overrides[permission];else overrides[permission]=value==="allow";setSelected({...selected,overrides})}}/></label>)}</fieldset><label className="identity-restriction"><input type="checkbox" disabled={busy} checked={selected.blocked} onChange={event=>setSelected({...selected,blocked:event.target.checked})}/>{t("محدود کردن حساب و پایان نشست‌ها","Restrict account and revoke sessions")}</label><label htmlFor="access-reason">{t("دلیل تغییر","Reason for change")}</label><textarea id="access-reason" value={reason} maxLength={1000} required disabled={busy} onChange={event=>setReason(event.target.value)}/><p>{t("با ذخیره، این نقش‌ها و مجوزها اعمال و تغییر در تاریخچه ثبت می‌شود. محدود کردن حساب تمام نشست‌های آن را پایان می‌دهد.","Saving applies these roles and permissions and records the change. Restricting an account ends all its sessions.")}</p><AdminButton className="button primary" disabled={busy || mustReload || !reason.trim()}>{busy?t("در حال ذخیره…","Saving…"):t("تأیید و ذخیره دسترسی","Confirm and save access")}</AdminButton></form><h3>{t("تاریخچه","History")}</h3>{audits.length?audits.map(audit=><article key={audit.id}><time>{new Date(audit.created_at).toLocaleString(en?"en-GB":"fa-IR",{timeZone:"Asia/Tehran"})}</time><p>{audit.action} · {audit.reason}</p></article>):<p>{t("تاریخچه‌ای برای نمایش نیست.","No history to display.")}</p>}</section>}
 <dialog className="modal" ref={leaveDialog} onCancel={()=>{setLeaving(false);pending.current=null}} aria-labelledby="access-leave-title"><h2 id="access-leave-title">{t("تغییرات ذخیره نشده","Unsaved changes")}</h2><p>{t("تغییرات ذخیره نشده کنار گذاشته شوند؟","Discard your unsaved changes?")}</p><AdminButton className="button secondary" onClick={()=>{setLeaving(false);pending.current=null}}>{t("ادامه ویرایش","Keep editing")}</AdminButton><AdminButton className="button primary" onClick={()=>{const action=pending.current;pending.current=null;dirty.current=false;setLeaving(false);action?.()}}>{t("کنار گذاشتن تغییرات","Discard changes")}</AdminButton></dialog>
 </>}}/>
}
