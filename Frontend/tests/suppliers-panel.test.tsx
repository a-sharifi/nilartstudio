import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import type {ReactNode} from "react"
import {afterEach,expect,it,vi} from "vitest"
import SuppliersPanel from "../src/features/admin/SuppliersPanel"
import {suppliersApi} from "../src/features/admin/suppliers-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
import {supplierId,supplierRecord} from "./supplier-fixture"
vi.mock("../src/design/AdminDashboard",()=>({default:({live}:{live:{children:ReactNode}})=><main>{live.children}</main>}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>({access:{permissions:["inventory.manage"]}})}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>()=>{}}))
vi.mock("../src/features/admin/suppliers-api",async original=>({...await original<typeof import("../src/features/admin/suppliers-api")>(),suppliersApi:{detail:vi.fn(),list:vi.fn(),versions:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it("clears private supplier contacts and unsaved notes with the session",async()=>{vi.mocked(suppliersApi.detail).mockResolvedValue(supplierRecord);render(<SuppliersPanel path={`/en/admin/inventory/suppliers/${supplierId}`} navigate={()=>{}}/>);const notes=await screen.findByLabelText("Internal notes");fireEvent.change(notes,{target:{value:"Private unsaved notes"}});act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByDisplayValue("Private unsaved notes")).toBeNull();expect(screen.queryByDisplayValue("Private contact")).toBeNull()})
it("ignores supplier details received after session clearing",async()=>{let complete!:(value:typeof supplierRecord)=>void;vi.mocked(suppliersApi.detail).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));render(<SuppliersPanel path={`/en/admin/inventory/suppliers/${supplierId}`} navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(supplierRecord));expect(screen.queryByLabelText("English name")).toBeNull()})
