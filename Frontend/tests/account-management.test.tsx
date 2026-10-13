import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,beforeEach,expect,test,vi} from "vitest"
import AccountManagementPage from "../src/features/admin/AccountManagementPage"
import {identityManagementApi} from "../src/features/admin/identity-api"
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>({status:"ready",access:{owner:"00000000-0000-4000-8000-000000000001",permissions:["identity.manage"]}})}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>()=>{}}))
vi.mock("../src/features/admin/identity-api",()=>({identityManagementApi:{list:vi.fn(),permissions:vi.fn(),update:vi.fn(),audits:vi.fn()}}))
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","")};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open")}})
afterEach(()=>{cleanup();vi.clearAllMocks()})
const account={id:"00000000-0000-4000-8000-000000000002",phone:"+989123456780",phone_verified:true,blocked:false,version:0,roles:["customer" as const],overrides:{},permissions:["account.read_self"]}
function setup(){vi.mocked(identityManagementApi.list).mockResolvedValue({items:[account],next_cursor:null});vi.mocked(identityManagementApi.permissions).mockResolvedValue(["payments.refund"]);vi.mocked(identityManagementApi.audits).mockResolvedValue([])}
test("reference admin shell edits persisted roles and overrides without prototype data",async()=>{
 setup();vi.mocked(identityManagementApi.update).mockImplementation(async row=>({...row,version:1}))
 render(<AccountManagementPage path="/en/admin/users" navigate={vi.fn()}/>)
 fireEvent.click(await screen.findByRole("button",{name:"Edit access"}))
 fireEvent.click(screen.getByRole("checkbox",{name:"finance"}))
 fireEvent.click(screen.getByRole("combobox",{name:"payments.refund"}))
 fireEvent.click(screen.getByRole("option",{name:"Allow"}))
 fireEvent.change(screen.getByLabelText("Reason for change"),{target:{value:"Assign finance responsibility"}})
 fireEvent.click(screen.getByRole("button",{name:"Confirm and save access"}))
 await screen.findByText("Access saved and audited.")
 expect(vi.mocked(identityManagementApi.update).mock.calls[0][0].roles).toEqual(["customer","finance"])
 expect(vi.mocked(identityManagementApi.update).mock.calls[0][0].overrides).toEqual({"payments.refund":true})
 expect(document.querySelector(".ad-app")).not.toBeNull()
 expect(screen.queryByText("Demo")).toBeNull()
})
test("stale updates retain edits and block resubmission until reload",async()=>{
 setup();vi.mocked(identityManagementApi.update).mockRejectedValue(new Error("access_version_conflict"))
 render(<AccountManagementPage path="/en/admin/users" navigate={vi.fn()}/>)
 fireEvent.click(await screen.findByRole("button",{name:"Edit access"}))
 fireEvent.change(screen.getByLabelText("Reason for change"),{target:{value:"Review permission"}})
 fireEvent.click(screen.getByRole("button",{name:"Confirm and save access"}))
 await screen.findByText("Access changed. Reload before editing.")
 expect((screen.getByRole("button",{name:"Confirm and save access"}) as HTMLButtonElement).disabled).toBe(true)
 expect((screen.getByLabelText("Reason for change") as HTMLTextAreaElement).value).toBe("Review permission")
 await waitFor(()=>expect(identityManagementApi.update).toHaveBeenCalledTimes(1))
})
