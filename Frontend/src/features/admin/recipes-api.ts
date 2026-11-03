import {z} from "zod"
import {privateRequest} from "./identity-api"
import {costContent} from "./costing-api"
const uuid=z.string().uuid(),decimal=z.string().regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,6})?$/)
export const recipeLine=z.object({id:uuid,label:z.string().min(1).max(200),resource_id:uuid,resource_revision_id:uuid,quantity:decimal.nullable(),unit:z.enum(["base","purchase"]),basis:z.enum(["output","batch"]),cutting_yield:z.number().int().min(1).max(1000000).nullable(),waste_fraction:decimal.nullable(),cutting_approval:z.string().max(500)})
export const recipeContent=z.object({sku_id:uuid,title_fa:z.string().min(1).max(200),title_en:z.string().min(1).max(200),valid_from:z.iso.date().nullable(),valid_to:z.iso.date().nullable(),active:z.boolean(),lines:z.array(recipeLine).min(1).max(100)})
const record=z.object({id:uuid,version:z.number().int().positive(),content:recipeContent,updated_at:z.iso.datetime({offset:true}),sku_code:z.string()})
const snapshot=z.object({resource_id:uuid,revision_id:uuid,version:z.number().int().positive(),content:costContent})
const revision=z.object({revision_id:uuid,recipe_id:uuid,actor_id:uuid,version:z.number().int().positive(),expected_version:z.number().int().nonnegative(),content:recipeContent,snapshots:z.array(snapshot),reason:z.string(),created_at:z.iso.datetime({offset:true})})
export type RecipeContent=z.infer<typeof recipeContent>
export type RecipeLine=z.infer<typeof recipeLine>
export type RecipeRecord=z.infer<typeof record>
export type RecipeRevision=z.infer<typeof revision>
export type RecipeSnapshot=z.infer<typeof snapshot>
export type RecipeIntent={expected_version:number;content:RecipeContent;reason:string}
const unsigned=z.string().regex(/^[0-9]+(?:\.[0-9]+)?$/),integer=z.string().regex(/^[0-9]+$/)
const missing=z.enum(["recipe_archived","recipe_version_changed","recipe_validity_unknown","recipe_not_valid_on_date","line_incomplete","mixed_currencies","resource_version_changed","resource_archived","rate_unknown","rate_validity_unknown","rate_not_valid_on_date","quantity_unknown","waste_unknown","conversion_unknown"])
const estimate=z.object({recipe_id:uuid,revision_id:uuid,version:z.number().int().positive(),estimate_date:z.iso.date(),good_output:z.number().int().positive(),places:z.number().int().min(0).max(6),rounding:z.enum(["half_up","up"]),complete:z.boolean(),currency:z.enum(["IRT","IRR"]).nullable(),total:unsigned.nullable(),per_output:unsigned.nullable(),exact_numerator:integer.nullable(),exact_denominator:integer.nullable(),missing:z.array(missing),lines:z.array(z.object({line_id:uuid,label:z.string(),resource_id:uuid,resource_version:z.number().int().positive(),currency:z.enum(["IRT","IRR"]).nullable(),amount:unsigned.nullable(),exact_numerator:integer.nullable(),exact_denominator:integer.nullable(),missing:z.array(missing)}))})
const base="/api/v1/admin/costing"
function checkRevision(value:RecipeRevision,id:string,key?:string){if(value.recipe_id!==id||(key&&value.revision_id!==key)||value.version!==value.expected_version+1||value.content.lines.some(line=>!value.snapshots.some(s=>s.resource_id===line.resource_id&&s.revision_id===line.resource_revision_id)))throw new Error("result_unknown");return value}
export function matchesRecipe(value:RecipeRevision,id:string,key:string,intent:RecipeIntent){checkRevision(value,id,key);if(value.expected_version!==intent.expected_version||JSON.stringify(value.content)!==JSON.stringify(recipeContent.parse(intent.content))||value.reason!==intent.reason)throw new Error("result_unknown");return value}
export const recipesApi={
 async list(q:string,active:string,cursor?:string){const query=new URLSearchParams({q,limit:"25"});if(active!=="all")query.set("active",active);if(cursor)query.set("cursor",cursor);return z.object({items:z.array(record),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/recipes?${query}`))},
 async skus(q:string,cursor?:string){const query=new URLSearchParams({q,limit:"25"});if(cursor)query.set("cursor",cursor);return z.object({items:z.array(z.object({id:uuid,code:z.string(),recipe_id:uuid.nullable()})),next_cursor:uuid.nullable()}).parse(await privateRequest(`${base}/recipe-skus?${query}`))},
 async detail(id:string){const value=record.parse(await privateRequest(`${base}/recipes/${id}`));if(value.id!==id)throw new Error("result_unknown");return value},
 async versions(id:string,before?:number){const value=z.object({items:z.array(revision),next_before_version:z.number().int().positive().nullable()}).parse(await privateRequest(`${base}/recipes/${id}/versions${before?`?before=${before}`:""}`));value.items.forEach(item=>checkRevision(item,id));return value},
 async saved(id:string,key:string){return checkRevision(revision.parse(await privateRequest(`${base}/recipes/${id}/versions/${key}`)),id,key)},
 async save(id:string,key:string,intent:RecipeIntent){const raw=await privateRequest(`${base}/recipes/${id}/versions/${key}`,"PUT",intent);try{return matchesRecipe(revision.parse(raw),id,key,intent)}catch{throw new Error("result_unknown")}},
 async estimate(saved:RecipeRevision,on:string,output:number,places:number,rounding:"half_up"|"up"){
  const query=new URLSearchParams({revision:saved.revision_id,on,good_output:String(output),places:String(places),rounding});const value=estimate.parse(await privateRequest(`${base}/recipes/${saved.recipe_id}/estimate?${query}`))
  if(value.recipe_id!==saved.recipe_id||value.revision_id!==saved.revision_id||value.version!==saved.version||value.estimate_date!==on||value.good_output!==output||value.places!==places||value.rounding!==rounding||value.lines.length!==saved.content.lines.length||value.lines.some((line,index)=>line.line_id!==saved.content.lines[index].id||line.resource_id!==saved.content.lines[index].resource_id||!saved.snapshots.some(s=>s.resource_id===line.resource_id&&s.version===line.resource_version))||(value.complete&&(value.missing.length||value.lines.some(line=>line.missing.length||line.amount===null)||value.currency===null||value.total===null||value.per_output===null||value.exact_numerator===null||value.exact_denominator===null))||(!value.complete&&(value.total!==null||value.per_output!==null)))throw new Error("result_unknown")
  return value
 }
}
