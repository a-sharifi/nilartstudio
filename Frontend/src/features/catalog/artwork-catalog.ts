import { useEffect, useState } from "react"
import type { GalleryWork } from "../../design/ArtworksPage"

export type ArtworkRecord = {
  id: string
  slug: string
  title_fa: string
  title_en: string
  description_fa: string
  description_en: string
}
export type ArtworkCatalog = { items: GalleryWork[]; status: "loading" | "normal" | "error" | "not-found"; retry: () => void }

export function mapArtwork(value: unknown): GalleryWork {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid artwork")
  const row = value as Record<string, unknown>
  for (const key of ["id", "slug", "title_fa", "title_en", "description_fa", "description_en"]) {
    if (typeof row[key] !== "string") throw new Error("Invalid artwork")
  }
  if (!row.id || !row.slug) throw new Error("Invalid artwork identity")
  const record = row as ArtworkRecord
  return {
    id: record.slug, title: [record.title_fa, record.title_en], catalogRecord: record,
    medium: "", style: "", width: null, height: null, price: null,
    status: "unavailable", unique: false, palette: 0,
  }
}

export function useArtworkCatalog(enabled: boolean, slug?: string): ArtworkCatalog {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{ key?: string; items: GalleryWork[]; status: ArtworkCatalog["status"] }>({ items: [], status: "loading" })
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
      setState({ key: slug, items: [], status: "error" })
    }, 15000)
    void (async () => {
      const items: GalleryWork[] = []
      for (let page = 1; page <= 100; page++) {
        const response = await fetch(`/api/v1/catalog/artworks${slug ? `/${encodeURIComponent(slug)}` : `?page=${page}&page_size=100`}`, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } })
        if (response.status === 404 && slug) {
          if (!controller.signal.aborted) setState({ key: slug, items: [], status: "not-found" })
          return
        }
        if (!response.ok) throw new Error("Artwork catalog unavailable")
        const result: unknown = await response.json()
        const list = !slug && result && typeof result === "object" ? result as Record<string, unknown> : null
        const rows = slug ? [result] : list?.items
        if (!Array.isArray(rows) || (list && (!Number.isSafeInteger(list.total) || Number(list.total) < 0))) throw new Error("Invalid artwork page")
        items.push(...rows.map(mapArtwork))
        if (slug || items.length >= Number(list?.total) || rows.length < 100) {
          if (!controller.signal.aborted) setState({ key: slug, items: [...new Map(items.map(item => [item.id, item])).values()], status: "normal" })
          return
        }
      }
      throw new Error("Artwork pagination limit exceeded")
    })().catch(() => {
      if (!controller.signal.aborted) setState({ key: slug, items: [], status: "error" })
    }).finally(() => clearTimeout(timeout))
    return () => { clearTimeout(timeout); controller.abort() }
  }, [enabled, slug, revision])
  return { ...(state.key === slug ? state : { items: [], status: "loading" as const }), retry: () => { setState({ key: slug, items: [], status: "loading" }); setRevision(value => value + 1) } }
}
