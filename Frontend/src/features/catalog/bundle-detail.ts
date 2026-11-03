import {useEffect,useState} from "react"
import {z} from "zod"
import {mapPublishedProduct,mapPublishedSKUs,type PublishedProduct,type PublishedSKU} from "./product-detail"
import type {PublishedBundle} from "./bundle-catalog"
const copy=z.object({fa:z.string(),en:z.string()})
const presentation=z.object({intro:copy,contents:copy,collection_slug:z.string(),collection_title:copy,sample:z.boolean(),discount:z.object({kind:z.enum(["fixed","percent"]).optional(),amount:z.string().regex(/^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/),currency:z.enum(["IRT","IRR"])}).nullable(),allow_discount_stacking:z.boolean().nullable(),component_choices:z.array(z.object({component_sku_id:z.string().uuid(),allowed_sku_ids:z.array(z.string().uuid())}))})
export type BundlePresentation=z.infer<typeof presentation>
export type BundleProduct={product:PublishedProduct;skus:PublishedSKU[]}
export function useBundleDetail(bundle:PublishedBundle){
 const [revision,setRevision]=useState(0)
 const [state,setState]=useState<{key:string;status:"loading"|"normal"|"error";presentation:BundlePresentation|null;products:Record<string,BundleProduct>;related:BundleProduct[];gallery:{url:string;alt_fa:string;alt_en:string}[]}>({key:"",status:"loading",presentation:null,products:{},related:[],gallery:[]})
 useEffect(()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>{controller.abort();setState({key:bundle.id,status:"error",presentation:null,products:{},related:[],gallery:[]})},15000)
  const json=async(url:string,optional=false)=>{const response=await fetch(url,{cache:"no-store",signal:controller.signal});if(optional&&response.status===404)return null;if(!response.ok)throw Error("Bundle detail unavailable");return response.json()}
  void (async()=>{
   const [document,entries,gallery]=await Promise.all([json(`/api/v1/catalog/bundles/${encodeURIComponent(bundle.slug)}/presentation`,true),Promise.all([...new Set(bundle.components.flatMap(part=>part.product_slug?[part.product_slug]:[]))].map(async slug=>{
    const product=mapPublishedProduct(await json(`/api/v1/catalog/products/${encodeURIComponent(slug)}`))
    if(product.slug!==slug)throw Error("Wrong component product")
    return [slug,{product,skus:mapPublishedSKUs(await json(`/api/v1/catalog/products/${encodeURIComponent(slug)}/skus`),product.id)}] as const
   })),json(`/api/v1/catalog/bundles/${encodeURIComponent(bundle.slug)}/gallery`,true).then(value=>z.array(z.object({url:z.string().startsWith('/api/v1/media/'),alt_fa:z.string(),alt_en:z.string()})).parse(value??[])).catch(()=>[])])
   const parsed=document?presentation.parse(document):null
   let related:BundleProduct[]=[]
   if(parsed){
    try {
     const page=z.object({items:z.array(z.unknown())}).parse(await json(`/api/v1/catalog/products?collection=${encodeURIComponent(parsed.collection_slug)}&page_size=24`))
     const next=page.items.map(mapPublishedProduct).find(product=>!entries.some(([slug])=>slug===product.slug))
     if(next){const product=mapPublishedProduct(await json(`/api/v1/catalog/products/${encodeURIComponent(next.slug)}`));related=[{product,skus:mapPublishedSKUs(await json(`/api/v1/catalog/products/${encodeURIComponent(next.slug)}/skus`),product.id)}]}
    }catch{ /* Optional related content never hides the authored bundle. */ }
   }
   if(!controller.signal.aborted)setState({key:bundle.id,status:"normal",presentation:parsed,products:Object.fromEntries(entries),related,gallery})
  })().catch(()=>{if(!controller.signal.aborted)setState({key:bundle.id,status:"error",presentation:null,products:{},related:[],gallery:[]})}).finally(()=>clearTimeout(timeout))
  return()=>{clearTimeout(timeout);controller.abort()}
 },[bundle.id,bundle.slug,bundle.components,revision])
 return {...(state.key===bundle.id?state:{key:bundle.id,status:"loading" as const,presentation:null,products:{},related:[],gallery:[]}),retry:()=>{setState({key:bundle.id,status:"loading",presentation:null,products:{},related:[],gallery:[]});setRevision(value=>value+1)}}
}
// Exact micro-unit arithmetic for displayed catalog quotes; never a checkout authorization.
export const bundlePriceUnits=(amount:string)=>{const [whole,fraction=""]=amount.split(".");return BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,"0"))}
export function bundleQuote(parts:{sku:PublishedSKU|undefined;quantity:number}[],discount:BundlePresentation["discount"],quantity:number){
 if(!parts.length||parts.some(part=>!part.sku?.price))return null
 const currency=parts[0].sku!.price!.currency
 if(parts.some(part=>part.sku!.price!.currency!==currency)||!discount||discount.currency!==currency)return null
 const separate=parts.reduce((total,part)=>total+bundlePriceUnits(part.sku!.price!.amount)*BigInt(part.quantity),0n)
 const proposed=discount.kind==="percent"?(separate*bundlePriceUnits(discount.amount)+50000000n)/100000000n:bundlePriceUnits(discount.amount),saving=proposed>separate?separate:proposed,price=separate-saving
 return {currency,separate,saving,price,total:price*BigInt(quantity)}
}
export function displayBundleMoney(amount:bigint,currency:"IRT"|"IRR",language:0|1){
 const integral=(amount/1000000n).toLocaleString(language===0?"fa-IR":"en-US"),fraction=(amount%1000000n).toString().padStart(6,"0").replace(/0+$/,"")
 const digits=language===0?fraction.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]):fraction
 return `${integral}${digits?(language===0?"٫":".")+digits:""} ${currency==="IRT"?(language===0?"تومان":"toman"):(language===0?"ریال":"rial")}`
}

