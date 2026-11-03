import {act,fireEvent,render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import RequestOrderContext from "../src/features/admin/RequestOrderContext"
import {adminOrdersApi} from "../src/features/admin/admin-orders-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
import {contextOrder} from "./order-context-fixture"
vi.mock("../src/features/admin/admin-orders-api",()=>({adminOrdersApi:{detail:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const id=contextOrder.id,line=contextOrder.snapshot.items[0].id
const request={id,order_id:id,version:0,kind:"return" as const,status:"submitted" as const,public_reply:"",created_at:contextOrder.created_at,updated_at:contextOrder.updated_at,payload:{reason:"One item damaged",quantities:{[line]:1}}}
const record=contextOrder as Awaited<ReturnType<typeof adminOrdersApi.detail>>
it("rejects unmatched requested lines instead of displaying unrelated items",async()=>{vi.mocked(adminOrdersApi.detail).mockResolvedValue({...record,snapshot:{...record.snapshot,items:[]}});render(<RequestOrderContext request={request} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order context"}));await screen.findByRole("alert");expect(screen.queryByText("Notebook")).toBeNull()})
it("clears loaded order context when the session changes",async()=>{vi.mocked(adminOrdersApi.detail).mockResolvedValue(record);render(<RequestOrderContext request={request} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order context"}));await screen.findByText("Notebook");act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByText("Notebook")).toBeNull()})
it("discards a late order response after session clearing",async()=>{let complete!:(value:typeof record)=>void;vi.mocked(adminOrdersApi.detail).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<RequestOrderContext request={request} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order context"}));act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(record));expect(screen.queryByText("Notebook")).toBeNull()})
it("shows requested return lines without including other purchased items",async()=>{vi.mocked(adminOrdersApi.detail).mockResolvedValue({...record,snapshot:{...record.snapshot,items:[...record.snapshot.items,{...record.snapshot.items[0],id:"00000000-0000-4000-8000-000000000003",title_en:"Unrequested item"}]}});render(<RequestOrderContext request={request} en navigate={()=>{}}/>);fireEvent.click(screen.getByRole("button",{name:"Load order context"}));await screen.findByText("Notebook");expect(screen.queryByText("Unrequested item")).toBeNull()})
