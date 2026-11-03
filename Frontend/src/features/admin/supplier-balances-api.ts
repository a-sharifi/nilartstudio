import {z} from 'zod'
import {privateRequest} from './identity-api'
const signed=z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/)
const status=z.enum(['all','debt','credit','settled','unconfigured'])
export type SupplierBalanceStatus=z.infer<typeof status>
const row=z.object({supplier_id:z.string().uuid(),supplier_code:z.string(),title_fa:z.string(),title_en:z.string(),active:z.boolean(),currency:z.literal('IRT'),opening_configured:z.boolean(),opening_event_id:z.string().uuid().nullable(),opening_version:z.number().int().positive().nullable(),opening_amount:signed.nullable(),purchase_liability:signed,purchase_paid:signed,opening_paid:signed,recorded_balance:signed,balance:signed.nullable(),status:status.exclude(['all'])})
const report=z.object({q:z.string(),as_of_date:z.iso.date().nullable().default(null),status,currency:z.literal('IRT'),fingerprint:z.string().regex(/^[0-9a-f]{64}$/),total_suppliers:z.number().int().nonnegative(),unconfigured_suppliers:z.number().int().nonnegative(),payable:signed,receivable:signed,recorded_net:signed,items:z.array(row),next_offset:z.number().int().positive().nullable()})
export type SupplierBalance=z.infer<typeof row>
export type SupplierBalanceReport=z.infer<typeof report>
const base='/api/v1/admin/finance/supplier-balances'
export const supplierBalancesApi={
 async load(q:string,status:SupplierBalanceStatus,offset=0,fingerprint?:string,asOf=""){const p=new URLSearchParams({q:q.trim(),status,offset:String(offset)});if(fingerprint)p.set('fingerprint',fingerprint);if(asOf)p.set('as_of_date',asOf);const r=report.parse(await privateRequest(`${base}?${p}`));if(r.q!==q.trim()||r.status!==status||(r.as_of_date??'')!==asOf||(fingerprint&&r.fingerprint!==fingerprint)||r.items.some(i=>i.opening_configured!==(i.balance!==null)||i.opening_configured!==(i.opening_event_id!==null)||(!i.opening_configured&&i.status!=='unconfigured')))throw new Error('supplier_balances_changed');return r},
 exportUrl(r:SupplierBalanceReport,format:'csv'|'xlsx'){return `${base}/export?${new URLSearchParams({q:r.q,status:r.status,fingerprint:r.fingerprint,format,...(r.as_of_date?{as_of_date:r.as_of_date}:{})})}`}
}

export function supplierBalanceFilters(search:string){const p=new URLSearchParams(search);const parsed=status.safeParse(p.get('status'));const day=z.iso.date().safeParse(p.get('as_of_date'));return {q:(p.get('q')??'').slice(0,150),status:parsed.success?parsed.data:'all' as SupplierBalanceStatus,asOf:day.success?day.data:''}}
export function supplierBalanceQuery(q:string,status:SupplierBalanceStatus,asOf:string){const p=new URLSearchParams();if(q.trim())p.set('q',q.trim());if(status!=='all')p.set('status',status);if(asOf)p.set('as_of_date',asOf);return p.toString()}
