import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,beforeEach,expect,test,vi} from "vitest"
import PhoneChangePage from "../src/features/identity/PhoneChangePage"
import {NavigationGuardProvider} from "../src/features/navigation/NavigationGuardProvider"
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:request}))
beforeEach(()=>{request.mockReset();HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","")};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open")}})
afterEach(cleanup)
test("phone-change form retains unsaved input and returns to sign-in only after confirmed verification",async()=>{
 const navigate=vi.fn()
 request.mockResolvedValueOnce({challenge_id:"00000000-0000-4000-8000-000000000003",expires_at:"2026-10-13T12:00:00Z",sandbox:true}).mockResolvedValueOnce({reauthenticate:true})
 render(<NavigationGuardProvider><PhoneChangePage path="/en/account/security/change-phone" navigate={navigate}/></NavigationGuardProvider>)
 fireEvent.change(screen.getByLabelText("New phone number"),{target:{value:"+989123456780"}})
 fireEvent.click(screen.getByText("Back to account security"))
 await screen.findByRole("dialog")
 fireEvent.click(screen.getByRole("button",{name:"Keep editing"}))
 expect((screen.getByLabelText("New phone number") as HTMLInputElement).value).toBe("+989123456780")
 expect(navigate).not.toHaveBeenCalled()
 fireEvent.change(screen.getByLabelText("Current password"),{target:{value:"a current passphrase"}})
 fireEvent.click(screen.getByRole("button",{name:"Request verification code"}))
 await screen.findByText("The test code is in the local SMS inbox; no real SMS was sent.")
 expect(navigate).not.toHaveBeenCalled()
 fireEvent.change(screen.getByLabelText("Verification code"),{target:{value:"۱۲۳۴۵۶"}})
 fireEvent.click(screen.getByRole("button",{name:"Confirm and change phone"}))
 await vi.waitFor(()=>expect(navigate).toHaveBeenCalledWith("/en/auth/login"))
 expect(request.mock.calls[1][2]).toEqual({challenge_id:"00000000-0000-4000-8000-000000000003",code:"123456"})
})
