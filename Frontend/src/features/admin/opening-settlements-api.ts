import {z} from 'zod'
import {privateRequest} from './identity-api'
import {financeDocumentSchema} from './finance-api'
const uuid=z.string().uuid(),signed=z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/)
const plan=z.object({supplier_id:uuid,supplier_code:z.string(),title_fa:z.string(),title_en:z.string(),currency:z.literal('IRT'),configured:z.boolean(),opening_event_id:uuid.nullable(),opening_version:z.number().int().positive().nullable(),opening_amount:signed.nullable(),paid_net:signed,outstanding:signed.nullable(),settlement_version:z.number().int().nonnegative()})
export type OpeningSettlementPlan=z.infer<typeof plan>
const base='/api/v1/admin/finance/suppliers'
export const openingSettlementsApi={
 async plan(id:string){const p=plan.parse(await privateRequest(`${base}/${id}/opening/settlement`));if(p.supplier_id!==id||p.configured!==!!p.opening_event_id||p.configured!==(p.outstanding!==null))throw new Error('result_unknown');return p},
 async history(id:string,cursor?:string){const p=z.object({items:z.array(financeDocumentSchema),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/${id}/opening/settlements${cursor?'?cursor='+cursor:''}`));if(p.items.some(d=>d.opening_supplier_id!==id))throw new Error('result_unknown');return p}
}
