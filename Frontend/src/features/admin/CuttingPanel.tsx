'use client'
import {useState} from 'react'
import AdminDashboard from '../../design/AdminDashboard'
import {AdminButton} from '../../components/admin/AdminUI'
import {useAccountAccess} from '../identity/use-account-access'
import CuttingLayout from './CuttingLayout'
import {costDecimalInput} from './costing-input'
import './account-management.css'
export default function CuttingPanel({path,navigate}:{path:string;navigate:(path:string)=>void}){
 const en=path.startsWith('/en/'),t=(fa:string,english:string)=>en?english:fa,[width,setWidth]=useState(''),[height,setHeight]=useState(''),[approved,setApproved]=useState<{count:number;reason:string}|null>(null),permissions=useAccountAccess().access?.permissions??[]
 return <AdminDashboard live={{path,navigate,permissions,title:t('بازده برش','Cutting yield'),children:<section className="ad-panel"><h2>{t('بازده برش','Cutting yield')}</h2><p>{t('ابعاد ورق را وارد کنید. این محاسبه موجودی، فرمول یا قیمت را تغییر نمی‌دهد؛ تأیید نهایی باید در نسخه فرمول ساخت ذخیره شود.','Enter sheet dimensions. This calculation changes no stock, recipe or price; the final workshop confirmation must be saved in a recipe revision.')}</p><div className="identity-editor"><label>{t('عرض ورق (میلی‌متر)','Sheet width (mm)')}<input inputMode="decimal" value={width} onChange={e=>{setWidth(costDecimalInput(e.target.value));setApproved(null)}}/></label><label>{t('ارتفاع ورق (میلی‌متر)','Sheet height (mm)')}<input inputMode="decimal" value={height} onChange={e=>{setHeight(costDecimalInput(e.target.value));setApproved(null)}}/></label></div><CuttingLayout key={`${width}:${height}`} width={width||null} height={height||null} en={en} apply={(count,reason)=>setApproved({count,reason})}/>{approved&&<p role="status">{t('بازده بررسی‌شده','Reviewed yield')}: {approved.count} · {approved.reason}</p>}<AdminButton onClick={()=>navigate(`/${en?'en':'fa'}/admin/recipes`)}>{t('ذخیره تأیید در فرمول ساخت','Save confirmation in a recipe')}</AdminButton></section>}}/>
}
