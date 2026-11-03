import {act,fireEvent,render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import OrderRelatedRequests from "../src/features/admin/OrderRelatedRequests"
import {orderReviewApi} from "../src/features/admin/order-review-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/order-review-api",()=>({orderReviewApi:{list:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const id="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002"
const item={id,order_id:id,version:0,kind:"cancellation" as const,status:"submitted" as const,public_reply:"",payload:{reason:"Private order request",quantities:{}},created_at:"2026-10-17T10:00:00Z",updated_at:"2026-10-17T10:00:00Z"}
it("rejects results from another order",async()=>{vi.mocked(orderReviewApi.list).mockResolvedValue({items:[{...item,order_id:other}],next_cursor:null});render(<OrderRelatedRequests orderId={id} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order requests"}));await screen.findByRole("alert");expect(screen.queryByText(item.payload.reason)).toBeNull()})
it("clears loaded requests with the session",async()=>{vi.mocked(orderReviewApi.list).mockResolvedValue({items:[item],next_cursor:null});render(<OrderRelatedRequests orderId={id} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order requests"}));await screen.findByText(item.payload.reason);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByText(item.payload.reason)).toBeNull()})
it("ignores late request lists after the session changes",async()=>{let finish!:(value:{items:typeof item[];next_cursor:null})=>void;vi.mocked(orderReviewApi.list).mockImplementation(()=>new Promise(resolve=>{finish=resolve}));render(<OrderRelatedRequests orderId={id} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order requests"}));act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>finish({items:[item],next_cursor:null}));expect(screen.queryByText(item.payload.reason)).toBeNull()})
