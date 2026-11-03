import {act,fireEvent,render,screen,waitFor,cleanup} from "@testing-library/react"
import {afterEach,beforeEach,expect,it,vi} from "vitest"
import PriceHistory from "../src/features/admin/PriceHistory"
import {adminCatalogApi} from "../src/features/admin/catalog-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/catalog-api",()=>({adminCatalogApi:{priceHistory:vi.fn()}}))
const id="00000000-0000-4000-8000-000000000001",product="00000000-0000-4000-8000-000000000002"
const record={sku_id:id,product_id:product,code:"BOOK",version:1,price:null}
const row={id,sku_id:id,product_id:product,actor_id:product,previous_version:0,version:1,created_at:"2026-10-13T12:00:00Z",before:{price:null},after:{price:{amount:"100.123456",currency:"IRR" as const}}}
beforeEach(()=>vi.resetAllMocks())
afterEach(cleanup)
it("preserves exact prices and clears history when the session changes",async()=>{
 vi.mocked(adminCatalogApi.priceHistory).mockResolvedValue({items:[row],next_before_version:null})
 render(<PriceHistory record={record} en/>)
 fireEvent.click(screen.getByRole("button",{name:"Load price history"}))
 await screen.findByText("100.123456 IRR")
 act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()))
 expect(screen.queryByText("100.123456 IRR")).toBeNull()
})
it("loads the exclusive older cursor and retries failed reads",async()=>{
 vi.mocked(adminCatalogApi.priceHistory).mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce({items:[row],next_before_version:1}).mockResolvedValueOnce({items:[],next_before_version:null})
 render(<PriceHistory record={record} en/>)
 fireEvent.click(screen.getByRole("button",{name:"Load price history"}))
 await screen.findByText("Unable to load price history.")
 fireEvent.click(screen.getByRole("button",{name:"Load price history"}))
 await screen.findByText("100.123456 IRR")
 fireEvent.click(screen.getByRole("button",{name:"Older price history"}))
 await waitFor(()=>expect(adminCatalogApi.priceHistory).toHaveBeenLastCalledWith(id,product,1))
})
