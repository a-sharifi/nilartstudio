import {z} from 'zod'
import {privateRequest} from './identity-api'
const uuid=z.string().uuid(),amount=z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/),fingerprint=z.string().regex(/^[0-9a-f]{64}$/)
const entry=z.object({id:uuid,source:z.enum(['purchase','finance','opening']),kind:z.string(),document_id:uuid,purchase_id:uuid.nullable(),document_number:z.string(),document_date:z.iso.date(),recorded_at:z.iso.datetime({offset:true}),source_version:z.number().int().nonnegative(),delta:amount,corrects_id:uuid.nullable(),balance:amount})
const statement=z.object({supplier_id:uuid,supplier_code:z.string(),title_fa:z.string(),title_en:z.string(),currency:z.literal('IRT'),from_date:z.iso.date(),to_date:z.iso.date(),opening_balance_configured:z.boolean(),opening_change:amount.default('0'),opening_recorded_balance:amount,liability_change:amount,paid_net:amount,closing_recorded_balance:amount,fingerprint,items:z.array(entry),next_offset:z.number().int().positive().nullable(),total_entries:z.number().int().nonnegative()})
export type SupplierFinancialStatement=z.infer<typeof statement>
export type SupplierFinancialEntry=z.infer<typeof entry>
const base='/api/v1/admin/finance/suppliers'
export const supplierStatementsApi={
 async load(id:string,from:string,to:string,offset=0,revision?:string){const p=new URLSearchParams({from_date:from,to_date:to});if(offset)p.set('offset',String(offset));if(revision)p.set('fingerprint',revision);const r=statement.parse(await privateRequest(`${base}/${id}/statement?${p}`));if(r.supplier_id!==id||r.from_date!==from||r.to_date!==to||(revision&&revision!==r.fingerprint)||r.items.length>25||(r.next_offset!==null&&r.next_offset!==offset+25))throw new Error('supplier_statement_changed');return r},
 exportUrl(id:string,from:string,to:string,revision:string,format:'csv'|'xlsx'){return `${base}/${id}/statement/export?${new URLSearchParams({from_date:from,to_date:to,fingerprint:revision,format})}`}
}
