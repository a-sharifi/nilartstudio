"use client"
import {useEffect,useRef,useState} from 'react'
import {useNavigationGuard} from '../navigation/NavigationGuardProvider'
import {supplierBalanceFilters} from './supplier-balances-api'
import SupplierOpeningBalance from './SupplierOpeningBalance'
import AdminDashboard from '../../design/AdminDashboard'
import {useAccountAccess} from '../identity/use-account-access'
import SupplierFinancialStatement from './SupplierFinancialStatement'
export default function SupplierFinancialPanel({path,navigate,search=""}:{path:string;search?:string;navigate:(path:string)=>void}){
 const en=path.startsWith('/en/'),permissions=useAccountAccess().access?.permissions??[],id=path.split('/').at(-1)!
 const guardRef=useRef<((go:()=>void)=>void)|null>(null),[revision,setRevision]=useState(0),registerGuard=useNavigationGuard()
 const go=(route:string)=>{if(guardRef.current)guardRef.current(()=>navigate(route));else navigate(route)}
 useEffect(()=>{registerGuard(fn=>{if(guardRef.current)guardRef.current(fn);else fn();return false});return()=>registerGuard(null)},[registerGuard])
 return <AdminDashboard live={{path,navigate:go,permissions,title:en?'Supplier financial statement':'گردش مالی تأمین‌کننده',children:<section className="ad-panel"><SupplierOpeningBalance id={id} en={en} canWrite={permissions.includes('finance.write')} guardRef={guardRef} onSaved={()=>setRevision(v=>v+1)}/><SupplierFinancialStatement initialTo={supplierBalanceFilters("as_of_date="+(new URLSearchParams(search).get("recorded_to")??"")).asOf||undefined} key={revision} id={id} en={en} canExport={permissions.includes('finance.export')} canPurchases={permissions.includes('inventory.manage')} navigate={go}/></section>}}/>
}
