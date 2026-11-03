import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),amount=z.string().regex(/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/),signed=z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/),version=z.number().int().nonnegative()
export const accountContent=z.object({code:z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{0,79}$/),title_fa:z.string().trim().min(1).max(200),title_en:z.string().trim().min(1).max(200),kind:z.enum(["cash","bank"]),active:z.boolean()})
export const accountCommand=z.object({expected_version:version,content:accountContent,opening_amount:amount.nullable(),opening_date:z.iso.date().nullable(),reason:z.string().trim().min(1).max(1000)})
const kind=z.enum(["opening","receipt","payment","expense","transfer","supplier_payment","supplier_refund","supplier_opening_payment","supplier_opening_refund","reversal"])
export const documentCommand=z.object({kind:kind.exclude(["opening"]),document_number:z.string().trim().min(1).max(100),document_date:z.iso.date(),amount:amount.nullable(),source_account_id:uuid.nullable(),target_account_id:uuid.nullable(),expected_versions:z.record(uuid,version),purchase_id:uuid.nullable(),expected_purchase_version:version.nullable(),opening_event_id:uuid.nullable().optional(),expected_opening_settlement_version:version.nullable().optional(),reverses_id:uuid.nullable(),description:z.string().trim().min(1).max(2000),supporting_reference:z.string().trim().min(1).max(500),category:z.string().trim().max(100),reason:z.string().trim().min(1).max(1000)})
const account=accountContent.extend({id:uuid,currency:z.literal("IRT"),balance:amount,version:version.min(1)})
const document=z.object({id:uuid,kind,effect_kind:kind,document_number:z.string(),document_date:z.iso.date(),amount,currency:z.literal("IRT"),description:z.string(),supporting_reference:z.string(),category:z.string(),reverses_id:uuid.nullable(),reversed_by:uuid.nullable(),purchase_id:uuid.nullable(),allocation_amount:signed.nullable(),opening_supplier_id:uuid.nullable().optional(),opening_event_id:uuid.nullable().optional(),opening_allocation_amount:signed.nullable().optional(),opening_settlement_version:version.nullable().optional(),actor_id:uuid,created_at:z.iso.datetime({offset:true}),lines:z.array(z.object({account_id:uuid,code:z.string(),delta:signed,balance_after:amount,account_version:version.min(1)}))})
const receipt=z.object({id:uuid,actor_id:uuid,area:z.enum(["account","document"]),target_id:uuid,intent:z.unknown(),result:z.object({accounts:z.array(account),document:document.nullable()}),created_at:z.iso.datetime({offset:true})})
const balance=z.object({purchase_id:uuid,supplier_id:uuid,supplier_name_fa:z.string(),supplier_name_en:z.string(),document_number:z.string(),purchase_status:z.string(),purchase_version:version.min(1),liability:amount,paid_net:signed,outstanding:signed,currency:z.literal("IRT")})
const cashflow=z.object({from_date:z.iso.date(),to_date:z.iso.date(),currency:z.literal("IRT"),inflow:amount,outflow:amount,net:signed,operating_expenses:signed})
export const financeDocumentSchema=document
export type FinanceAccount=z.infer<typeof account>
export type FinanceDocument=z.infer<typeof document>
export type FinanceBalance=z.infer<typeof balance>
export type FinanceReceipt=z.infer<typeof receipt>
export type AccountCommand=z.infer<typeof accountCommand>
export type DocumentCommand=z.infer<typeof documentCommand>
export type FinanceIntent={area:"account";target:string;body:AccountCommand}|{area:"document";target:string;body:DocumentCommand}
export function canonical(value:unknown):string{if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;if(value&&typeof value==="object")return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;return JSON.stringify(value)}
function normalizedDocument(value:unknown){const r=documentCommand.parse(value);if(r.opening_event_id==null)delete r.opening_event_id;if(r.expected_opening_settlement_version==null)delete r.expected_opening_settlement_version;return r}
function scoped(raw:unknown,key:string,intent:FinanceIntent){const r=receipt.parse(raw);const body=intent.area==="account"?accountCommand.parse(r.intent):normalizedDocument(r.intent);const expected=intent.area==="account"?accountCommand.parse(intent.body):normalizedDocument(intent.body);if(r.id!==key||r.area!==intent.area||r.target_id!==intent.target||canonical(body)!==canonical(expected)||(intent.area==="document"&&r.result.document?.id!==intent.target)||(intent.area==="account"&&!r.result.accounts.some(a=>a.id===intent.target&&a.version===intent.body.expected_version+1)))throw new Error("result_unknown");return r}
const base="/api/v1/admin/finance"
export const financeApi={
 async account(id:string){const a=account.parse(await privateRequest(`${base}/accounts/${id}`));if(a.id!==id)throw new Error("result_unknown");return a},
 async accounts(q="",cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set("cursor",cursor);return z.object({items:z.array(account),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/accounts?${p}`))},
 async documents(q="",kind="",cursor?:string){const p=new URLSearchParams({q});if(kind)p.set("kind",kind);if(cursor)p.set("cursor",cursor);return z.object({items:z.array(document),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/documents?${p}`))},
 async detail(id:string){const r=document.parse(await privateRequest(`${base}/documents/${id}`));if(r.id!==id)throw new Error("result_unknown");return r},
 async balances(q="",cursor?:string){const p=new URLSearchParams({q});if(cursor)p.set("cursor",cursor);return z.object({items:z.array(balance),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/balances?${p}`))},
 async cashflow(from:string,to:string){const r=cashflow.parse(await privateRequest(`${base}/cashflow?${new URLSearchParams({from_date:from,to_date:to})}`));if(r.from_date!==from||r.to_date!==to)throw new Error("result_unknown");return r},
 async saved(key:string,intent:FinanceIntent){return scoped(await privateRequest(`${base}/commands/${key}`),key,intent)},
 async save(key:string,intent:FinanceIntent){let raw:unknown;try{raw=await privateRequest(intent.area==="account"?`${base}/accounts/${intent.target}/commands/${key}`:`${base}/documents/${key}`,"PUT",intent.body)}catch(error){const code=error instanceof Error?error.message:"";if(code.startsWith("finance_")||["validation_error","permission_denied","csrf_invalid","origin_invalid","unauthenticated"].includes(code))throw error;throw new Error("result_unknown")}try{return scoped(raw,key,intent)}catch{throw new Error("result_unknown")}},
 exportUrl(from:string,to:string,format:"csv"|"xlsx"="csv"){return `${base}/export?${new URLSearchParams({from_date:from,to_date:to,...(format==="xlsx"?{format}:{})})}`}
}
