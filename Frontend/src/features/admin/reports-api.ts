import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),decimal=z.string().regex(/^-?\d+(?:\.\d+)?$/),time=z.iso.datetime({offset:true})
export const reportKind=z.enum(["inventory","movements","production","waste"])
export type ReportKind=z.infer<typeof reportKind>
export const reportFilters=z.object({as_of:time,from_time:time.nullable(),q:z.string(),kind:z.enum(["material","sku","artwork"]).nullable(),low:z.boolean()})
export type ReportFilters=z.infer<typeof reportFilters>
const stock=z.object({id:uuid,kind:z.string(),reference_id:uuid,code:z.string(),title_fa:z.string(),title_en:z.string(),unit:z.string(),quantity:decimal,value:decimal,average_cost:decimal.nullable(),threshold:decimal.nullable(),low:z.boolean(),movement_id:uuid,recorded_at:time})
const movement=z.object({id:uuid,position_id:uuid,code:z.string(),title_fa:z.string(),title_en:z.string(),kind:z.string(),unit:z.string(),action:z.string(),quantity_delta:decimal,value_delta:decimal,quantity_after:decimal,value_after:decimal,reverses_id:uuid.nullable(),reversed_by:uuid.nullable(),source_document_kind:z.string().nullable(),source_document_id:uuid.nullable(),source_event_id:uuid.nullable(),reason:z.string(),recorded_at:time})
const production=z.object({id:uuid,event_id:uuid,batch_number:z.string(),sku_code:z.string(),title_fa:z.string(),title_en:z.string(),status:z.string(),recipe_version:z.number().int(),target_output:z.number().int(),cost_complete:z.boolean(),wip:decimal,transferred_value:decimal,abnormal_loss:decimal,actual_recorded_total:decimal,estimated_total:decimal.nullable(),variance:decimal.nullable(),unit_cost:decimal.nullable(),healthy_output:z.number().int().nullable(),normal_waste:z.number().int().nullable(),abnormal_damage:z.number().int().nullable(),recorded_at:time})
export type ReportStock=z.infer<typeof stock>
export type ReportMovement=z.infer<typeof movement>
export type ReportProduction=z.infer<typeof production>
const page=z.object({report:reportKind,filters:reportFilters,currency:z.literal("IRT"),totals:z.object({count:z.number().int(),value:decimal,groups:z.array(z.object({kind:z.string(),unit:z.string(),count:z.number().int(),quantity:decimal,value:decimal})),wip:decimal.nullable(),abnormal_loss:decimal.nullable(),incomplete_batches:z.number().int().nullable()}),next_cursor:uuid.nullable(),reservation_history_available:z.literal(false)})
export type ReportPage=z.infer<typeof page>&{items:ReportStock[]|ReportMovement[]|ReportProduction[]}
export function reportParams(filters:ReportFilters,cursor?:string){const p=new URLSearchParams({as_of:filters.as_of,q:filters.q,low:String(filters.low)});if(filters.from_time)p.set("from_time",filters.from_time);if(filters.kind)p.set("kind",filters.kind);if(cursor)p.set("cursor",cursor);return p}
export const reportsApi={
 async read(kind:ReportKind,filters:ReportFilters,cursor?:string):Promise<ReportPage>{const raw=await privateRequest(`/api/v1/admin/reports/${kind}?${reportParams(filters,cursor)}`);const result=page.parse(raw);const f=result.filters;if(result.report!==kind||Date.parse(f.as_of)!==Date.parse(filters.as_of)||(f.from_time?Date.parse(f.from_time):null)!==(filters.from_time?Date.parse(filters.from_time):null)||f.q!==filters.q||f.kind!==filters.kind||f.low!==filters.low)throw new Error("report_response_mismatch");const items=z.object({items:z.array(z.unknown())}).parse(raw).items;const rows=kind==="inventory"?z.array(stock).parse(items):kind==="production"?z.array(production).parse(items):z.array(movement).parse(items);return {...result,items:rows}},
 exportUrl(kind:ReportKind,filters:ReportFilters,format:"csv"|"xlsx"){const p=reportParams(filters);p.set("format",format);return `/api/v1/admin/reports/${kind}/export?${p}`}
}
