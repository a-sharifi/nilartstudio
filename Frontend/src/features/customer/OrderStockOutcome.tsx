"use client"
import {useEffect,useState} from 'react'
import {z} from 'zod'
import {privateRequest} from '../admin/identity-api'
import {sessionLifecycle} from '../identity/session-lifecycle'
const schema=z.object({order_id:z.string().uuid(),state:z.enum(['reserved','committed','released','shortage']).nullable(),expires_at:z.iso.datetime({offset:true}).nullable(),issue:z.string().nullable(),fulfillment:z.string().optional()})
export default function OrderStockOutcome({id,en,refresh}:{id:string;en:boolean;refresh?:string}){
 const [value,setValue]=useState<z.infer<typeof schema>|null>(null),[failed,setFailed]=useState(false)
 useEffect(()=>{let active=true;setValue(null);setFailed(false);const clear=sessionLifecycle.registerPrivateCache(()=>{active=false;setValue(null);setFailed(false)});void privateRequest(`/api/v1/account/orders/${id}/stock`).then(raw=>{const r=schema.parse(raw);if(r.order_id!==id)throw new Error('result_unknown');if(active)setValue(r)}).catch(()=>{if(active)setFailed(true)});return()=>{active=false;clear()}},[id,refresh])
 const t=(fa:string,english:string)=>en?english:fa
 if(failed)return <p>{t('دریافت تأیید موجودی ممکن نشد؛ وضعیت سفارش را دوباره بررسی کنید.','Stock confirmation could not be loaded. Check the order status again.')}</p>
 if(!value?.state)return null
 const names={reserved:t('موجودی موقتاً برای پرداخت شما رزرو شده است.','Stock is temporarily reserved for your payment.'),committed:t('موجودی برای سفارش پرداخت‌شده شما تخصیص یافته است؛ ارسال هنوز تأیید نشده است.','Stock is committed to your paid order; shipment has not yet been confirmed.'),released:t('رزرو موقت پایان یافته یا آزاد شده است. پرداخت با نتیجه نامشخص را تکرار نکنید.','The temporary reservation ended or was released. Do not repeat a payment with an uncertain result.'),shortage:t('پرداخت تأیید شده است اما موجودی کافی برای آماده‌سازی وجود ندارد. سفارش برای رسیدگی پشتیبانی متوقف است و ارسال تأیید نشده است.','Payment was confirmed, but stock is insufficient for preparation. Your order is held for support resolution; shipment is not confirmed.')}
 return <section aria-label={t('تأیید موجودی سفارش','Order stock confirmation')}><p role={value.state==='shortage'?'alert':undefined}>{value.fulfillment==='cancelled'?t('سفارش لغو و موجودی آزاد شده است. وضعیت بازپرداخت را در بخش پرداخت و رسیدها ببینید.','The order was cancelled and stock released. Check payment status and refund receipts for financial resolution.'):value.state==='committed'&&['partial','shipped','delivered'].includes(value.fulfillment||'')?t('موجودی سفارش تخصیص یافته است. جزئیات بسته‌های ثبت‌شده را در پیگیری ارسال ببینید.','Order stock is committed. See recorded parcels in shipment tracking.'):names[value.state]}</p>{value.state==='reserved'&&value.expires_at&&<p>{t('پایان رزرو','Reservation ends')}: <time dateTime={value.expires_at}>{new Intl.DateTimeFormat(en?'en':'fa',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Tehran'}).format(new Date(value.expires_at))}</time></p>}</section>
}
