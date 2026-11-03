import {z} from "zod"
import {privateRequest} from "./identity-api"
const uuid=z.string().uuid(),amount=z.string().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,2})?$/)
export const shippingMethod=z.object({carrier:z.enum(["manual","tapin"]).default("manual"),packaging_weight_grams:z.number().int().positive().max(100000).nullable().default(null),padding_cm:z.number().min(0).max(20).nullable().default(null),id:uuid,title_fa:z.string().trim().min(1).max(120),title_en:z.string().trim().min(1).max(120),provinces:z.array(z.string().trim().min(1).max(120)).max(100),free_above_amount:amount.nullable().default(null),base_amount:amount,per_kg_amount:amount,maximum_weight_grams:z.number().int().positive().max(1000000).nullable(),active:z.boolean()})
export const settingsContent=z.object({title_fa:z.string().max(200),title_en:z.string().max(200),contact_phone:z.string().max(40),contact_email:z.string().max(254),contact_address:z.string().max(2000),currency:z.literal("IRT"),tax_included:z.boolean().default(false),tax_percent:z.string().regex(/^(?:0|[1-9][0-9]?|100)(?:\.[0-9]{1,4})?$/).nullable(),tax_basis:z.enum(["items","items_and_shipping"]).nullable().default(null),shipping_calculation:z.enum(["actual_weight","started_kg"]).nullable().default(null),shipping_rounding:z.enum(["half_up_cent","ceil_toman"]).nullable().default(null),tax_rounding:z.enum(["half_up_cent","ceil_toman"]).nullable().default(null),refund_policy:z.literal("items_and_proportional_tax_shipping_if_unshipped").nullable().default(null),reservation_minutes:z.number().int().min(1).max(1440).nullable(),return_days:z.number().int().min(0).max(365).nullable(),return_policy_fa:z.string().max(10000),return_policy_en:z.string().max(10000),shipping_methods:z.array(shippingMethod).max(50),commission_complexity_amount:amount.nullable(),commission_base_amount:amount.nullable(),commission_digital_amount:amount.nullable(),commission_physical_amount:amount.nullable(),commission_revision_limit:z.number().int().min(0).max(100).nullable(),commission_terms_fa:z.string().max(10000),commission_terms_en:z.string().max(10000)})
const revision=z.object({revision_id:uuid,actor_id:uuid,expected_version:z.number().int().nonnegative(),version:z.number().int().positive(),content:settingsContent,reason:z.string(),created_at:z.iso.datetime({offset:true})})
const record=z.object({version:z.number().int().nonnegative(),content:settingsContent,updated_at:z.iso.datetime({offset:true}).nullable(),missing:z.array(z.string())})
export type BusinessSettings=z.infer<typeof settingsContent>
export type SettingsRevision=z.infer<typeof revision>
export type SettingsRecord=z.infer<typeof record>
export type SettingsIntent={expected_version:number;content:BusinessSettings;reason:string}
const base="/api/v1/admin/settings"
function scoped(raw:unknown,key?:string){const r=revision.parse(raw);if((key&&r.revision_id!==key)||r.version!==r.expected_version+1)throw new Error("result_unknown");return r}
export const settingsApi={
 async read(){return record.parse(await privateRequest(base))},
 async history(before?:number){const r=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/versions${before?`?before=${before}`:""}`));r.items.forEach(x=>scoped(x));return r},
 async receipt(key:string){return scoped(await privateRequest(`${base}/versions/${key}`),key)},
 async save(key:string,intent:SettingsIntent){const raw=await privateRequest(`${base}/versions/${key}`,"PUT",intent);try{const r=scoped(raw,key);if(r.expected_version!==intent.expected_version||r.reason!==intent.reason||JSON.stringify(r.content)!==JSON.stringify(settingsContent.parse(intent.content)))throw new Error();return r}catch{throw new Error("result_unknown")}},
}
