import { useEffect, useState } from "react";
export type PublishedBundle = {
 id: string; slug: string; title_fa: string; title_en: string;
 description_fa: string; description_en: string;
 components: { sku_id: string; code: string; quantity: number; title_fa: string; title_en: string }[];
};
export type BundleCatalog = { items: PublishedBundle[]; status: "loading" | "normal" | "error" | "not-found"; retry: () => void };
export function mapBundle(value: unknown): PublishedBundle {
 if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid bundle");
 const row = value as Record<string, unknown>;
 for (const key of ["id", "slug", "title_fa", "title_en", "description_fa", "description_en"]) if (typeof row[key] !== "string") throw Error("Invalid bundle");
 if (!row.id || !row.slug || !Array.isArray(row.components)) throw Error("Invalid bundle identity/components");
 const seen = new Set<string>();
 for (const part of row.components) {
  if (!part || typeof part !== "object" || !Number.isSafeInteger(part.quantity) || part.quantity <= 0 || [part.sku_id, part.code, part.title_fa, part.title_en].some(value => typeof value !== "string") || !part.sku_id || !part.code || seen.has(part.sku_id)) throw Error("Invalid bundle component");
  seen.add(part.sku_id);
 }
 return row as PublishedBundle;
}
export function useBundleCatalog(enabled: boolean, slug?: string): BundleCatalog {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ key?: string; items: PublishedBundle[]; status: BundleCatalog["status"] }>({ items: [], status: "loading" })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      setState({ key: slug, items: [], status: "error" })
    }, 15000)
    void (async () => {
      const items: PublishedBundle[] = []
      for (let page = 1; page <= 100; page++) {
        const response = await fetch(`/api/v1/catalog/bundles${slug ? `/${encodeURIComponent(slug)}` : `?page=${page}&page_size=100`}`, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } })
        if (response.status === 404 && slug) {
          if (!controller.signal.aborted) setState({ key: slug, items: [], status: "not-found" })
          return
        }
        if (!response.ok) throw new Error("Bundle catalog unavailable")
        const result: unknown = await response.json()
        const list = !slug && result && typeof result === "object" ? result as Record<string, unknown> : null
        const rows = slug ? [result] : list?.items
        if (!Array.isArray(rows) || (list && (!Number.isSafeInteger(list.total) || Number(list.total) < 0))) throw new Error("Invalid bundle page")
        items.push(...rows.map(mapBundle))
        if (slug || items.length >= Number(list?.total) || rows.length < 100) {
          if (!controller.signal.aborted) setState({ key: slug, items: [...new Map(items.map(item => [item.id, item])).values()], status: "normal" })
          return
        }
      }
      throw new Error("Bundle pagination limit exceeded")
    })().catch(() => {
      if (!controller.signal.aborted) setState({ key: slug, items: [], status: "error" })
    }).finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort() }
  }, [enabled, slug, revision])
  return { ...(state.key === slug ? state : { items: [], status: "loading" as const }), retry: () => { setState({ key: slug, items: [], status: "loading" }); setRevision(value => value + 1) } }
}
