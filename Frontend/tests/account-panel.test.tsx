import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,beforeEach,expect,test,vi} from "vitest"
import AccountPanel from "../src/features/customer/AccountPanel"
import CustomerPages from "../src/features/customer/CustomerPages"
import {commissionsApi} from "../src/features/customer/commissions-api"
import {downloadsApi} from "../src/features/customer/downloads-api"
import {ordersApi} from "../src/features/customer/orders-api"
import {customerApi} from "../src/features/customer/api"
vi.mock("../src/features/customer/api",()=>({customerApi:{summary:vi.fn(),list:vi.fn(),remove:vi.fn(),save:vi.fn()}}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>()=>{}}))
const access=vi.hoisted(()=>({status:"ready",access:{permissions:["account.read_self","account.write_self"]}}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>access}))
beforeEach(()=>{
 vi.spyOn(downloadsApi,"list").mockResolvedValue({items:[],next_cursor:null})
 vi.spyOn(commissionsApi,"list").mockResolvedValue({items:[],next_cursor:null})
 vi.spyOn(ordersApi,"summary").mockResolvedValue({orders:7,awaiting_delivery:3,active_requests:2,available_files:4})
 access.access.permissions=["account.read_self","account.write_self"]
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","")}
 HTMLDialogElement.prototype.close=function(){this.removeAttribute("open")}
 vi.mocked(customerApi.summary).mockResolvedValue({favorites:2,addresses:1,tickets:3,unread_notifications:4})
 vi.mocked(customerApi.list).mockResolvedValue({items:[],next_cursor:null})
})
afterEach(()=>{cleanup();vi.resetAllMocks()})
test("dashboard uses confirmed counts and localized destinations without reference orders",async()=>{
 const navigate=vi.fn()
 render(<AccountPanel path="/fa/account" navigate={navigate}/>)
 await screen.findByRole("link",{name:/علاقه‌مندی‌ها/})
 await waitFor(()=>expect(document.querySelector(".dash-stats strong")?.textContent).toBe("۲"))
 fireEvent.click(screen.getByRole("link",{name:"کشف کالکشن‌ها"}))
 expect(navigate).toHaveBeenCalledWith("/fa/collections")
 expect(screen.queryByText("NA-24018")).toBeNull()
 expect(document.documentElement.dir).toBe("rtl")
})
test("failed dashboard read can be retried",async()=>{
 vi.mocked(customerApi.summary).mockRejectedValueOnce(new Error("offline"))
 render(<AccountPanel path="/en/account" navigate={vi.fn()}/>)
 await screen.findByRole("heading",{name:"Unable to load your account"})
 fireEvent.click(screen.getByRole("button",{name:"Try again"}))
 await waitFor(()=>expect(document.querySelector(".dash-stats strong")?.textContent).toBe("2"))
})
test("unavailable commerce keeps account navigation and makes no commerce claims",()=>{
 render(<AccountPanel path="/en/account/orders/test/receipt" navigate={vi.fn()}/>)
 expect(screen.getByRole("heading",{name:"This section is not available yet"})).toBeTruthy()
 expect(screen.getByRole("link",{name:"My orders"}).getAttribute("aria-current")).toBe("page")
 expect(customerApi.list).not.toHaveBeenCalled()
})
const favorite={id:"00000000-0000-4000-8000-000000000002",kind:"favorite" as const,version:1,data:{kind:"product",target_id:"internal-id"},created_at:"2026-10-13T10:00:00Z",updated_at:"2026-10-13T10:00:00Z",catalog:{slug:"cats",title_en:"Cats notebook",title_fa:"دفتر گربه‌ها"}}
test("favorites search published titles and preserve records on failed deletion",async()=>{
 vi.mocked(customerApi.list).mockResolvedValue({items:[favorite],next_cursor:null})
 vi.mocked(customerApi.remove).mockRejectedValue(new Error("result_unknown"))
 render(<CustomerPages path="/en/account/favorites" navigate={vi.fn()}/>)
 await screen.findByRole("heading",{name:"Cats notebook"})
 fireEvent.change(screen.getByRole("searchbox"),{target:{value:"cats"}})
 expect(screen.getByRole("heading",{name:"Cats notebook"})).toBeTruthy()
 fireEvent.click(screen.getByRole("button",{name:"Remove favorite"}))
 await screen.findByRole("alert")
 expect(screen.getByRole("heading",{name:"Cats notebook"})).toBeTruthy()
 expect((screen.getByRole("button",{name:"Remove favorite"}) as HTMLButtonElement).disabled).toBe(true)
})

