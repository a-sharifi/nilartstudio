import {z} from 'zod';
import {privateRequest} from './identity-api';
export const channelCode=z.enum(['basalam','digikala','snappshop','tapsishop']);
const positive=z.number().int().positive(),uuid=z.string().uuid();
export const channelConfig=z.object({mode:z.enum(['disabled','preview','live']),markup_percent:z.string(),commission_percent:z.string().nullable(),installment_percent:z.string().nullable(),rounding_toman:positive,stock_buffer:z.number().int().nonnegative(),stock_cap:z.number().int().nonnegative().nullable(),vendor_id:positive.nullable(),sync_products:z.boolean(),sync_stock:z.boolean(),import_orders:z.boolean(),preparation_days:z.number().int().nonnegative().nullable(),packaging_weight_grams:positive.nullable()});
export const channelRecord=z.object({code:channelCode,version:z.number().int().nonnegative(),content:channelConfig,adapter_ready:z.boolean(),transport_enabled:z.boolean(),credentials_configured:z.boolean(),webhook_secret_configured:z.boolean(),webhook_url:z.string(),updated_at:z.string()});
export const listingContent=z.object({sku_id:uuid,active:z.boolean(),title:z.string(),description:z.string(),category_id:positive.nullable(),brand:z.string(),barcode:z.string(),video_id:positive.nullable().default(null),keywords:z.array(z.string()),preparation_days:z.number().int().nonnegative().nullable(),packaging_weight_grams:positive.nullable(),attributes:z.array(z.object({property_id:positive,value:z.string(),selected_values:z.array(positive).default([])})),gallery:z.array(z.object({asset_id:uuid,revision_id:uuid,alt_fa:z.string(),alt_en:z.string()})),external_product_id:positive.nullable(),external_variation_id:positive.nullable(),images_reviewed:z.boolean(),handmade:z.boolean(),customizable:z.boolean()});
const listingRecord=z.object({id:uuid,channel:channelCode,sku_id:uuid,version:positive,content:listingContent,external_product_id:positive.nullable(),external_variation_id:positive.nullable(),last_error:z.string().nullable(),last_applied_fingerprint:z.string().nullable()});
const choices=z.object({id:uuid,product_id:uuid.optional(),code:z.string(),title_fa:z.string(),title_en:z.string()});
const operation=z.object({id:uuid,listing_id:uuid.nullable(),kind:z.string(),state:z.enum(['queued','sending','succeeded','unknown','failed','superseded']),error_code:z.string().nullable(),result:z.unknown().nullable(),created_at:z.string()});
const externalOrder=z.object({id:uuid,external_id:positive,status:z.string(),issue:z.string().nullable(),provider_updated_at:z.string(),snapshot:z.object({items:z.array(z.object({title:z.string(),quantity:positive,price:z.number()})),total_items_price:z.number().optional(),shipping_cost:z.number().optional(),order:z.object({id:z.number().optional()}).passthrough()}).passthrough()});
const activity=z.object({operations:z.array(operation),orders:z.array(externalOrder),inbox:z.array(z.object({id:uuid,state:z.string(),error_code:z.string().nullable(),created_at:z.string(),processed_at:z.string().nullable()}))});
const plan=z.object({listing_id:uuid,listing_version:positive,channel:channelCode,settings_version:z.number().int().nonnegative(),sku_code:z.string(),site_price:z.string().nullable(),site_currency:z.string().nullable(),channel_price_toman:z.string().nullable(),estimated_net_toman:z.string().nullable(),available:z.number().int().nonnegative(),payload:z.record(z.string(),z.unknown()),issues:z.array(z.string()),warnings:z.array(z.string()),ready:z.boolean(),fingerprint:z.string().regex(/^[a-f0-9]{64}$/)});
export type ChannelCode=z.infer<typeof channelCode>;
export type ChannelConfig=z.infer<typeof channelConfig>;
export type ChannelRecord=z.infer<typeof channelRecord>;
export type ChannelListing=z.infer<typeof listingContent>;
export type ListingRecord=z.infer<typeof listingRecord>;
export type ChannelPlan=z.infer<typeof plan>;
export type ChannelActivity=z.infer<typeof activity>;
export type SKUChoice=z.infer<typeof choices>;
export const channelsApi={
 async configs(){return z.array(channelRecord).parse(await privateRequest('/api/v1/admin/channels'))},
 async saveConfig(code:ChannelCode,key:string,body:{expected_version:number;content:ChannelConfig;reason:string}){const r=channelRecord.parse(await privateRequest(`/api/v1/admin/channels/${code}/settings/${key}`,'PUT',body));if(r.code!==code||r.version!==body.expected_version+1||JSON.stringify(r.content)!==JSON.stringify(channelConfig.parse(body.content)))throw Error('result_unknown');return r},
 async listings(code:ChannelCode){return z.object({items:z.array(listingRecord),skus:z.array(choices)}).parse(await privateRequest(`/api/v1/admin/channels/${code}/listings`))},
 async saveListing(code:ChannelCode,id:string,key:string,body:{expected_version:number;content:ChannelListing;reason:string}){const r=listingRecord.parse(await privateRequest(`/api/v1/admin/channels/${code}/listings/${id}/commands/${key}`,'PUT',body));if(r.id!==id||r.channel!==code||r.version!==body.expected_version+1||r.sku_id!==body.content.sku_id||JSON.stringify(r.content)!==JSON.stringify(listingContent.parse(body.content)))throw Error('result_unknown');return r},
 async preview(code:ChannelCode,id:string){const r=plan.parse(await privateRequest(`/api/v1/admin/channels/${code}/listings/${id}/preview`));if(r.listing_id!==id||r.channel!==code||r.ready!==(r.issues.length===0))throw Error('result_unknown');return r},
 async sync(code:ChannelCode,id:string,key:string,fingerprint:string){const r=operation.parse(await privateRequest(`/api/v1/admin/channels/${code}/listings/${id}/sync/${key}`,'PUT',{fingerprint,confirmed:true}));if(r.id!==key||r.listing_id!==id)throw Error('result_unknown');return r},
 async activity(code:ChannelCode){return activity.parse(await privateRequest(`/api/v1/admin/channels/${code}/activity`))},
 async connection(code:ChannelCode){return z.object({connected:z.literal(true),vendor_id:positive,identifier:z.string(),title:z.string()}).parse(await privateRequest(`/api/v1/admin/channels/${code}/connection`,'POST'))},
 async references(code:ChannelCode){return z.object({categories:z.array(z.object({id:positive,title:z.string()})),products:z.array(z.object({id:positive,title:z.string(),sku:z.string().nullable()}))}).parse(await privateRequest(`/api/v1/admin/channels/${code}/reference-data`,'POST'))},
 async category(code:ChannelCode,id:number){return z.object({category:z.unknown(),attributes:z.unknown()}).parse(await privateRequest(`/api/v1/admin/channels/${code}/category/${id}`,'POST'))},
 async reconcile(code:ChannelCode,id:string,external:number,reason:string){return privateRequest(`/api/v1/admin/channels/${code}/operations/${id}/reconcile`,'POST',{external_product_id:external,reason})},
 async webhook(code:ChannelCode){return privateRequest(`/api/v1/admin/channels/${code}/webhook-registration`,'POST')},
};
