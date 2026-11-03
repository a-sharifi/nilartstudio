import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,beforeEach,expect,it,vi} from "vitest"
import OrderTrackingPage from "../src/features/customer/OrderTrackingPage"
import {ordersApi,type CustomerOrder} from "../src/features/customer/orders-api"
const auth=vi.hoisted(()=>({status:"denied",access:null as null|{owner:string;permissions:string[]}}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>auth}))
vi.mock("../src/features/customer/orders-api",()=>({ordersApi:{list:vi.fn()}}))
const item:CustomerOrder={id:"00000000-0000-4000-8000-000000000001",version:0,created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",snapshot:{reference:"OWN-ORDER",currency:"IRT",items:[],shipping_amount:"0",tax_amount:"0",total_amount:"100",recipient:"Customer",address:"Private address",receipt:null},state:{payment:"paid",fulfillment:"shipped",delivered:{},return_until:null,refunded_amount:"0"}}
beforeEach(()=>{auth.status="denied";auth.access=null})
afterEach(()=>{cleanup();vi.resetAllMocks()})
it("requires sign in before requesting any order data",()=>{render(<OrderTrackingPage language={1}/>);expect(ordersApi.list).not.toHaveBeenCalled();expect(screen.getByRole("link",{name:"Sign in to track an order"}).getAttribute("href")).toContain("returnTo=%2Fen%2Ftrack-order")})
it("uses the independent orders permission",()=>{auth.status="ready";auth.access={owner:"a",permissions:["account.read_self"]};render(<OrderTrackingPage language={1}/>);expect(ordersApi.list).not.toHaveBeenCalled()})
it("searches authoritative owned orders and links to shipment details",async()=>{auth.status="ready";auth.access={owner:"a",permissions:["orders.read_self"]};vi.mocked(ordersApi.list).mockResolvedValue({items:[item],next_cursor:null});render(<OrderTrackingPage language={1}/>);await screen.findByText("OWN-ORDER");expect(screen.getByRole("link",{name:"Order details and shipment tracking"}).getAttribute("href")).toBe(`/en/account/orders/${item.id}`);fireEvent.change(screen.getByRole("searchbox"),{target:{value:"OWN"}});fireEvent.click(screen.getByRole("button",{name:"Search"}));expect(ordersApi.list).toHaveBeenLastCalledWith(undefined,{q:"OWN"});expect(screen.queryByText("Private address")).toBeNull()})
it("hides previous orders immediately after access revocation",async()=>{auth.status="ready";auth.access={owner:"a",permissions:["orders.read_self"]};vi.mocked(ordersApi.list).mockResolvedValue({items:[item],next_cursor:null});const {rerender}=render(<OrderTrackingPage language={1}/>);await screen.findByText("OWN-ORDER");auth.status="denied";auth.access=null;rerender(<OrderTrackingPage language={1}/>);expect(screen.queryByText("OWN-ORDER")).toBeNull()})
