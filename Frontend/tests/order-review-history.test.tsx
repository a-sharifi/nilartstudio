import {act,fireEvent,render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import OrderReviewHistory from "../src/features/admin/OrderReviewHistory"
import {orderReviewApi} from "../src/features/admin/order-review-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/order-review-api",()=>({orderReviewApi:{history:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const id="00000000-0000-4000-8000-000000000001"
const page={items:[{id,request_id:id,actor_id:id,created_at:"2026-10-14T10:00:00Z",status:"in_review" as const,reply:"Private decision reply",expected_version:0}],next_cursor:null}
it("clears private decision history when the session changes",async()=>{
 vi.mocked(orderReviewApi.history).mockResolvedValue(page)
 render(<OrderReviewHistory id={id} en/>)
 fireEvent.click(screen.getByRole("button",{name:"Load decision history"}))
 await screen.findByText("Private decision reply")
 act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()))
 expect(screen.queryByText("Private decision reply")).toBeNull()
})
it("discards a history response received after the session changes",async()=>{
 let complete!:(value:typeof page)=>void
 vi.mocked(orderReviewApi.history).mockImplementation(()=>new Promise(resolve=>{complete=resolve}))
 render(<OrderReviewHistory id={id} en/>)
 fireEvent.click(screen.getByRole("button",{name:"Load decision history"}))
 act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()))
 await act(async()=>complete(page))
 expect(screen.queryByText("Private decision reply")).toBeNull()
})
