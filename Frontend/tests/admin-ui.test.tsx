import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import {AdminAction,AdminButton,AdminDataTable,AdminFilters} from "../src/components/admin/AdminUI"
afterEach(cleanup)
it("icon actions preserve accessible names, links and disabled behavior",()=>{const click=vi.fn();render(<><AdminAction icon="edit" disabled onClick={click}>Edit collection</AdminAction><AdminAction as="a" href="/fa/admin/products" icon="external">Open products</AdminAction></>);fireEvent.click(screen.getByRole("button",{name:"Edit collection"}));expect(click).not.toHaveBeenCalled();expect(screen.getByRole("button").querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");expect(screen.getByRole("link",{name:"Open products"}).getAttribute("href")).toBe("/fa/admin/products");expect(screen.getByRole("button").getAttribute("title")).toBe("Edit collection")})
it("filter apply submits while non-submit actions do not submit",()=>{const submit=vi.fn((e:React.FormEvent)=>e.preventDefault());render(<AdminFilters onSubmit={submit}><label>Search<input/></label><AdminButton>Apply</AdminButton><AdminAction icon="close">Clear filters</AdminAction></AdminFilters>);fireEvent.click(screen.getByRole("button",{name:"Clear filters"}));expect(submit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole("button",{name:"Apply"}));expect(submit).toHaveBeenCalledOnce()})
it("data tables retain captions, column semantics and stable row actions",()=>{render(<AdminDataTable caption="Recorded inventory" rows={[{id:"paper",name:"Paper"}]} rowKey={r=>r.id} columns={[{key:"name",title:"Item",render:r=>r.name},{key:"action",title:"Actions",action:true,render:r=><AdminAction icon="view">{`View ${r.name}`}</AdminAction>}]}/>);expect(screen.getByRole("table",{name:"Recorded inventory"})).toBeTruthy();expect(screen.getByRole("columnheader",{name:"Item"}).getAttribute("scope")).toBe("col");expect(screen.getByRole("button",{name:"View Paper"})).toBeTruthy()})

it("mobile row labels follow updated column headings without losing cell content",()=>{const columns=[{key:"name",title:"Item",render:(r:{id:string})=>r.id}];const view=render(<AdminDataTable caption="Stock" rows={[{id:"Paper"}]} rowKey={r=>r.id} columns={columns}/>);expect(screen.getByRole("cell").getAttribute("data-label")).toBe("Item");view.rerender(<AdminDataTable caption="Stock" rows={[{id:"Paper"}]} rowKey={r=>r.id} columns={[{...columns[0],title:"کالا"}]}/>);expect(screen.getByRole("cell").getAttribute("data-label")).toBe("کالا");expect(screen.getByRole("cell").textContent).toBe("Paper")})

it("filter toolbars without a submit handler never reload the document",()=>{
 const navigate=vi.fn()
 render(<AdminFilters aria-label="Artworks"><AdminButton onClick={navigate}>New artwork</AdminButton></AdminFilters>)
 const form=screen.getByRole('form',{name:'Artworks'})
 expect(fireEvent.submit(form)).toBe(false)
 fireEvent.click(screen.getByRole('button',{name:'New artwork'}))
 expect(navigate).toHaveBeenCalledOnce()
})
