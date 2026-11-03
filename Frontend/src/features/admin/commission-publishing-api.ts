import {z} from "zod"
import {privateRequest} from "./identity-api"
import {commissionSchema} from "../customer/commissions-api"
export type Publication={version:number;preview_png:string;note:string;agreement:string;revision_allowance:number;accepted_terms_confirmed:boolean}
const base="/api/v1/admin/commissions"
export const commissionPublishingApi={
 async list(cursor?:string,q?:string,status?:z.infer<typeof commissionSchema>["status"]){const params=new URLSearchParams({limit:"50"});if(cursor)params.set("cursor",cursor);if(q)params.set("q",q);if(status)params.set("status",status);return z.object({items:z.array(commissionSchema),next_cursor:z.string().uuid().nullable()}).parse(await privateRequest(`${base}?${params}`))},
 async detail(id:string){const result=commissionSchema.parse(await privateRequest(`${base}/${id}`));if(result.id!==id)throw new Error("result_unknown");return result},
 async publish(id:string,key:string,body:Publication){const result=commissionSchema.parse(await privateRequest(`${base}/${id}/artwork/${key}`,"PUT",body));if(result.id!==id||!result.artwork.some(artwork=>artwork.id===key&&artwork.note===body.note)||result.agreement!==body.agreement||result.revision_allowance!==body.revision_allowance)throw new Error("result_unknown");return result},
}
export async function readPreview(file:File){
 if(!file.size||file.size>5*1024*1024||file.type!=="image/png")throw new Error("invalid_preview")
 const bytes=new Uint8Array(await file.arrayBuffer())
 if([137,80,78,71,13,10,26,10].some((value,index)=>bytes[index]!==value))throw new Error("invalid_preview")
 let binary="";for(let start=0;start<bytes.length;start+=8192)binary+=String.fromCharCode(...bytes.subarray(start,start+8192))
 return btoa(binary)
}
