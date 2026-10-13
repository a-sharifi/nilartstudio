import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import Dropdown from "../src/components/ui/Dropdown"
afterEach(cleanup)
const options=[{value:"cats",label:"Cats"},{value:"blocked",label:"Blocked",disabled:true},{value:"ghosts",label:"Ghosts"}]

test("autocomplete filters labels and only commits an existing choice",()=>{
 const change=vi.fn()
 render(<Dropdown options={options} value="cats" onChange={change} label="Collection" autocomplete emptyMessage="No matches"/>)
 const input=screen.getByRole("combobox")
 fireEvent.focus(input)
 fireEvent.change(input,{target:{value:"gh"}})
 expect(screen.getAllByRole("option")).toHaveLength(1)
 expect(change).not.toHaveBeenCalled()
 fireEvent.keyDown(input,{key:"Enter"})
 expect(change).toHaveBeenCalledWith("ghosts")
 fireEvent.click(input)
 fireEvent.change(input,{target:{value:"unknown"}})
 expect(screen.getByRole("status").textContent).toBe("No matches")
 fireEvent.keyDown(input,{key:"Enter"})
 expect(change).toHaveBeenCalledTimes(1)
 fireEvent.keyDown(input,{key:"Escape"})
 expect(input.getAttribute("aria-expanded")).toBe("false")
})

test("non-searchable dropdown skips disabled choices and supports keyboard selection",()=>{
 const change=vi.fn()
 render(<Dropdown options={options} value="cats" onChange={change} label="Collection" autocomplete={false}/>)
 const input=screen.getByRole("combobox")
 expect(input.hasAttribute("readonly")).toBe(true)
 fireEvent.keyDown(input,{key:"ArrowDown"})
 fireEvent.keyDown(input,{key:"ArrowDown"})
 fireEvent.keyDown(input,{key:"Enter"})
 expect(change).toHaveBeenCalledWith("ghosts")
})

test("disabled dropdown does not open and autocomplete normalizes Persian letters",()=>{
 const {rerender}=render(<Dropdown options={[]} value="" onChange={vi.fn()} label="دسته" disabled/>)
 expect(screen.getByRole("combobox").hasAttribute("disabled")).toBe(true)
 rerender(<Dropdown options={[{value:"book",label:"کیف"}]} value="" onChange={vi.fn()} label="دسته" autocomplete/>)
 fireEvent.change(screen.getByRole("combobox"),{target:{value:"كيف"}})
 expect(screen.getByRole("option").textContent).toBe("کیف")
})
