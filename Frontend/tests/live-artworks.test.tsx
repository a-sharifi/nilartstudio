import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import LiveArtworksPage from "../src/features/catalog/LiveArtworksPage"
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
test("live gallery shows published API titles without demo sales data", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: "a", slug: "real", title_fa: "هنر", title_en: "Real art", description_fa: "", description_en: "Description" }], total: 1 }) }))
  render(<LiveArtworksPage language={1} navigate={vi.fn()} />)
  expect(await screen.findByRole("heading", { name: "Real art" })).toBeTruthy()
  expect(screen.getByText("Purchase details unconfirmed")).toBeTruthy()
  expect(screen.queryByText("Quiet morning")).toBeNull()
})
test("live artwork missing detail is distinct from empty gallery", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }))
  render(<LiveArtworksPage language={1} slug="missing" navigate={vi.fn()} />)
  expect(await screen.findByText("Artwork not found.")).toBeTruthy()
})
