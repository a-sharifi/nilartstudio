import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,test,vi} from "vitest"
import SelectDropdown from "../src/components/ui/SelectDropdown"
afterEach(cleanup)
test("existing form labels, disabled choices, form values and change callbacks survive the bridge",()=>{
 const change=vi.fn()
 render(<form><label htmlFor="topic">Topic</label><SelectDropdown id="topic" name="topic" defaultValue="a" onChange={change} aria-describedby="help" aria-invalid="true"><option value="a">First</option><optgroup label="Unavailable" disabled><option value="b">Blocked</option></optgroup><option value="c">Third</option></SelectDropdown><p id="help">Choose a topic</p></form>)
 const input=screen.getByRole("combobox",{name:"Topic"})
 expect(input.getAttribute("aria-describedby")).toBe("help")
 fireEvent.click(input)
 fireEvent.click(screen.getByRole("option",{name:"Blocked"}))
 expect(change).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole("option",{name:"Third"}))
 expect(change.mock.calls[0][0].target.value).toBe("c")
 expect(new FormData(input.closest("form")!).get("topic")).toBe("c")
})
