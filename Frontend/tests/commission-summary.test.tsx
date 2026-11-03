import {act,render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import CommissionSummary from "../src/features/admin/CommissionSummary"
import {privateRequest} from "../src/features/admin/identity-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const data={total_commissions:12,statuses:{awaiting_review:12}}
it("clears private aggregate counts with the session",async()=>{vi.mocked(privateRequest).mockResolvedValue(data);render(<CommissionSummary en base="/en/admin" navigate={()=>{}}/>);await screen.findByText(/^Total commissions/);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByText(/^Total commissions/)).toBeNull()})
it("discards an overview response received after the session changed",async()=>{let complete!:(value:typeof data)=>void;vi.mocked(privateRequest).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<CommissionSummary en base="/en/admin" navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(data));expect(screen.queryByText(/^Total commissions/)).toBeNull()})
