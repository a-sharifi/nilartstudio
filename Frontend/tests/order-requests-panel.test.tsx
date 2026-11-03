import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,beforeEach,expect,test,vi} from "vitest"
import OrderRequestsPanel from "../src/features/customer/OrderRequestsPanel"
import {ordersApi,orderRequestsApi,type CustomerOrder,type OrderRequest} from "../src/features/customer/orders-api"
vi.mock("../src/features/customer/orders-api",()=>({ordersApi:{detail:vi.fn()},orderRequestsApi:{submit:vi.fn(),detail:vi.fn(),list:vi.fn()}}))
const guard=vi.hoisted(()=>({current:null as null|(()=>boolean),register:(value:null|(()=>boolean))=>{guard.current=value}}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>guard.register}))
const id="00000000-0000-4000-8000-000000000001"
const order:CustomerOrder={id,version:0,created_at:"2026-10-13T12:00:00Z",updated_at:"2026-10-13T12:00:00Z",snapshot:{reference:"TEST-ORDER",currency:"IRT",items:[],shipping_amount:"0",tax_amount:"0",total_amount:"200",recipient:"",address:"",receipt:null},state:{payment:"paid",fulfillment:"unshipped",delivered:{},return_until:null,refunded_amount:"0"}}
const saved:OrderRequest={version:0,public_reply:"",id,order_id:id,kind:"cancellation",status:"submitted",payload:{reason:"Changed my plans",quantities:{}},created_at:order.created_at,updated_at:order.updated_at}
beforeEach(()=>{vi.mocked(ordersApi.detail).mockResolvedValue(order)})
afterEach(()=>{cleanup();vi.resetAllMocks()})
test("cancellation is confirmed as submitted without promising refunds",async()=>{vi.mocked(orderRequestsApi.submit).mockResolvedValue(saved);render(<OrderRequestsPanel path={`/en/account/orders/${id}/cancel`} navigate={vi.fn()} canWrite/>);fireEvent.change(await screen.findByRole("textbox",{name:"Reason"}),{target:{value:"Changed my plans"}});fireEvent.click(screen.getByRole("button",{name:"Submit request"}));await screen.findByText("Submitted");expect(orderRequestsApi.submit).toHaveBeenCalledOnce();expect(screen.getByText(/Request status alone does not confirm a refund/)).toBeTruthy()})
test("unknown submission retains draft and reconciles saved request",async()=>{vi.mocked(orderRequestsApi.submit).mockRejectedValue(new Error("unknown"));vi.mocked(orderRequestsApi.detail).mockResolvedValue(saved);render(<OrderRequestsPanel path={`/en/account/orders/${id}/cancel`} navigate={vi.fn()} canWrite/>);const reason=await screen.findByRole("textbox",{name:"Reason"});fireEvent.change(reason,{target:{value:"Changed my plans"}});fireEvent.click(screen.getByRole("button",{name:"Submit request"}));await screen.findByRole("button",{name:"Check saved result"});expect((reason as HTMLTextAreaElement).value).toBe("Changed my plans");expect(screen.getByRole("button",{name:"Submit request"}).matches(":disabled")).toBe(true);fireEvent.click(screen.getByRole("button",{name:"Check saved result"}));await screen.findByText("Submitted");expect(orderRequestsApi.submit).toHaveBeenCalledOnce()})
test("read-only account cannot submit",async()=>{render(<OrderRequestsPanel path={`/en/account/orders/${id}/cancel`} navigate={vi.fn()} canWrite={false}/>);const reason=await screen.findByRole("textbox",{name:"Reason"});expect(reason.matches(":disabled")).toBe(true);expect(orderRequestsApi.submit).not.toHaveBeenCalled()})
test("return requires an explicit deadline",async()=>{render(<OrderRequestsPanel path={`/en/account/orders/${id}/return`} navigate={vi.fn()} canWrite/>);await screen.findByText("This order is currently ineligible for this request.");expect(screen.getByRole("button",{name:"Submit request"}).matches(":disabled")).toBe(true)})
test("history displays confirmed server status",async()=>{vi.mocked(orderRequestsApi.list).mockResolvedValue({items:[{...saved,status:"in_review"}],next_cursor:null});render(<OrderRequestsPanel path="/en/account/requests" navigate={vi.fn()} canWrite/>);await screen.findByText("Under review",{selector:"p"});expect(ordersApi.detail).not.toHaveBeenCalled()})

