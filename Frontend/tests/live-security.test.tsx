import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,test,vi} from "vitest"
import SecurityPage from "../src/design/SecurityPage"
import type {LiveSecurityApi} from "../src/features/identity/security"
afterEach(cleanup)
test("reference security form uses live password callback and displays actual sessions",async()=>{
 const change=vi.fn().mockResolvedValue({reauthenticate:true})
 const api={load:vi.fn().mockResolvedValue({owner:"test-owner",sandboxSms:false,passwordEnabled:true,otpEnabled:false,phoneVerified:true,maskedPhone:"+9891••••6789",canChange:true,minimum:12,sessionPolicy:"all-sessions",sessionsEnabled:true,canManageSessions:true,sessions:[{id:"session-id",current:true,device:["نشست حساب","Account session"],lastActivity:"2026-10-13T10:00:00Z"}]}),change,revoke:vi.fn(),subscribe:()=>()=>{},registerPrivateCache:()=>()=>{}} as unknown as LiveSecurityApi
 render(<SecurityPage page="/en/account/security" navigate={vi.fn()} liveApi={api}/>)
 await screen.findByText("Current session")
 expect(screen.queryByText("Preview states")).toBeNull()
 expect(document.querySelector(".dash-alert-dot")).toBeNull()
 fireEvent.change(screen.getByLabelText("Current password"),{target:{value:"a current passphrase"}})
 fireEvent.change(screen.getByLabelText("New password"),{target:{value:"a new secure passphrase"}})
 fireEvent.change(screen.getByLabelText("Confirm new password"),{target:{value:"a new secure passphrase"}})
 fireEvent.click(screen.getByRole("button",{name:"Change password"}))
 await screen.findByText("Your password has been changed")
 expect(change.mock.calls[0][0]).toEqual({current:"a current passphrase",next:"a new secure passphrase",confirm:"a new secure passphrase"})
 expect(screen.queryByLabelText("Current password")).toBeNull()
})
