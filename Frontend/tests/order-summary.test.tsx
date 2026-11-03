import {act,render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import OrderSummary from "../src/features/admin/OrderSummary"
import {privateRequest} from "../src/features/admin/identity-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const data={total_orders:12,payment:{paid:12},fulfillment:{unshipped:12},pending_requests:{return:2}}
it("clears private aggregate counts with the session",async()=>{vi.mocked(privateRequest).mockResolvedValue(data);render(<OrderSummary en base="/en/admin" navigate={()=>{}}/>);await screen.findByText(/^Total orders/);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByText(/^Total orders/)).toBeNull()})
it("discards an overview response received after the session changed",async()=>{let complete!:(value:typeof data)=>void;vi.mocked(privateRequest).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<OrderSummary en base="/en/admin" navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(data));expect(screen.queryByText(/^Total orders/)).toBeNull()})
