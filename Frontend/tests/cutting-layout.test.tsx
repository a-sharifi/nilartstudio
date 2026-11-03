import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import CuttingLayout from "../src/features/admin/CuttingLayout"
const request=vi.hoisted(()=>vi.fn())
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:request}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
it("requires workshop confirmation and clears stale estimates when geometry changes",async()=>{
 request.mockResolvedValue({fits:true,columns:2,rows:2,yield_count:4,rotated:false,method:"uniform_grid",workshop_confirmation_required:true})
 const apply=vi.fn();render(<CuttingLayout width="100" height="60" en apply={apply}/>);
 fireEvent.click(screen.getByText("Calculate cutting layout"));
 for(const [label,value] of [["Piece width","30"],["Piece height","20"],["Margin per edge","5"],["Gap between pieces","1"]])fireEvent.change(screen.getByLabelText(label),{target:{value}})
 fireEvent.click(screen.getByRole("button",{name:"Calculate layout"}));
 const confirm=await screen.findByRole("button",{name:"Confirm workshop review & use in draft"});expect(confirm.hasAttribute("disabled")).toBe(true)
 fireEvent.change(screen.getByLabelText("Reviewer and workshop confirmation"),{target:{value:"Workshop A, grain checked"}});fireEvent.click(confirm)
 expect(apply).toHaveBeenCalledWith(4,expect.stringContaining("sheet 100×60; piece 30×20; edge 5; gap 1"))
 fireEvent.change(screen.getByLabelText("Piece width"),{target:{value:"40"}});await waitFor(()=>expect(screen.queryByText(/Suggested yield/)).toBeNull())
})
