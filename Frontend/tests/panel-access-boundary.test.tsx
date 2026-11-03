import {useState} from "react"
import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import PanelAccessBoundary from "../src/features/identity/PanelAccessBoundary"
const auth=vi.hoisted(()=>({status:"ready",access:{permissions:["catalog.manage"]} as {permissions:string[]}|null}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>auth}))
vi.mock("../src/features/identity/access-store",()=>({accountAccessStore:{refresh:vi.fn()}}))
vi.mock("../src/features/system/SystemErrorPage",()=>({default:({kind}:{kind:string})=><p>Error {kind}</p>}))
function Editor(){const [draft,setDraft]=useState("");return <input aria-label="Draft" value={draft} onChange={e=>setDraft(e.target.value)}/>}
function Page(){return <PanelAccessBoundary permission="catalog.manage" path="/en/admin/products"><Editor/></PanelAccessBoundary>}
afterEach(()=>{cleanup();auth.status="ready";auth.access={permissions:["catalog.manage"]}})
it("retains an editor while hiding it during fresh authorization and discards it on revocation",()=>{const view=render(<Page/>);fireEvent.change(screen.getByLabelText("Draft"),{target:{value:"unsaved"}});const editor=screen.getByLabelText("Draft");auth.status="checking";auth.access=null;view.rerender(<Page/>);expect(screen.getByText("Checking access…")).toBeTruthy();expect(editor.parentElement?.hidden).toBe(true);expect(editor.parentElement?.hasAttribute("inert")).toBe(true);auth.status="ready";auth.access={permissions:["catalog.manage"]};view.rerender(<Page/>);expect(screen.getByLabelText("Draft")).toBe(editor);expect((editor as HTMLInputElement).value).toBe("unsaved");auth.access={permissions:[]};view.rerender(<Page/>);expect(screen.getByText("Error 403")).toBeTruthy();expect(screen.queryByLabelText("Draft")).toBeNull()})
it("never mounts private content before initial authorization",()=>{auth.status="checking";auth.access=null;render(<Page/>);expect(screen.queryByLabelText("Draft")).toBeNull()})
