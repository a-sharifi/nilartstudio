import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import type {ReactNode} from "react"
import {afterEach,expect,it,vi} from "vitest"
import DiscountsPanel from "../src/features/admin/DiscountsPanel"
import {discountsApi} from "../src/features/admin/discounts-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
import {discountId,discountRecord} from "./discount-fixture"
vi.mock("../src/design/AdminDashboard",()=>({default:({live}:{live:{children:ReactNode}})=><main>{live.children}</main>}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>({access:{permissions:["catalog.manage"]}})}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>()=>{}}))
vi.mock("../src/features/admin/discounts-api",async original=>({...await original<typeof import("../src/features/admin/discounts-api")>(),discountsApi:{detail:vi.fn(),list:vi.fn(),versions:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it("clears private discount contacts and unsaved notes with the session",async()=>{vi.mocked(discountsApi.detail).mockResolvedValue(discountRecord);render(<DiscountsPanel path={`/en/admin/discounts/${discountId}`} navigate={()=>{}}/>);const notes=await screen.findByLabelText("English name");fireEvent.change(notes,{target:{value:"Private unsaved discount"}});act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByDisplayValue("Private unsaved discount")).toBeNull();expect(screen.queryByDisplayValue("Private discount")).toBeNull()})
it("ignores discount details received after session clearing",async()=>{let complete!:(value:typeof discountRecord)=>void;vi.mocked(discountsApi.detail).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<DiscountsPanel path={`/en/admin/discounts/${discountId}`} navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(discountRecord));expect(screen.queryByLabelText("English name")).toBeNull()})
