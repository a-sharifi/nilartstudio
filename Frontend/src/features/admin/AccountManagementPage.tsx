"use client"
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
 const access=useAccountAccess()
 const [rows,setRows]=useState<ManagedAccount[]>([]),[permissions,setPermissions]=useState<string[]>([]),[selected,setSelected]=useState<ManagedAccount|null>(null),[reason,setReason]=useState(""),[cursor,setCursor]=useState<string|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("")
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
 const load=async(next?:string)=>{
  const request=++generation.current;setLoading(true);setError("")
  try {const [page,keys]=await Promise.all([identityManagementApi.list(next),identityManagementApi.permissions()]);if(request!==generation.current)return;setMustReload(false);setRows(page.items);setPermissions(keys);setCursor(page.next_cursor);setSelected(null);setAudits([]);setReason("")}
  catch{if(request===generation.current)setError(t("دریافت کاربران ممکن نشد.","Unable to load accounts."))}
  finally{if(request===generation.current)setLoading(false)}
 }
 useEffect(()=>{
  const unregister=sessionLifecycle.registerPrivateCache(()=>{generation.current++;setRows([]);setSelected(null);setAudits([]);setReason("");setError("");setMessage("");setPermissions([]);setLeaving(false);pending.current=null})
  void load()
  return()=>{generation.current++;unregister()}
 // The page remounts when the authenticated boundary changes.
 },[])
 const save=async()=>{
  if(!selected || !reason.trim() || lock.current || mustReload)return
  lock.current=true;setBusy(true);setError("");setMessage("")
  const request=generation.current
  try {const result=await identityManagementApi.update(selected,reason);if(request!==generation.current)return;setRows(old=>old.map(row=>row.id===result.id?result:row));setSelected(result);setReason("");setMessage(t("دسترسی ذخیره و در تاریخچه ثبت شد.","Access saved and audited."));setAudits([]);if(result.id===access.access?.owner)void accountAccessStore.refresh()}
  catch(error){if(request!==generation.current)return;const code=error instanceof Error?error.message:"";if(["access_version_conflict","result_unknown"].includes(code))setMustReload(true);setError(code==="access_version_conflict"?t("دسترسی تغییر کرده است. اطلاعات را دوباره دریافت کنید.","Access changed. Reload before editing."):code==="last_access_manager"?t("آخرین مسئول مدیریت دسترسی قابل حذف یا محدود کردن نیست.","The last access manager cannot be removed or restricted."):code==="result_unknown"?t("نتیجه تأیید نشد. پیش از ارسال دوباره، اطلاعات را دریافت کنید.","Result unconfirmed. Reload before resubmitting."):t("تغییر ذخیره نشد. مجوز، نشست و اطلاعات را بررسی کنید.","Change was not saved. Check permission, session and input."))}
  finally{lock.current=false;setBusy(false)}
 }
 const select=async(row:ManagedAccount)=>{
  if(busy)return
  setSelected({...row,roles:[...row.roles],overrides:{...row.overrides}});setReason("");setError("");setMessage("");setAudits([])
  const request=++generation.current
  try{const result=await identityManagementApi.audits(row.id);if(request===generation.current)setAudits(result)}catch{if(request===generation.current)setError(t("دریافت تاریخچه ممکن نشد.","Unable to load history."))}
 }
 return <AdminDashboard live={{path,title:t("کاربران و دسترسی‌ها","Users & permissions"),navigate:route=>{requestNavigation(()=>navigate(route))},permissions:access.access?.permissions||[],children:<>
  <section className="ad-panel"><div className="ad-panel-head"><p>{t("نقش‌ها، مجوزهای مستقل و محدودیت حساب را با دلیل ثبت‌شده مدیریت کنید.","Manage roles, individual permissions and restrictions with a recorded reason.")}</p><button className="button secondary" disabled={busy || loading} onClick={()=>{requestNavigation(()=>void load())}}>{t("دریافت دوباره","Reload")}</button></div>
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
  {loading?<p role="status" aria-busy="true">{t("در حال دریافت کاربران…","Loading accounts…")}</p>:rows.length?<div className="ad-table-wrap identity-accounts"><table className="ad-table"><thead><tr><th>{t("تلفن","Phone")}</th><th>{t("نقش‌ها","Roles")}</th><th>{t("وضعیت","Status")}</th><th>{t("اقدام","Action")}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td dir="ltr">{row.phone}</td><td>{row.roles.join(" · ")}</td><td>{row.blocked?t("محدود","Restricted"):t("فعال","Active")}</td><td><button className="text-link" disabled={busy} onClick={()=>{requestNavigation(()=>void select(row))}}>{t("ویرایش دسترسی","Edit access")}</button></td></tr>)}</tbody></table></div>:<p>{t("کاربری ثبت نشده است.","No accounts found.")}</p>}
  {cursor&&<button className="button secondary" disabled={busy || loading} onClick={()=>{requestNavigation(()=>void load(cursor))}}>{t("صفحه بعد","Next page")}</button>}</section>
  {selected&&<section className="ad-panel"><div className="ad-panel-head"><h2 dir="ltr">{selected.phone}</h2></div><form className="identity-editor" onSubmit={event=>{event.preventDefault();void save()}}><fieldset disabled={busy}><legend>{t("نقش‌ها","Roles")}</legend>{roles.map(role=><label key={role}><input type="checkbox" checked={selected.roles.includes(role)} onChange={event=>setSelected({...selected,roles:event.target.checked?[...selected.roles,role]:selected.roles.filter(value=>value!==role)})}/>{role}</label>)}</fieldset><fieldset disabled={busy}><legend>{t("مجوزهای مستقل","Individual permissions")}</legend>{permissions.map(permission=><label key={permission}><span dir="ltr">{permission}</span><Dropdown label={permission} disabled={busy} options={[{value:"inherit",label:t("طبق نقش","From role")},{value:"allow",label:t("مجاز","Allow")},{value:"deny",label:t("غیرمجاز","Deny")}]} value={permission in selected.overrides?(selected.overrides[permission]?"allow":"deny"):"inherit"} onChange={value=>{const overrides={...selected.overrides};if(value==="inherit")delete overrides[permission];else overrides[permission]=value==="allow";setSelected({...selected,overrides})}}/></label>)}</fieldset><label className="identity-restriction"><input type="checkbox" disabled={busy} checked={selected.blocked} onChange={event=>setSelected({...selected,blocked:event.target.checked})}/>{t("محدود کردن حساب و پایان نشست‌ها","Restrict account and revoke sessions")}</label><label htmlFor="access-reason">{t("دلیل تغییر","Reason for change")}</label><textarea id="access-reason" value={reason} maxLength={1000} required disabled={busy} onChange={event=>setReason(event.target.value)}/><p>{t("با ذخیره، این نقش‌ها و مجوزها اعمال و تغییر در تاریخچه ثبت می‌شود. محدود کردن حساب تمام نشست‌های آن را پایان می‌دهد.","Saving applies these roles and permissions and records the change. Restricting an account ends all its sessions.")}</p><button className="button primary" disabled={busy || mustReload || !reason.trim()}>{busy?t("در حال ذخیره…","Saving…"):t("تأیید و ذخیره دسترسی","Confirm and save access")}</button></form><h3>{t("تاریخچه","History")}</h3>{audits.length?audits.map(audit=><article key={audit.id}><time>{new Date(audit.created_at).toLocaleString(en?"en-GB":"fa-IR",{timeZone:"Asia/Tehran"})}</time><p>{audit.action} · {audit.reason}</p></article>):<p>{t("تاریخچه‌ای برای نمایش نیست.","No history to display.")}</p>}</section>}
 <dialog className="modal" ref={leaveDialog} onCancel={()=>{setLeaving(false);pending.current=null}} aria-labelledby="access-leave-title"><h2 id="access-leave-title">{t("تغییرات ذخیره نشده","Unsaved changes")}</h2><p>{t("تغییرات ذخیره نشده کنار گذاشته شوند؟","Discard your unsaved changes?")}</p><button className="button secondary" onClick={()=>{setLeaving(false);pending.current=null}}>{t("ادامه ویرایش","Keep editing")}</button><button className="button primary" onClick={()=>{const action=pending.current;pending.current=null;dirty.current=false;setLeaving(false);action?.()}}>{t("کنار گذاشتن تغییرات","Discard changes")}</button></dialog>
 </>}}/>
}
