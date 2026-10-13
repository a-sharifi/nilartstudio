import { z } from "zod";
import { useEffect, useState } from "react";
export type PublishedSKU = { id: string; product_id: string; code: string; price: {amount: string; currency: "IRT" | "IRR"} | null };
const copy = z.object({fa:z.string().min(1),en:z.string().min(1)});
const presentationSchema = z.object({
 intro:copy,about:copy,kind:z.enum(["book","bookmark","stickers"]),color:z.enum(["sage","lilac","sand","rose","blue"]),
 gallery:z.array(z.object({label:copy,view:z.enum(["front","back","inside","detail"])})).min(1).max(10),
 option_labels:z.record(z.string(),copy).optional(),
 specifications:z.array(z.object({label:copy,value:copy})).max(20),delivery:copy,
});
export type ProductPresentation = z.infer<typeof presentationSchema>;
export type PublishedProduct = { id: string; slug: string; title_fa: string; title_en: string; description_fa: string; description_en: string; collection_ids: string[]; category_ids: string[]; presentation?: ProductPresentation | null };
export type ProductDetail = { product: PublishedProduct | null; skus: PublishedSKU[]; status: "loading" | "normal" | "error" | "not-found"; retry: () => void };
export function mapPublishedProduct(value: unknown): PublishedProduct {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid product");
  const row = value as Record<string, unknown>;
  for (const key of ["id","slug","title_fa","title_en","description_fa","description_en"]) if (typeof row[key] !== "string") throw Error("Invalid product");
  if (!row.id || !row.slug) throw Error("Invalid product identity");
  for (const key of ["collection_ids","category_ids"]) if (!Array.isArray(row[key]) || (row[key] as unknown[]).some(id=>typeof id !== "string" || !id)) throw Error("Invalid memberships");
  if (row.presentation != null) presentationSchema.parse(row.presentation);
  return row as PublishedProduct;
}
export function mapPublishedSKUs(value: unknown, productId: string): PublishedSKU[] {
  if (!Array.isArray(value)) throw Error("Invalid SKU list");
  const ids = new Set<string>(); const codes = new Set<string>();
  for (const row of value) {
    if (!row || typeof row !== "object" || [row.id,row.code,row.product_id].some(value=>typeof value !== "string" || !value) || row.product_id !== productId || ids.has(row.id) || codes.has(row.code)) throw Error("Invalid SKU identity/ownership");
    ids.add(row.id); codes.add(row.code);
    if (row.price !== null && (!row.price || typeof row.price.amount !== "string" || !/^(?:0|[1-9]\d{0,17})(?:\.\d{1,6})?$/.test(row.price.amount) || !["IRT","IRR"].includes(row.price.currency))) throw Error("Invalid exact price");
  }
  return value as PublishedSKU[];
}
export function useProductDetail(enabled: boolean, slug?: string): ProductDetail {
  const [revision,setRevision] = useState(0);
  const [state,setState] = useState<{key?: string; product: PublishedProduct | null; skus: PublishedSKU[]; status: ProductDetail["status"]}>({product:null,skus:[],status:"loading"});
  useEffect(()=>{
    if (!enabled || !slug) return;
    const controller = new AbortController();
    const fail = () => setState({key:slug,product:null,skus:[],status:"error"});
    const timeout = setTimeout(()=>{controller.abort();fail()},15000);
    void (async()=>{
      const response = await fetch(`/api/v1/catalog/products/${encodeURIComponent(slug)}`, {cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});
      if (controller.signal.aborted) return;
      if (response.status === 404) {setState({key:slug,product:null,skus:[],status:"not-found"});return}
      if (!response.ok) throw Error("Product unavailable");
      const product = mapPublishedProduct(await response.json());
      if (controller.signal.aborted) return;
      const skuResponse = await fetch(`/api/v1/catalog/products/${encodeURIComponent(slug)}/skus`, {cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});
      if (skuResponse.status === 404) { if (!controller.signal.aborted) setState({key:slug,product:null,skus:[],status:"not-found"}); return }
      if (!skuResponse.ok) throw Error("SKUs unavailable");
      const skus = mapPublishedSKUs(await skuResponse.json(),product.id);
      if (!controller.signal.aborted) setState({key:slug,product,skus,status:"normal"});
    })().catch(()=>{if (!controller.signal.aborted) fail()}).finally(()=>clearTimeout(timeout));
    return ()=>{clearTimeout(timeout);controller.abort()};
  },[enabled,slug,revision]);
  return {...(state.key === slug ? state : {product:null,skus:[],status:"loading" as const}),retry:()=>{setState({key:slug,product:null,skus:[],status:"loading"});setRevision(value=>value+1)}};
}
