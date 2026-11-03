import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import ReferencesPage from "../src/design/ReferencesPage"
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it("enables image-based requests and continues with selected local images without a demo upload",async()=>{
 HTMLDialogElement.prototype.close=function(){this.removeAttribute("open")};HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","")}
 URL.createObjectURL=vi.fn(()=>"blob:reference");URL.revokeObjectURL=vi.fn()
 vi.stubGlobal("Image",class{onload?:()=>void;set src(_value:string){queueMicrotask(()=>this.onload?.())}})
 const save=vi.fn(),navigate=vi.fn()
 render(<ReferencesPage language={1} signedIn draft={null} onSave={save} onNavigate={navigate} onDemoSignIn={vi.fn()} registerGuard={vi.fn()} live/>)
 const imageRadio=screen.getByRole("radio",{name:/From a reference image/})
 expect(imageRadio.hasAttribute("disabled")).toBe(false);fireEvent.click(imageRadio)
 fireEvent.change(screen.getByLabelText("Choose reference images"),{target:{files:[new File(["image"],"reference.png",{type:"image/png"})]}})
 await screen.findByText("Ready for final submission")
 fireEvent.change(screen.getByRole("textbox",{name:/Your idea and brief/}),{target:{value:"Draw this reference with a blue background"}})
 fireEvent.click(screen.getByRole("button",{name:/Continue: style and execution/}))
 await waitFor(()=>expect(navigate).toHaveBeenCalledWith("Preferences","/en/commissions/new/preferences"))
 expect(save.mock.calls[0][0].kind).toBe("image");expect(save.mock.calls[0][0].files[0].status).toBe("accepted")
})
it("returns guests through the real localized sign-in route",()=>{
 render(<ReferencesPage language={0} signedIn={false} draft={null} onSave={vi.fn()} onNavigate={vi.fn()} onDemoSignIn={vi.fn()} registerGuard={vi.fn()} live/>);
 expect(screen.getByRole('link',{name:/ورود و ادامه/}).getAttribute('href')).toBe('/fa/auth/login?returnTo=%2Ffa%2Fcommissions%2Fnew%2Freferences');
 expect(screen.queryByText(/در این نمونه، فایل و متن خصوصی/)).toBeNull();
});
