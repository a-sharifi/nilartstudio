import {z} from "zod"
export type CatalogPrice={amount:string;currency:"IRT"|"IRR"}
const money=z.object({amount:z.string().regex(/^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/),currency:z.enum(["IRT","IRR"])})
const sku=z.object({id:z.string().min(1),product_id:z.string().min(1),price:money.nullable()})
const microUnits=(value:string)=>{const [whole,fraction=""]=value.split(".");return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,"0"))}
// Compare in rial micro-units; retain the selected variant's explicit currency.
const comparable=(price:CatalogPrice)=>microUnits(price.amount)*(price.currency==="IRT"?10n:1n)
export function minimumVariantPrices(values:unknown[]):Map<string,CatalogPrice>{
 const result=new Map<string,CatalogPrice>(),ids=new Set<string>()
 for(const value of values){
  const row=sku.parse(value)
  if(ids.has(row.id))throw Error("Duplicate published SKU")
  ids.add(row.id)
  if(!row.price)continue
  const current=result.get(row.product_id)
  if(!current||comparable(row.price)<comparable(current))result.set(row.product_id,row.price)
 }
 return result
}
export function formatCatalogAmount(amount:string,language:0|1){
 const [whole,fraction=""]=amount.split(".")
 const integral=BigInt(whole).toLocaleString(language===0?"fa-IR":"en-US")
 const decimals=fraction.replace(/0+$/,"")
 return integral+(decimals?(language===0?"٫":".")+(language===0?decimals.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]):decimals):"")
}