test("dashboard shows recent authoritative orders only with order permission",async()=>{
 access.access.permissions.push("orders.read_self")
 vi.spyOn(ordersApi,"list").mockResolvedValue({items:[{id:"00000000-0000-4000-8000-000000000004",version:0,created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",snapshot:{reference:"CONFIRMED-ORDER",currency:"IRR",items:[],shipping_amount:"0",tax_amount:"0",total_amount:"210",recipient:"",address:"",receipt:null},state:{payment:"paid",fulfillment:"unshipped",delivered:{},return_until:null,refunded_amount:"0"}}],next_cursor:null})
 const navigate=vi.fn();render(<AccountPanel path="/en/account" navigate={navigate}/>);fireEvent.click(await screen.findByRole("link",{name:"CONFIRMED-ORDER"}));expect(navigate).toHaveBeenCalledWith("/en/account/orders/00000000-0000-4000-8000-000000000004");expect(screen.getByText("210 rial")).toBeTruthy()
})

test("dashboard activity uses recorded counts and workflow links",async()=>{access.access.permissions.push("orders.read_self");vi.spyOn(ordersApi,"list").mockResolvedValue({items:[],next_cursor:null});render(<AccountPanel path="/en/account" navigate={vi.fn()}/>);const region=await screen.findByRole("region",{name:"Your order activity"});expect(region.textContent).toContain("7Recorded orders");expect(region.textContent).toContain("3Paid orders awaiting delivery");expect(screen.getByRole("link",{name:/Available downloads/}).getAttribute("href")).toBe("/en/account/downloads")})
test("failed activity counts do not hide account summary and can retry",async()=>{access.access.permissions.push("orders.read_self");vi.mocked(ordersApi.summary).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({orders:1,awaiting_delivery:0,active_requests:0,available_files:0});vi.spyOn(ordersApi,"list").mockResolvedValue({items:[],next_cursor:null});render(<AccountPanel path="/en/account" navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole("button",{name:"Retry activity"}));await screen.findByRole("link",{name:/Recorded orders/});expect(screen.getAllByRole("link",{name:/Favorites/}).length).toBeGreaterThan(0)})
test("dashboard surfaces actual commissions awaiting customer review",async()=>{vi.mocked(commissionsApi.list).mockResolvedValue({items:[{id:"00000000-0000-4000-8000-000000000009",brief:{idea:"Private portrait",changes:"",style:"Oil",size:"40 cm",execution:"digital"},status:"awaiting_customer",version:1,agreement:"Accepted terms",revision_allowance:1,artwork:[],created_at:"2026-10-14T10:00:00Z",updated_at:"2026-10-14T11:00:00Z"}],next_cursor:null});render(<AccountPanel path="/en/account" navigate={vi.fn()}/>);await screen.findByText("Private portrait");expect(screen.getByRole("link",{name:"View version and give feedback"}).getAttribute("href")).toBe("/en/account/commissions/00000000-0000-4000-8000-000000000009/artwork-review");expect(commissionsApi.list).toHaveBeenCalledWith(undefined,"awaiting_customer")})
test("failed review list leaves account summary visible and offers retry",async()=>{vi.mocked(commissionsApi.list).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({items:[],next_cursor:null});render(<AccountPanel path="/en/account" navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole("button",{name:"Retry artworks"}));await screen.findByText("A piece, just for you");expect(screen.getAllByRole("link",{name:/Favorites/}).length).toBeGreaterThan(0)})

test("dashboard ready files link to their owned order library",async()=>{access.access.permissions.push("orders.read_self");vi.spyOn(ordersApi,"list").mockResolvedValue({items:[],next_cursor:null});const id="00000000-0000-4000-8000-000000000007";vi.mocked(downloadsApi.list).mockResolvedValue({items:[{id,order_id:id,line_id:id,file_name:"Ready.pdf",description:"Final artwork",size:8,sha256:"0".repeat(64),version:0,order_reference:"OWNED-ORDER",created_at:"2026-10-17T12:00:00Z",updated_at:"2026-10-17T12:00:00Z"}],next_cursor:null});render(<AccountPanel path="/en/account" navigate={vi.fn()}/>);await screen.findByRole("heading",{name:"Ready.pdf"});expect(screen.getByRole("link",{name:"View and download"}).getAttribute("href")).toBe(`/en/account/downloads?order=${id}`);expect(screen.getByText(/8 bytes/)).toBeTruthy()})
test("ready file failure retries independently from dashboard counts",async()=>{access.access.permissions.push("orders.read_self");vi.spyOn(ordersApi,"list").mockResolvedValue({items:[],next_cursor:null});vi.mocked(downloadsApi.list).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({items:[],next_cursor:null});render(<AccountPanel path="/en/account" navigate={vi.fn()}/>);fireEvent.click(await screen.findByRole("button",{name:"Retry files"}));await screen.findByText("You have no files ready to download.");expect(screen.getAllByRole("link",{name:/Favorites/}).length).toBeGreaterThan(0)})
