"use client"
import {useEffect,useSyncExternalStore} from "react"
import {z} from "zod"
import {sessionLifecycle} from "../identity/session-lifecycle"
const item=z.object({kind:z.enum(["product","bundle","artwork"]),item_id:z.string().uuid(),choices:z.record(z.string(),z.string()).default({}),framed:z.boolean().default(false),quantity:z.number().int().min(1).max(99).default(1)})
const money=z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
const quote=z.object({slug:z.string(),name:z.tuple([z.string(),z.string()]),selection:z.record(z.string(),z.string()),options:z.array(z.tuple([z.string(),z.string()])).optional(),unit:money,base:money,saving:money,parts:z.array(z.object({sku_id:z.string(),quantity:z.number(),name:z.tuple([z.string(),z.string()]),unit:money,slug:z.string()})),media:z.enum(["product","bundle","artwork"]),image:z.string().optional(),artist:z.tuple([z.string(),z.string()]).optional(),size:z.string().optional(),frame:z.array(z.string().nullable()).optional()})
const document=z.object({version:z.number().int().nonnegative(),owner:z.enum(["guest","account"]),lines:z.array(z.object({id:z.string(),item,accepted_unit:money,quote,issue:z.enum(["price","unavailable"]).nullable().optional().default(null)})),totals:z.object({base:money,discount:money,total:money,currency:z.literal("IRT"),count:z.number().int().nonnegative()}),csrf_token:z.string().optional(),guest_available:z.boolean(),checkout_enabled:z.literal(false)})
export type Basket=z.infer<typeof document>
export type BasketItem=z.infer<typeof item>
const empty:Basket={version:0,owner:"guest",lines:[],totals:{base:"0",discount:"0",total:"0",currency:"IRT",count:0},guest_available:false,checkout_enabled:false}
type State={data:Basket;status:"loading"|"ready"|"error";busy:boolean;error:string}
let state:State={data:empty,status:"loading",busy:false,error:""},generation=0,reading:Promise<void>|null=null
const serverState=state,listeners=new Set<()=>void>()
const set=(next:State)=>{state=next;listeners.forEach(listener=>listener())}
async function request(path:string,body?:unknown,csrf?:string){
 const authRevision=sessionLifecycle.capture()
 const response=await fetch(path,{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json",...(csrf?{"X-CSRF-Token":csrf}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)})
 const value=await response.json()
 if(response.status===401)sessionLifecycle.observe(null,authRevision)
 if(!response.ok)throw Error(value.code||value.detail?.code||"basket_unavailable")
 return value
}
export const basketStore={
 subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}},
 get:()=>state,
 async load(){
  if(reading)return reading
  const revision=generation
  reading=(async()=>{try{const data=document.parse(await request("/api/v1/basket"));if(revision===generation)set({...state,data,status:"ready",error:""})}catch(error){if(revision===generation)set({...state,status:"error",error:error instanceof Error?error.message:"basket_unavailable"})}})().finally(()=>{reading=null})
  return reading
 },
 async mutate(action:string,values:Record<string,unknown>={}){
  if(state.busy)throw Error("basket_busy")
  if(state.status!=="ready")await this.load()
  if(state.status!=="ready")throw Error("basket_unavailable")
  generation++;reading=null
  const revision=generation,version=state.data.version,command_id=crypto.randomUUID()
  set({...state,busy:true,error:""})
  try{
   const bootstrap=document.parse(await request("/api/v1/basket/bootstrap",{}))
   let csrf=bootstrap.csrf_token
   if(bootstrap.owner==="account")csrf=z.object({csrf_token:z.string()}).parse(await request("/api/v1/auth/session/csrf",{})).csrf_token
   const data=document.parse(await request("/api/v1/basket/commands",{command_id,version,action,...values},csrf))
   if(revision!==generation)throw Error("session_changed")
   generation++;reading=null
   set({data,status:"ready",busy:false,error:""})
   window.dispatchEvent(new Event("nilart-basket-changed"))
   return data
  }catch(error){
   if(revision===generation){await this.load();set({...state,busy:false,error:error instanceof Error?error.message:"result_unknown"})}
   throw error
  }
 },
 add(value:Omit<BasketItem,"choices"|"framed"|"quantity"> & Partial<BasketItem>,expectedUnit?:string){return this.mutate("add",{item:item.parse(value),...(expectedUnit?{expected_unit:expectedUnit}:{})})},
}
sessionLifecycle.registerPrivateCache(()=>{generation++;reading=null;set({data:empty,status:"loading",busy:false,error:""})})
sessionLifecycle.subscribe(event=>{if(event.type==="changed"||event.type==="revalidate")void basketStore.load()})
export function useBasket(enabled=true){
 const current=useSyncExternalStore(basketStore.subscribe,basketStore.get,()=>serverState)
 useEffect(()=>{if(!enabled)return;void basketStore.load();const reload=()=>void basketStore.load();window.addEventListener("focus",reload);window.addEventListener("nilart-basket-changed",reload);return()=>{window.removeEventListener("focus",reload);window.removeEventListener("nilart-basket-changed",reload)}},[enabled])
 return current
}
