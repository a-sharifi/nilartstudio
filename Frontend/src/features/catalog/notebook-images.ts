import {z} from 'zod';
export const notebookSpec=z.object({design:z.string(),title_fa:z.string(),title_en:z.string(),group:z.enum(['collection','personal']),notebook_type:z.enum(['notebook','sketchbook']),size:z.enum(['A3','A4','A5','A6']),paper:z.enum(['writing-paper','kraft-dark-70gsm','kraft-coffee-100gsm','drawing-cream-110gsm','drawing-cream-127gsm']),sheets:z.union([z.literal(40),z.literal(80)]),binding:z.enum(['top','side'])});
export type NotebookSpec=z.infer<typeof notebookSpec>;
export const paperNames:Record<NotebookSpec['paper'],[string,string]>={'writing-paper':['تحریر سفید','White writing paper'],'kraft-dark-70gsm':['کرافت تیره ۷۰ گرم','Dark kraft · 70 gsm'],'kraft-coffee-100gsm':['کرافت نسکافه‌ای ۱۰۰ گرم','Coffee kraft · 100 gsm'],'drawing-cream-110gsm':['نخودی ۱۱۰ گرم','Cream · 110 gsm'],'drawing-cream-127gsm':['نخودی ۱۲۷ گرم','Cream · 127 gsm']};
export const imageSet=z.object({id:z.string().uuid(),key:z.string(),spec:notebookSpec,images:z.array(z.object({asset_id:z.string().uuid(),revision_id:z.string().uuid(),view:z.enum(['front','back','inside']),url:z.string().startsWith('/api/v1/media/'),alt_fa:z.string(),alt_en:z.string()})).min(2).max(3),product_id:z.string().uuid().nullable(),sku_id:z.string().uuid().nullable(),product_slug:z.string().nullable(),preview_only:z.boolean()});
export type NotebookImageSet=z.infer<typeof imageSet>;
export const imageSetPage=z.object({items:z.array(imageSet),next_cursor:z.string().nullable()});
export const NOTEBOOK_SAMPLE_EVENT='nilart:notebook-sample';
export function selectNotebookSample(sample:NotebookImageSet){window.dispatchEvent(new CustomEvent(NOTEBOOK_SAMPLE_EVENT,{detail:sample}));}