export function selectBundleOption(previous:Record<string,string>,key:string,value:string,groups:string[],combinations:{selections:Record<string,string>}[]){
 const next:Record<string,string>={[key]:value}
 for(const field of groups){
  if(field===key||!previous[field])continue
  const candidate={...next,[field]:previous[field]}
  next[field]=combinations.some(item=>Object.entries(candidate).every(([id,selected])=>!selected||item.selections[id]===selected))?previous[field]:""
 }
 return next
}
export function bundleOptionOffered(selection:Record<string,string>,key:string,value:string,groups:string[],combinations:{selections:Record<string,string>}[]){
 const prior=groups.slice(0,groups.indexOf(key))
 return combinations.some(item=>item.selections[key]===value&&prior.every(field=>!selection[field]||item.selections[field]===selection[field]))
}

// Choose only authored alternatives; quantities and the authored discount remain exact.
export function cheapestBundleQuote(bundle:PublishedBundle,document:BundlePresentation|null,products:Record<string,BundleProduct>){
 if(!document)return null
 const parts=bundle.components.map(component=>{
  const entry=component.product_slug?products[component.product_slug]:undefined
  const choices=document.component_choices.find(choice=>choice.component_sku_id===component.sku_id)?.allowed_sku_ids??[component.sku_id]
  const eligible=entry?.skus.filter(sku=>choices.includes(sku.id)&&sku.price)??[]
  const currency=document.discount?.currency??eligible[0]?.price?.currency
  const sku=eligible.filter(sku=>sku.price?.currency===currency).sort((a,b)=>bundlePriceUnits(a.price!.amount)<bundlePriceUnits(b.price!.amount)?-1:bundlePriceUnits(a.price!.amount)>bundlePriceUnits(b.price!.amount)?1:0)[0]
  return {sku,quantity:component.quantity}
 })
 const currency=parts[0]?.sku?.price?.currency
 return bundleQuote(parts,document.discount??(currency?{amount:"0",currency}:null),1)
}

export function useBundleAvailability(slug:string,choices:Record<string,string>,ready:boolean){
 const [retryVersion,setRetryVersion]=useState(0),key=JSON.stringify([slug,choices]),[state,setState]=useState<{key:string;status:'loading'|'normal'|'error';capacity:string|null;configured:boolean;unlimited?:boolean}>({key:'',status:'loading',capacity:null,configured:false})
 useEffect(()=>{if(!ready)return;setState({key,status:'loading',capacity:null,configured:false});const controller=new AbortController(),timeout=setTimeout(()=>{controller.abort();setState({key,status:'error',capacity:null,configured:false})},15000);void fetch(`/api/v1/catalog/bundles/${encodeURIComponent(slug)}/availability?${new URLSearchParams({choices:JSON.stringify(choices)})}`,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error('unavailable');return z.object({unlimited:z.boolean().default(false),configured:z.boolean(),capacity:z.string().regex(/^(?:0|[1-9][0-9]*)$/).nullable()}).refine(value=>value.configured===(value.capacity!==null||value.unlimited)&&(!value.unlimited||value.capacity===null)).parse(await response.json())}).then(result=>{if(!controller.signal.aborted)setState({key,status:'normal',...result})}).catch(()=>{if(!controller.signal.aborted)setState({key,status:'error',capacity:null,configured:false})}).finally(()=>clearTimeout(timeout));return()=>{clearTimeout(timeout);controller.abort()}},[key,ready,retryVersion])
 return {...(state.key===key?state:{key,status:'loading' as const,capacity:null,configured:false}),retry:()=>setRetryVersion(value=>value+1)}
}