test("history shows recorded staff reply as text",async()=>{vi.mocked(orderRequestsApi.list).mockResolvedValue({items:[{...saved,status:"approved",version:2,public_reply:"Approved for processing <script>unsafe</script>"}],next_cursor:null});render(<OrderRequestsPanel path="/en/account/requests" navigate={vi.fn()} canWrite/>);await screen.findByRole("region",{name:"Staff reply"});expect(screen.getByText("Approved for processing <script>unsafe</script>")).toBeTruthy();expect(document.querySelector("script")).toBeNull()})
test("request history search applies full-history filters and can clear",async()=>{vi.mocked(orderRequestsApi.list).mockResolvedValue({items:[],next_cursor:null});render(<OrderRequestsPanel path="/en/account/requests" navigate={vi.fn()} canWrite/>);await screen.findByText("No requests yet.");fireEvent.change(screen.getByRole("searchbox"),{target:{value:" plans "}});fireEvent.click(screen.getByRole("button",{name:"Search"}));await screen.findByText("No matching requests.");expect(orderRequestsApi.list).toHaveBeenLastCalledWith(undefined,{q:"plans",kind:undefined,status:undefined});fireEvent.change(screen.getByRole("combobox",{name:"Request type"}),{target:{value:"return"}});await screen.findByText("No matching requests.");expect(orderRequestsApi.list).toHaveBeenLastCalledWith(undefined,{q:"plans",kind:"return",status:undefined});fireEvent.click(screen.getByRole("button",{name:"Clear filters"}));await screen.findByText("No requests yet.")})
test("failed request search retains query without claiming empty history",async()=>{vi.mocked(orderRequestsApi.list).mockResolvedValueOnce({items:[saved],next_cursor:null}).mockRejectedValueOnce(new Error("offline")).mockResolvedValue({items:[],next_cursor:null});render(<OrderRequestsPanel path="/en/account/requests" navigate={vi.fn()} canWrite/>);await screen.findByText("Changed my plans");fireEvent.change(screen.getByRole("searchbox"),{target:{value:"missing"}});fireEvent.click(screen.getByRole("button",{name:"Search"}));await screen.findByRole("alert");expect(screen.queryByText("No matching requests.")).toBeNull();fireEvent.click(screen.getByRole("button",{name:"Try again"}));await screen.findByText("No matching requests.");expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("missing")})

test("pending request blocks navigation and browser unload then unlocks on confirmation",async()=>{
 let resolve!:(value:OrderRequest)=>void
 vi.mocked(orderRequestsApi.submit).mockImplementation(()=>new Promise(done=>{resolve=done}))
 render(<OrderRequestsPanel path={`/en/account/orders/${id}/cancel`} navigate={vi.fn()} canWrite/>)
 fireEvent.change(await screen.findByRole("textbox",{name:"Reason"}),{target:{value:"Changed my plans"}})
 fireEvent.click(screen.getByRole("button",{name:"Submit request"}))
 await screen.findByText("Saving or checking the result; please wait.")
 expect(guard.current?.()).toBe(false)
 const event=new Event("beforeunload",{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true)
 await act(async()=>resolve(saved))
 expect(guard.current?.()).toBe(true)
})
test("active order requests block another submission and link to tracking",async()=>{
 vi.mocked(ordersApi.detail).mockResolvedValue({...order,active_request_id:id})
 render(<OrderRequestsPanel path={`/en/account/orders/${id}/cancel`} navigate={vi.fn()} canWrite/>)
 await screen.findByText("This order already has an active request.")
 expect(screen.getByRole("link",{name:"Track existing request"}).getAttribute("href")).toBe(`/en/account/requests/${id}`)
 expect(screen.getByRole("button",{name:"Submit request"}).matches(":disabled")).toBe(true)
})
test("return form stays disabled if available quantities were not returned",async()=>{
 vi.mocked(ordersApi.detail).mockResolvedValue({...order,state:{...order.state,fulfillment:"delivered",return_until:"2099-01-01T00:00:00Z"}})
 render(<OrderRequestsPanel path={`/en/account/orders/${id}/return`} navigate={vi.fn()} canWrite/>)
 await screen.findByText("Available return quantities were not loaded; refresh the order.")
 expect(screen.getByRole("button",{name:"Submit request"}).matches(":disabled")).toBe(true)
})
