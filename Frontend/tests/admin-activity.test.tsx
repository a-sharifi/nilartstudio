import {act,render,screen,cleanup,fireEvent} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import type {ReactNode} from "react"
import ActivityLog from "../src/features/admin/ActivityLog"
import {activityApi} from "../src/features/admin/activity-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/design/AdminDashboard",()=>({default:({live}:{live:{children:ReactNode}})=><>{live.children}</>}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>({access:{permissions:["identity.manage"]}})}))
vi.mock("../src/features/admin/activity-api",()=>({activityApi:{list:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const id="00000000-0000-4000-8000-000000000001",data={items:[{id,actor_id:id,account_id:id,action:"access.updated",reason:"Private audit reason",created_at:"2026-10-14T10:00:00Z"}],next_cursor:null}
it("clears account activity when the session changes",async()=>{vi.mocked(activityApi.list).mockResolvedValue(data);render(<ActivityLog path="/en/admin/activity" navigate={()=>{}}/>);await screen.findByText("Private audit reason");fireEvent.change(screen.getByLabelText("Actor ID"),{target:{value:id}});fireEvent.change(screen.getByLabelText("From date (Tehran)"),{target:{value:"2026-10-16"}});fireEvent.click(screen.getByRole("combobox",{name:"Action type"}));fireEvent.click(screen.getByRole("option",{name:"Access change"}));act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByText("Private audit reason")).toBeNull();expect((screen.getByLabelText("Actor ID") as HTMLInputElement).value).toBe("");expect((screen.getByLabelText("From date (Tehran)") as HTMLInputElement).value).toBe("");expect((screen.getByRole("combobox",{name:"Action type"}) as HTMLInputElement).value).toBe("All actions")})
it("ignores an activity response after session clearing",async()=>{let complete!:(value:typeof data)=>void;vi.mocked(activityApi.list).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<ActivityLog path="/en/admin/activity" navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(data));expect(screen.queryByText("Private audit reason")).toBeNull();expect((screen.getByLabelText("Actor ID") as HTMLInputElement).value).toBe("");expect((screen.getByLabelText("From date (Tehran)") as HTMLInputElement).value).toBe("");expect((screen.getByRole("combobox",{name:"Action type"}) as HTMLInputElement).value).toBe("All actions")})
