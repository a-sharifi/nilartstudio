import {z} from "zod"
import {privateRequest} from "./identity-api"
export const units=["piece","sheet","meter","gram","kilogram","pack","printed_side","notebook","batch","order"] as const
const decimal=z.string().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/)
export const costContent=z.object({kind:z.enum(["material","service"]),code:z.string(),title_fa:z.string(),title_en:z.string(),base_unit:z.enum(units),purchase_unit:z.enum(units).nullable(),purchase_to_base:decimal.nullable(),supplier:z.string(),width_mm:decimal.nullable(),height_mm:decimal.nullable(),grammage:decimal.nullable(),rate:z.object({amount:decimal,currency:z.enum(["IRT","IRR"])}).nullable(),valid_from:z.iso.date().nullable(),valid_to:z.iso.date().nullable(),active:z.boolean(),zero_rate_acknowledged:z.boolean()})
const resource=z.object({id:z.string().uuid(),version:z.number().int().positive(),content:costContent,updated_at:z.iso.datetime({offset:true})})
const revision=z.object({revision_id:z.string().uuid(),resource_id:z.string().uuid(),actor_id:z.string().uuid(),expected_version:z.number().int().nonnegative(),version:z.number().int().positive(),content:costContent,reason:z.string(),created_at:z.iso.datetime({offset:true})})
export type CostContent=z.infer<typeof costContent>
export type CostResource=z.infer<typeof resource>
export type CostRevision=z.infer<typeof revision>
export type CostIntent={expected_version:number;content:CostContent;reason:string}
const base="/api/v1/admin/costing/resources"
const estimateResult=z.object({resource_id:z.string().uuid(),version:z.number().int().positive(),quantity:decimal,unit:z.enum(["base","purchase"]),estimate_date:z.iso.date(),base_quantity:z.string().regex(/^[0-9]+(?:\.[0-9]+)?$/).nullable(),amount:z.string().regex(/^[0-9]+(?:\.[0-9]+)?$/).nullable(),currency:z.enum(["IRT","IRR"]).nullable(),complete:z.boolean(),missing:z.array(z.enum(["resource_archived","rate_unknown","rate_validity_unknown","rate_not_valid_on_date","purchase_unit_unknown","conversion_unknown"]))})
export const costingApi={
 async estimate(id:string,version:number,quantity:string,unit:"base"|"purchase",date:string){const query=new URLSearchParams({quantity,unit,on:date});const value=estimateResult.parse(await privateRequest(`${base}/${id}/estimate?${query}`));if(value.resource_id!==id||value.version!==version||value.quantity!==quantity||value.unit!==unit||value.estimate_date!==date||(value.complete&&(value.amount===null||value.currency===null||value.missing.length>0))||(!value.complete&&value.amount!==null))throw new Error("result_unknown");return value},
 async list(kind:CostContent["kind"],q:string,active:string,cursor?:string){const query=new URLSearchParams({kind,q,limit:"25"});if(active!=="all")query.set("active",active);if(cursor)query.set("cursor",cursor);const value=z.object({items:z.array(resource),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${base}?${query}`));if(value.items.some(item=>item.content.kind!==kind))throw new Error("result_unknown");return value},
 async detail(id:string){const value=resource.parse(await privateRequest(`${base}/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async versions(id:string,before?:number){const value=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/${id}/versions${before?`?before=${before}`:""}`));if(value.items.some(item=>item.resource_id!==id))throw new Error("result_unknown");return value},
 async saved(id:string,key:string){const value=revision.parse(await privateRequest(`${base}/${id}/versions/${key}`));if(value.resource_id!==id||value.revision_id!==key)throw new Error("result_unknown");return value},
 async save(id:string,key:string,intent:CostIntent){const value=revision.parse(await privateRequest(`${base}/${id}/versions/${key}`,"PUT",intent));if(value.resource_id!==id||value.revision_id!==key||value.version!==intent.expected_version+1||value.expected_version!==intent.expected_version||JSON.stringify(value.content)!==JSON.stringify(costContent.parse(intent.content))||value.reason!==intent.reason)throw new Error("result_unknown");return value},
}
