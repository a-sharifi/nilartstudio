"use client"
import {useEffect,useRef,useState} from "react"
import {readSupportFile,supportAttachmentsApi} from "./support-attachments-api"
import {sessionLifecycle} from "../identity/session-lifecycle"
type Selection={id:string;name:string;data:string;size:number;state:"selected"|"uploading"|"accepted"|"unknown"|"failed"}
export function useTicketAttachments(en:boolean){
 const t=(fa:string,english:string)=>en?english:fa
 const [items,setItems]=useState<Selection[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState("")
 const current=useRef(items),generation=useRef(0),lock=useRef(false)
 const replace=(files:Selection[])=>{current.current=files;setItems(files)}
 const update=(id:string,state:Selection["state"])=>replace(current.current.map(file=>file.id===id?{...file,state,...(state==="accepted"?{data:""}:{})}:file))
 const clear=()=>{generation.current++;replace([]);setError("");setBusy(false)}
 useEffect(()=>{const unregister=sessionLifecycle.registerPrivateCache(clear);return()=>{generation.current++;unregister()}},[])
 const choose=async(files:File[])=>{
  if(lock.current)return
  if(current.current.length+files.length>3){setError(t("حداکثر سه فایل انتخاب کنید.","Choose up to three files."));return}
  lock.current=true;setBusy(true);setError("");const stamp=generation.current
  try{
   const selected:Selection[]=[]
   for(const file of files){
    const name=file.name.trim()
    if(name.length>200||/[\/\\\p{C}]/u.test(name))throw new Error("invalid_file")
    selected.push({id:crypto.randomUUID(),name,data:await readSupportFile(file),size:file.size,state:"selected"})
   }
   if(stamp===generation.current)replace([...current.current,...selected])
  }catch{if(stamp===generation.current)setError(t("فقط فایل PNG، JPEG یا PDF معتبر تا ۵ مگابایت پذیرفته می‌شود.","Only valid PNG, JPEG or PDF files up to 5 MiB are accepted."))}
  finally{lock.current=false;if(stamp===generation.current)setBusy(false)}
 }
 const send=async(ticket:string,check=false)=>{
  if(lock.current)return
  lock.current=true;setBusy(true);setError("");const stamp=generation.current
  try{
   const saved=check?await supportAttachmentsApi.list(ticket):[]
   if(stamp!==generation.current)return
   for(const file of current.current.filter(file=>file.state!=="accepted")){
    if(check){
     const match=saved.find(item=>item.id===file.id)
     if(match){if(match.file_name!==file.name||match.size!==file.size)throw new Error("attachment_conflict");update(file.id,"accepted")}
     else update(file.id,"selected")
     continue
    }
    update(file.id,"uploading")
    try{await supportAttachmentsApi.upload(ticket,file.id,file.name,file.data,file.size)}
    catch(cause){if(stamp!==generation.current)return;const code=cause instanceof Error?cause.message:"";if(["invalid_attachment","attachment_limit","attachment_conflict","ticket_closed","permission_denied","ticket_not_found","validation_error"].includes(code)){update(file.id,"failed");setError(t("تیکت ثبت شده است؛ این فایل پذیرفته نشد. آن را حذف کنید یا در گفتگو فایل دیگری انتخاب کنید.","Your ticket is saved; this file was rejected. Remove it or choose another file in the conversation."));return}update(file.id,"unknown");setError(t("تیکت ثبت شده است؛ نتیجه پیوست تأیید نشد. پیوست‌ها را بررسی یا همان فایل‌ها را دوباره ارسال کنید.","Your ticket is saved; an attachment is unconfirmed. Check attachments or retry the same files."));return}
    if(stamp!==generation.current)return
    update(file.id,"accepted")
   }
  }catch{if(stamp===generation.current)setError(t("بررسی پیوست‌ها ممکن نشد؛ انتخاب‌ها حفظ شدند.","Unable to check attachments; your selections are retained."))}
  finally{lock.current=false;if(stamp===generation.current)setBusy(false)}
 }
 const pending=items.some(file=>file.state!=="accepted"),unknown=items.some(file=>file.state==="unknown")
 const view=(disabled:boolean,ticket?:string)=><section className="support-ticket-attachments" aria-label={t("پیوست‌های تیکت جدید","New ticket attachments")}>
  <label htmlFor="support-live-files">{t("فایل‌های مرتبط (اختیاری)","Supporting files (optional)")}</label>
  <p id="support-live-file-rules">{t("حداکثر ۳ فایل PNG، JPEG یا PDF، هر کدام تا ۵ مگابایت. فایل‌ها پس از ثبت موفق تیکت ارسال می‌شوند؛ انتخاب فایل به‌تنهایی چیزی ارسال نمی‌کند.","Up to 3 PNG, JPEG or PDF files, 5 MiB each. Files upload after the ticket is saved; selecting a file sends nothing.")}</p>
  {!ticket&&<input id="support-live-files" type="file" multiple accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf" aria-describedby="support-live-file-rules" disabled={disabled||busy||items.length>=3} onChange={event=>{void choose(Array.from(event.target.files||[]));event.target.value=""}}/>}
  {error&&<p role="alert">{error}</p>}
  {busy&&<p role="status">{t("در حال بررسی یا ارسال فایل‌ها…","Checking or uploading files…")}</p>}
  <ul>{items.map(file=><li key={file.id}><bdi>{file.name}</bdi><span>{({selected:t("انتخاب‌شده؛ هنوز ارسال نشده","Selected; not sent"),uploading:t("در حال ارسال","Uploading"),accepted:t("پیوست ثبت شد","Attachment saved"),unknown:t("نتیجه تأیید نشده","Unconfirmed"),failed:t("ارسال نشد","Not sent")})[file.state]}</span>{file.state!=="accepted"&&!file.name.toLowerCase().endsWith(".pdf")&&<img src={`data:${file.name.toLowerCase().endsWith(".png")?"image/png":"image/jpeg"};base64,${file.data}`} alt={t("پیش‌نمایش تصویر انتخاب‌شده","Selected screenshot preview")}/>}<button type="button" className="text-link" disabled={disabled||busy||file.state==="unknown"||file.state==="accepted"} onClick={()=>replace(current.current.filter(item=>item.id!==file.id))}>{t("حذف","Remove")} {file.name}</button></li>)}</ul>
  {ticket&&pending&&<div className="support-form-actions"><button type="button" className="button primary" disabled={disabled||busy} onClick={()=>void send(ticket)}>{t("ارسال فایل‌های باقی‌مانده","Send remaining files")}</button>{unknown&&<button type="button" className="button secondary" disabled={busy} onClick={()=>void send(ticket,true)}>{t("بررسی فایل‌های ثبت‌شده","Check saved files")}</button>}</div>}
 </section>
 return {items,busy,pending,unknown,clear,send,view}
}
