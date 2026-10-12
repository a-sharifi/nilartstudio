import type { paths } from "./schema";

export type CatalogCollectionPage = paths["/api/v1/catalog/collections"]["get"]["responses"][200]["content"]["application/json"];
export type CatalogProductPage = paths["/api/v1/catalog/products"]["get"]["responses"][200]["content"]["application/json"];

export async function getCollections(signal?: AbortSignal): Promise<CatalogCollectionPage> {
  const response = await fetch("/api/v1/catalog/collections", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("catalog_unavailable");
  return response.json() as Promise<CatalogCollectionPage>;
}
