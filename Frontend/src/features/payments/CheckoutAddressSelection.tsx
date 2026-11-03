"use client"
import {useEffect,useRef,useState} from 'react'
import {AddressDetails,AddressForm} from '../../design/AddressFields'
import {emptyAddress,type Address} from '../../design/address'
import {addressApi} from '../customer/api'
import '../../design/address.css'

export default function CheckoutAddressSelection({addresses,selectedId,onSelect,onSaved,language,blocked=false}:{addresses:Address[];selectedId:string;onSelect:(id:string)=>void;onSaved:(addresses:Address[],selectedId:string)=>void;language:0|1;blocked?:boolean}){
 const t=(fa:string,en:string)=>language===0?fa:en
 const [draft,setDraft]=useState<Address|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLElement|null>(null),alive=useRef(true)
 const pendingId=useRef(crypto.randomUUID())
 const selected=addresses.find(address=>address.id===selectedId)
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
 useEffect(()=>{if(draft&&!dialog.current?.open){dialog.current?.showModal();dialog.current?.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});if(dialog.current)dialog.current.scrollTop=0}else if(!draft&&dialog.current?.open){dialog.current.close();trigger.current?.focus()}},[draft])
 const edit=(address:Address)=>{trigger.current=document.activeElement as HTMLElement;pendingId.current=address.id||crypto.randomUUID();onSelect(selectedId);setError('');setDraft(address)}
 const save=async(address:Address)=>{
  if(busy||blocked)return
  setBusy(true);setError('')
  const id=address.id||pendingId.current
  try{const saved=await addressApi.save({...address,id});if(alive.current){onSaved(saved,id);setDraft(null)}}catch{if(alive.current)setError(t('ذخیره آدرس تأیید نشد. اطلاعات فرم حفظ شده‌اند؛ آدرس‌ها را بررسی و دوباره تلاش کنید.','Address save was not confirmed. Your input is retained; review your addresses and try again.'))}finally{if(alive.current)setBusy(false)}
 }
 const form=(initial:Address)=><AddressForm key={initial.id||'create'} initial={initial} language={language} busy={busy} blocked={blocked} live cityFailure={false} onRetry={()=>{}} onSave={address=>void save(address)} onCancel={()=>setDraft(null)} saveError={error} offline={false}/>
 return <>
  <section className="address-section" aria-labelledby="address-list-title">
   <div className="address-section-heading"><div><span className="eyebrow">02 / {t('مقصد سفارش','YOUR DESTINATION')}</span><h2 id="address-list-title">{addresses.length?t('آدرس‌های شما','Your saved addresses'):t('افزودن آدرس تحویل','Add a delivery address')}</h2></div>{addresses.length>0&&<span className="address-count">{addresses.length.toLocaleString(language===0?'fa-IR':'en-US')} {t('آدرس','addresses')}</span>}</div>
   {addresses.length?<><div className="address-cards" role="radiogroup" aria-label={t('آدرس تحویل','Delivery address')}>{addresses.map(address=><article className={`address-card ${address.id===selectedId?'selected':''}`} key={address.id}><label className="address-card-choice"><input type="radio" name="destination" checked={address.id===selectedId} disabled={busy||blocked} onChange={()=>onSelect(address.id)}/><span className="address-card-title"><span dir="auto">{address.label==='خانه'?t('خانه','Home'):address.label==='محل کار'?t('محل کار','Work'):address.label||t('آدرس تحویل','Delivery address')}</span>{address.default&&<small className="address-default">{t('آدرس پیش‌فرض','Default address')}</small>}{address.id===selectedId&&<small className="address-selected-label">{t('انتخاب این خرید','Selected for this order')}</small>}</span><AddressDetails address={address} language={language} demo={false}/></label><button type="button" className="text-link address-edit" disabled={busy||blocked} onClick={()=>edit(address)}>{t('ویرایش','Edit')}</button></article>)}</div><button type="button" className="button secondary address-add" disabled={busy||blocked} onClick={()=>edit(emptyAddress())}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>{t('افزودن آدرس جدید','Add new address')}</button></>:form(emptyAddress())}
   <p className="address-footnote">{t('انتخاب آدرس برای این خرید، آدرس پیش‌فرض حساب را تغییر نمی‌دهد.','Selecting an address for this checkout does not change your account default.')}</p>
  </section>
  <section className="address-destination"><div className="address-section-heading"><h2>{t('تحویل به','Deliver to')}</h2>{selected&&<button className="text-link" disabled={busy||blocked} onClick={()=>edit(selected)}>{t('ویرایش','Edit')}</button>}</div>{selected?<AddressDetails address={selected} language={language} demo={false}/>:<p>{t('یک آدرس تحویل معتبر انتخاب کنید.','Choose a valid delivery address.')}</p>}</section>
  <dialog ref={dialog} className="address-dialog account-address-dialog" aria-labelledby="checkout-address-dialog-title" onCancel={event=>{event.preventDefault();dialog.current?.querySelector<HTMLFormElement>('form')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))}}><div className="address-dialog-heading"><span className="eyebrow">NILART / ADDRESS BOOK</span><h2 id="checkout-address-dialog-title" tabIndex={-1}>{draft?.id?t('ویرایش آدرس','Edit address'):t('افزودن آدرس جدید','Add new address')}</h2></div>{draft&&form(draft)}</dialog>
 </>
}
