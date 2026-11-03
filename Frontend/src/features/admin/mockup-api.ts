import {z} from 'zod';
import {privateRequest} from './identity-api';
import {canonical} from './finance-api';
import {notebookSpec} from '../catalog/notebook-images';
const uuid=z.string().uuid();
export const mockupRef=z.object({asset_id:uuid,revision_id:uuid});
export const mockupSources=z.object({front:mockupRef,back_print:mockupRef.nullable().optional(),back_crop:z.tuple([z.number(),z.number(),z.number(),z.number()]).default([0,0,1,1]),back_art:mockupRef.nullable().optional(),logo:mockupRef.nullable().optional(),inside_left:mockupRef.nullable().optional(),inside_right:mockupRef.nullable().optional(),inside_mode:z.enum(['motifs','pages']).default('motifs')});
const templateContent=z.object({title_fa:z.string(),title_en:z.string(),notebook_type:z.enum(['notebook','sketchbook']),binding:z.enum(['top','side']),view:z.enum(['front','back','inside']),photo:mockupRef,occlusion:mockupRef.nullable().optional(),quads:z.array(z.object({points:z.array(z.tuple([z.number(),z.number()])).length(4)})).min(1).max(2),active:z.boolean()});
export const mockupTemplate=z.object({id:uuid,version:z.number(),content:templateContent});
const outputs=z.array(z.object({view:z.enum(['front','back','inside']),format:z.enum(['png','jpeg']),asset_id:uuid,revision_id:uuid,sha256:z.string(),alt_fa:z.string(),alt_en:z.string()}));
const inputs=z.object({spec:notebookSpec,sources:mockupSources,templates:z.record(uuid,z.object({version:z.number(),content:templateContent})),views:z.record(z.string(),uuid),target:z.object({product_id:uuid.nullable(),sku_id:uuid.nullable(),collection_id:uuid.nullable()}),attach_to:z.enum(['sku','product','none']),profile:z.object({kind:z.enum(['products','skus']),id:uuid,version:z.number()}).optional()});
const run=z.object({id:uuid,set_id:uuid,status:z.enum(['queued','rendering','ready','failed']),inputs,outputs,error:z.string(),stale:z.boolean().optional()});
const set=z.object({id:uuid,set_key:z.string(),version:z.number(),spec:notebookSpec,target:inputs.shape.target,published_run:uuid.nullable(),latest_run:uuid.nullable().optional(),status:z.string().nullable().optional(),error:z.string().nullable().optional(),outputs:outputs.nullable().optional(),inputs:inputs.nullable().optional(),stale:z.boolean().optional()});
export type MockupRun=z.infer<typeof run>;
export type MockupSet=z.infer<typeof set>;
export type MockupSources=z.infer<typeof mockupSources>;
export type MockupTemplate=z.infer<typeof mockupTemplate>;
export type RenderIntent={expected_version:number;spec:z.infer<typeof notebookSpec>;sources:MockupSources;templates:Record<string,string>;target:z.infer<typeof inputs>['target'];attach_to:'sku'|'product'|'none';reason:string};
export type PublishIntent={expected_version:number;action:'publish'|'rollback'|'unpublish';run_id:string|null;expected_profile_version:number|null;reason:string};
const base='/api/v1/admin/mockups';
export const mockupApi={
 async templates(){return z.object({items:z.array(mockupTemplate)}).parse(await privateRequest(`${base}/templates`)).items},
 async sets(productId?:string,skuId?:string,group?:string){
  const p=new URLSearchParams({limit:'100'}),items:MockupSet[]=[],seen=new Set<string>();
  if(productId)p.set('product_id',productId);if(skuId)p.set('sku_id',skuId);if(group)p.set('group',group);
  for(let page=0;page<10;page++){
   const result=z.object({items:z.array(set),next_cursor:z.string().nullable()}).parse(await privateRequest(`${base}/sets?${p}`));
   for(const item of result.items){if(items.some(row=>row.id===item.id)||(productId&&item.target.product_id!==productId)||(skuId&&item.target.sku_id!==skuId)||(group&&item.spec.group!==group))throw Error('result_unknown');items.push(item)}
   if(!result.next_cursor)return {items,next_cursor:null};
   if(seen.has(result.next_cursor))throw Error('result_unknown');seen.add(result.next_cursor);p.set('cursor',result.next_cursor);
  }
  throw Error('mockup_list_too_large');
 },
 async detail(id:string){const item=set.extend({runs:z.array(run.omit({set_id:true})),history:z.array(z.object({id:uuid,result:z.object({id:uuid,version:z.number(),published_run:uuid.nullable()}),created_at:z.string()}))}).parse(await privateRequest(`${base}/sets/${id}`));if(item.id!==id)throw Error('result_unknown');return item},
 async run(id:string){const result=run.parse(await privateRequest(`${base}/runs/${id}`));if(result.id!==id)throw Error('result_unknown');return result},
 async render(key:string,body:RenderIntent){return run.parse(await privateRequest(`${base}/runs/${key}`,'PUT',body))},
 async retry(id:string){return run.parse(await privateRequest(`${base}/runs/${id}/retry`,'POST'))},
 async publish(id:string,key:string,body:PublishIntent){const result=z.object({id:uuid,version:z.number(),published_run:uuid.nullable()}).parse(await privateRequest(`${base}/sets/${id}/commands/${key}`,'PUT',body));if(result.id!==id||result.version!==body.expected_version+1||result.published_run!==(body.action==='unpublish'?null:body.run_id))throw Error('result_unknown');return result},
 async receipt(key:string){return z.object({id:uuid,intent:z.record(z.string(),z.unknown()),result:z.record(z.string(),z.unknown())}).parse(await privateRequest(`${base}/commands/${key}`))},
 async template(id:string,key:string,expected_version:number,content:MockupTemplate['content'],reason:string){const intent={...content,title_fa:content.title_fa.trim(),title_en:content.title_en.trim(),occlusion:content.occlusion??null};const result=mockupTemplate.parse(await privateRequest(`${base}/templates/${id}/commands/${key}`,'PUT',{expected_version,content:intent,reason}));if(result.id!==id||result.version!==expected_version+1||canonical({...result.content,occlusion:result.content.occlusion??null})!==canonical(intent))throw Error('result_unknown');return result},
 async coverage(){return z.object({expected_sets:z.number(),expected_positions:z.number(),total_sets:z.number(),published_sets:z.number(),runs:z.record(z.string(),z.number())}).parse(await privateRequest(`${base}/coverage`))}
};
