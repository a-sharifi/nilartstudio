import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import type {ReactNode} from "react"
import {afterEach,expect,it,vi} from "vitest"
import CostResources from "../src/features/admin/CostResources"
import {costingApi} from "../src/features/admin/costing-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
import {costId,costResource} from "./cost-resource-fixture"
vi.mock("../src/design/AdminDashboard",()=>({default:({live}:{live:{children:ReactNode}})=><main>{live.children}</main>}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>({access:{permissions:["pricing.publish"]}})}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>()=>{}}))
vi.mock("../src/features/admin/costing-api",async importOriginal=>({...await importOriginal<typeof import("../src/features/admin/costing-api")>(),costingApi:{detail:vi.fn(),list:vi.fn(),versions:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it("clears a private resource and unsaved edit with the session",async()=>{vi.mocked(costingApi.detail).mockResolvedValue(costResource);render(<CostResources path={`/en/admin/materials/${costId}`} navigate={()=>{}}/>);const title=await screen.findByLabelText("English name");fireEvent.change(title,{target:{value:"Private unsaved title"}});act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByLabelText("English name")).toBeNull();expect(screen.queryByDisplayValue("Private unsaved title")).toBeNull()})
it("ignores a resource detail received after private cache clearing",async()=>{let complete!:(value:typeof costResource)=>void;vi.mocked(costingApi.detail).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<CostResources path={`/en/admin/materials/${costId}`} navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(costResource));expect(screen.queryByLabelText("English name")).toBeNull()})
