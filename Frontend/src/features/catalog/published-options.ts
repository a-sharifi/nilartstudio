import { z } from "zod"
import type { PublishedSKU, ProductPresentation } from "./product-detail"

const label = z.object({ id:z.string().uuid(), title_fa:z.string().min(1), title_en:z.string().min(1), order:z.number().int().nonnegative() })
const mapping = z.object({
 sku_id:z.string(), product_id:z.string(), configuration_id:z.string().uuid(), configuration_version:z.number().int().positive(),
 options:z.array(label.extend({values:z.array(label).min(1)})),
 combination:z.object({code:z.string(), selections:z.array(z.object({option_id:z.string().uuid(),value_id:z.string().uuid()}))}),
})
export type PublishedOptions = {
 groups:NonNullable<ProductPresentation["option_groups"]>
 combinations:NonNullable<ProductPresentation["option_combinations"]>
 labels:NonNullable<ProductPresentation["option_labels"]>
 selections:Record<string,Record<string,string>>
}

/** Read only published, pinned snapshots; never infer choices from an editable draft. */
export function mapPublishedOptions(values:unknown[], skus:PublishedSKU[], productId:string):PublishedOptions|undefined {
 const groups:PublishedOptions["groups"][] = [], combinations:PublishedOptions["combinations"] = [], labels:PublishedOptions["labels"] = {}, selections:PublishedOptions["selections"] = {}
 for (let index=0;index<skus.length;index++) {
  if(values[index]===null)continue // Unmapped legacy SKU: retain its explicit selector.
  const row=mapping.parse(values[index]),sku=skus[index]
  if(row.sku_id!==sku.id||row.product_id!==productId||row.combination.code!==sku.code)throw Error("Invalid option ownership")
  const options=[...row.options].sort((a,b)=>a.order-b.order)
  const selected=Object.fromEntries(row.combination.selections.map(choice=>[choice.option_id,choice.value_id]))
  if(new Set(options.map(o=>o.id)).size!==options.length || row.combination.selections.length!==options.length || Object.keys(selected).length!==options.length)throw Error("Invalid option combination")
  const names=options.map(option=>{
   const choice=option.values.find(value=>value.id===selected[option.id])
   if(!choice || new Set(option.values.map(v=>v.id)).size!==option.values.length)throw Error("Invalid option value")
   return {fa:`${option.title_fa}: ${choice.title_fa}`,en:`${option.title_en}: ${choice.title_en}`}
  })
  if(names.length)labels[sku.code]={fa:names.map(n=>n.fa).join(" · "),en:names.map(n=>n.en).join(" · ")}
  selections[sku.id]=selected
  groups.push(options.map(option=>({id:option.id,label:{fa:option.title_fa,en:option.title_en},choices:[...option.values].sort((a,b)=>a.order-b.order).map(value=>({value:value.id,label:{fa:value.title_fa,en:value.title_en}}))})))
  combinations.push({code:sku.code,selections:selected})
 }
 if(!groups.length)return undefined
 // Incompatible historical definitions or a mix of mapped/legacy SKUs must not
 // hide a valid SKU or merge different meanings. Use labeled explicit SKUs.
 const same=groups.length===skus.length && groups.every(group=>JSON.stringify(group)===JSON.stringify(groups[0]))
 const unique=new Set(combinations.map(c=>JSON.stringify(c.selections))).size===combinations.length
 return {groups:same&&unique?groups[0]:[],combinations:same&&unique?combinations:[],labels,selections}
}
