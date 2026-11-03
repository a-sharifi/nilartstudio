import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import ShopPage from "../src/design/ShopPage"
import { mapCollection, mapProduct } from "../src/features/catalog/adapter"

afterEach(() => { cleanup(); vi.clearAllMocks() })
const collections = [mapCollection({ id: "c1", slug: "art", title_fa: "هنر", title_en: "Art" })]
const items = [mapProduct({ id: "p1", slug: "real", title_fa: "محصول", title_en: "Real product", collection_ids: ["c1"] }, collections)]
const props = { liveCatalog: { collections, categories: [], items }, liveStatus: "normal", page: "/en/shop", search: "", language: 1 as const, onRetry: vi.fn(), onNavigate: vi.fn(), onQueryChange: vi.fn(), signedIn: false, favorites: [], onFavorite: vi.fn(), renderMedia: () => null, renderSheet: () => null, arrow: null, heart: null }

test("reference shop renders published products without SKU, price or stock guesses", () => {
  const { container } = render(<ShopPage {...props} />)
  expect(container.querySelector(".shop-grid")).toBeTruthy()
  expect(screen.getByRole("heading", { name: "Real product" })).toBeTruthy()
  expect(container.querySelector(".stock-badge")).toBeNull()
  expect(screen.queryByText(/Sample mockup/)).toBeNull()
  expect(screen.queryByRole("button", { name: /favorite/i })).toBeNull()
  fireEvent.click(screen.getByRole("combobox", { name: "Collection" }))
  fireEvent.click(screen.getByRole("option", { name: "Art" }))
  expect(props.onQueryChange).toHaveBeenCalledWith("collection=art")
})

test("native network state retries the API, and stock filters exclude unconfirmed items", () => {
  const view = render(<ShopPage {...props} liveStatus="error" />)
  fireEvent.click(screen.getByRole("button", { name: "Retry" }))
  expect(props.onRetry).toHaveBeenCalled()
  view.rerender(<ShopPage {...props} search="stock=1" />)
  expect(screen.queryByRole("heading", { name: "Real product" })).toBeNull()
})

test("bookmarked collection filters survive catalogue loading and retry", () => {
  const onQueryChange = vi.fn()
  const view = render(<ShopPage {...props} liveCatalog={{ collections: [], categories: [], items: [] }} liveStatus="loading" search="?collection=art&page=2" onQueryChange={onQueryChange} />)
  expect(onQueryChange).not.toHaveBeenCalled()
  view.rerender(<ShopPage {...props} liveCatalog={{ collections: [], categories: [], items: [] }} liveStatus="error" search="?collection=art&page=2" onQueryChange={onQueryChange} />)
  expect(onQueryChange).not.toHaveBeenCalled()
  view.rerender(<ShopPage {...props} search="?collection=art&page=2" onQueryChange={onQueryChange} />)
  expect(screen.getByRole("heading", { name: "Real product" })).toBeTruthy()
  expect(onQueryChange).toHaveBeenCalledWith("collection=art", true)
})

test('legacy and localized search routes show matching live products', async()=>{
 const {isShopRoute}=await import('../src/design/shop');
 const {isApplicationRoute}=await import('../src/features/system/routes');
 for(const path of ['/search','/fa/search','/en/search'])expect(isApplicationRoute(path)).toBe(true);
 for(const path of ['/search','/fa/search','/en/search'])expect(isShopRoute(path)).toBe(true);
 const notebooks=[mapProduct({id:'n1',slug:'notebook',title_fa:'دفتر طراحی گربه',title_en:'Cat sketchbook'}),mapProduct({id:'n2',slug:'bookmark',title_fa:'نشانک',title_en:'Bookmark'})];
 render(<ShopPage {...props} page="/search" language={0} search="?q=دفتر" liveCatalog={{collections:[],categories:[],items:notebooks}}/>);
 expect(screen.getByRole('heading',{name:'دفتر طراحی گربه'})).toBeTruthy();
 expect(screen.queryByRole('heading',{name:'نشانک'})).toBeNull();
});
test('search normalizes Arabic letters, accents and word order',async()=>{
 const {shopResults,parseShopQuery}=await import('../src/design/shop');
 const product=mapProduct({id:'n1',slug:'notebook',title_fa:'دفتر طراحی — گربه',title_en:'Cat sketchbook'});
 const catalog={collections:[],categories:[],items:[product]};
 expect(shopResults('',parseShopQuery('?q=گربه دَفتر'), 'normal',catalog.items,catalog)).toHaveLength(1);
 product.name=['دفتر خط‌دار کیانا','Ruled notebook'];
 expect(shopResults('',parseShopQuery('?q=كيانا خط دار'), 'normal',catalog.items,catalog)).toHaveLength(1);
});
