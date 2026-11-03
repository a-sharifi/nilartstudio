import {act,fireEvent,render,screen,cleanup} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import SupportHistory from "../src/features/admin/SupportHistory"
import {supportAdminApi} from "../src/features/admin/support-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/support-api",()=>({supportAdminApi:{audits:vi.fn()}}))
afterEach(cleanup)
it("clears private staff reasons when the session changes",async()=>{
 const id="00000000-0000-4000-8000-000000000001"
 vi.mocked(supportAdminApi.audits).mockResolvedValue({items:[{id,actor_id:id,created_at:"2026-10-14T10:00:00Z",action:"customer.support_state",reason:"Private staff reason",changes:{record_id:id,before:"submitted",after:"closed",previous_version:0,version:1}}],next_cursor:null})
 render(<SupportHistory id={id} en/>)
 fireEvent.click(screen.getByRole("button",{name:"Load support history"}))
 await screen.findByText("Private staff reason")
 act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()))
 expect(screen.queryByText("Private staff reason")).toBeNull()
})
