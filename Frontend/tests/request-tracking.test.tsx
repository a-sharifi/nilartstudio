import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,test,vi} from "vitest"
import RequestTrackingDetails from "../src/features/customer/RequestTrackingDetails"
import {requestTracking,type RequestTracking} from "../src/features/customer/orders-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/customer/orders-api",()=>({requestTracking:vi.fn()}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const id="00000000-0000-4000-8000-000000000001"
const value:RequestTracking={request_id:id,order_reference:"TEST-ORDER",items:[{id,title_fa:"دفتر",title_en:"Notebook",options_fa:"آبی",options_en:"Blue",quantity:1}],history:[{status:"submitted",reply:"",version:0,created_at:"2026-10-14T10:00:00Z"},{status:"in_review",reply:"Checking your request",version:1,created_at:"2026-10-14T11:00:00Z"},{status:"approved",reply:"Approved for processing",version:2,created_at:"2026-10-14T12:00:00Z"}]}
test("tracking renders stored return quantity and review replies",async()=>{vi.mocked(requestTracking).mockResolvedValue(value);render(<RequestTrackingDetails id={id} en/>);await screen.findByText("Notebook");expect(screen.getByText(/Quantity.*1/)).toBeTruthy();expect(screen.getByText("Review started")).toBeTruthy();expect(screen.getAllByText("Approved for processing")).toHaveLength(2);expect(screen.getByText("Checking your request")).toBeTruthy()})
test("failed history has explicit retry",async()=>{vi.mocked(requestTracking).mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(value);render(<RequestTrackingDetails id={id} en/>);fireEvent.click(await screen.findByRole("button",{name:"Retry history"}));await screen.findByText("Notebook");expect(requestTracking).toHaveBeenCalledTimes(2)})
test("Persian item and options use the recorded text",async()=>{vi.mocked(requestTracking).mockResolvedValue(value);render(<RequestTrackingDetails id={id} en={false}/>);await screen.findByText("دفتر");expect(screen.getByText(/آبی/)).toBeTruthy();expect(screen.getByText("شروع بررسی")).toBeTruthy()})
test("account switch clears private tracking and discards late response",async()=>{let resolve!:(value:RequestTracking)=>void;vi.mocked(requestTracking).mockReturnValue(new Promise(done=>{resolve=done}));render(<RequestTrackingDetails id={id} en/>);act(()=>{sessionLifecycle.authenticated(null,sessionLifecycle.capture())});await act(async()=>{resolve(value)});expect(screen.queryByText("Notebook")).toBeNull()})
