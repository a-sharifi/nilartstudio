import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import CollectionDetailPage from "../src/design/CollectionDetailPage"
import { mapCollection, mapProduct } from "../src/features/catalog/adapter"

afterEach(cleanup)
const collections = [mapCollection({id:"c1",slug:"art",title_fa:"هنر",title_en:"Art"})]
const products = [mapProduct({id:"p1",slug:"shared",title_fa:"مشترک",title_en:"Shared product",collection_ids:["c1"]},collections)]
const props = { collections, products, bundles: [], categories: [], demo:false, slug:"art", search:"", language:1 as const, mode:"normal", onNavigate:vi.fn(), onQueryChange:vi.fn(), onRetry:vi.fn(), favorites:[], signedIn:true, onFavorite:vi.fn(), renderMedia:()=>null, renderSheet:()=>null, arrow:null, heart:null }

test("live collection cards distinguish missing prices from stock and retain the locale",()=>{
 render(<CollectionDetailPage {...props}/> )
 expect(screen.getByText("Price unavailable")).toBeTruthy()
 expect(screen.queryByText(/Out of stock/)).toBeNull()
 expect(screen.queryByText(/Demo price|Design samples only|Sample copy/)).toBeNull()
 expect(screen.queryByRole("button",{name:/Favorite:/})).toBeNull()
 const link=screen.getByRole("link",{name:"View product"})
 expect(link.getAttribute("href")).toBe("/en/products/shared")
 fireEvent.click(link)
 expect(props.onNavigate).toHaveBeenCalledWith("Shared product","/en/products/shared")
})

test("reference collection retains its explicitly labeled demo behavior",()=>{
 render(<CollectionDetailPage {...props} demo/> )
 expect(screen.getByText("Demo price & availability")).toBeTruthy()
 expect(screen.getByText(/Design samples only/)).toBeTruthy()
 expect(screen.getByRole("link",{name:"View product"}).getAttribute("href")).toBe("/products/shared")
})
