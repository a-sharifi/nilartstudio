import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import ArtworksPage from "../src/design/ArtworksPage"
import ArtworkDetailPage from "../src/design/ArtworkDetailPage"
import { mapArtwork, useArtworkCatalog } from "../src/features/catalog/artwork-catalog"

beforeEach(() => {
  HTMLDialogElement.prototype.close = vi.fn()
  HTMLDialogElement.prototype.showModal = vi.fn()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); window.history.replaceState({}, "", "/") })
const record = { id: "a", slug: "real", title_fa: "هنر", title_en: "Real art", description_fa: "شرح", description_en: "Description" }
const navigate = vi.fn()
function Gallery() {
  const catalog = useArtworkCatalog(true)
  return <ArtworksPage language={1} signedIn={false} onNavigate={navigate} catalog={catalog} />
}
function Detail({ slug = "real" }: { slug?: string }) {
  const catalog = useArtworkCatalog(true, slug)
  return <ArtworkDetailPage slug={slug} language={1} signedIn={true} cartIds={[]} favorites={[]} onFavorite={vi.fn()} onAdd={vi.fn()} onNavigate={navigate} onBack={vi.fn()} catalog={catalog} />
}
const response = (value: unknown) => ({ ok: true, json: async () => value })

test("native gallery uses API cards without fixture images, artist, price or availability", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ items: [record], total: 1 })))
  const { container } = render(<Gallery />)
  expect(await screen.findByRole("heading", { name: "Real art" })).toBeTruthy()
  expect(container.querySelector(".art-layout")).toBeTruthy()
  expect(container.querySelector(".art-card")).toBeTruthy()
  expect(screen.getByText("Price not listed")).toBeTruthy()
  expect(screen.getByText("Availability unconfirmed")).toBeTruthy()
  expect(screen.queryByText("Quiet morning")).toBeNull()
  expect(container.querySelector(".demo-painting")).toBeNull()
  expect(screen.queryByRole("button", { name: /favorites/i })).toBeNull()
  fireEvent.click(screen.getByRole("link", { name: "View artwork" }))
  expect(navigate).toHaveBeenCalledWith("View artwork", "/en/artworks/real")
})

test("native detail keeps its gallery, specifications and disabled purchasing with unknown metadata", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(record)))
  const { container } = render(<Detail />)
  expect(await screen.findByRole("heading", { name: "Real art" })).toBeTruthy()
  expect(container.querySelector(".ad-layout")).toBeTruthy()
  expect(container.querySelector(".ad-summary")?.textContent).toBe("Description")
  expect(container.querySelector(".ad-spec-table")).toBeTruthy()
  expect(screen.getByText("Availability unconfirmed")).toBeTruthy()
  expect(screen.getByRole("button", { name: "Add to basket" }).hasAttribute("disabled")).toBe(true)
  expect(screen.getByRole("button", { name: /Save to favorites/ }).hasAttribute("disabled")).toBe(true)
  expect(container.querySelector(".demo-painting")).toBeNull()
  expect(container.querySelector(".ad-frame-options")).toBeNull()
  expect(screen.queryByText(/By Demo artist|Canvas — demo|Original painting — demo/)).toBeNull()
})

test("missing published detail and request failure use distinct native states and retry", async () => {
  const artFetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }).mockResolvedValueOnce({ ok: false, status: 404 })
  const fetch = vi.fn((url:string)=>String(url).includes("/basket")?Promise.resolve({ok:false,status:503,json:async()=>({})}):artFetch())
  vi.stubGlobal("fetch", fetch)
  render(<Detail slug="missing" />)
  expect(await screen.findByRole("heading", { name: "Unable to load the artwork." })).toBeTruthy()
  fireEvent.click(screen.getByRole("button", { name: "Try again" }))
  expect(await screen.findByRole("heading", { name: "Artwork not found" })).toBeTruthy()
  expect(artFetch).toHaveBeenCalledTimes(2)
})

test("unpublished empty gallery and malformed response do not fall back to fixtures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ items: [], total: 0 })))
  render(<Gallery />)
  expect(await screen.findByRole("heading", { name: "No artworks have been published yet." })).toBeTruthy()
  cleanup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ items: [{ ...record, title_en: null }], total: 1 })))
  render(<Gallery />)
  expect(await screen.findByRole("heading", { name: "Unable to load artworks." })).toBeTruthy()
  expect(screen.queryByText("Quiet morning")).toBeNull()
})

test("presentation mapping ignores uncontracted commercial and specification fields", () => {
  const item = mapArtwork({ ...record, price: 123, stock: 3, width: 40, medium: "oil", image_url: "/unapproved.png" })
  expect(item).toMatchObject({ id: "real", width: null, height: null, price: null, medium: "", status: "unavailable", unique: false })
  expect(() => mapArtwork({ ...record, slug: "" })).toThrow()
})

test("persisted sample metadata supplies stock, price and specifications without guessing missing fields",()=>{
 const details={artist_fa:"نیلوفر مرادی",artist_en:"Niloufar Moradi",medium:"colored-pencil",style:"landscape",width_cm:30,height_cm:40,price_amount:"3900000",currency:"IRT",stock:1,image_url:"/sample-artworks/afternoon.jpg",image_credit:"Museum sample",image_source:"https://www.metmuseum.org/art/collection/search/436535",sample:true}
 const work=mapArtwork({...record,details})
 expect(work.status).toBe("available")
 expect(work.price).toBe(3900000)
 expect(work.medium).toBe("colored-pencil")
 expect(work.width).toBe(30)
 expect(mapArtwork({...record,details:{...details,stock:0}}).status).toBe("unavailable")
 expect(()=>mapArtwork({...record,details:{...details,stock:-1}})).toThrow()
 expect(()=>mapArtwork({...record,details:{...details,image_url:"https://foreign.example/image.jpg"}})).toThrow()
})
