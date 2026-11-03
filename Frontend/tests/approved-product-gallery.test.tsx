import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,expect,test} from "vitest"
import ProductGallery,{type ProductDialog} from "../src/design/ProductGallery"

afterEach(cleanup)
const images=[{label:["تصویر اول","First approved image"] as [string,string],view:"front",src:"/api/v1/media/one/versions/pinned-one/content"},{label:["تصویر دوم","Second approved image"] as [string,string],view:"front",src:"/api/v1/media/two/versions/pinned-two/content"}]
const dialog:ProductDialog=(open,close,title,children)=>open?<div role="dialog" aria-label={title}>{children}<button onClick={close}>Close preview</button></div>:null
const props={language:1 as const,approved:true,images,productName:"Managed product",media:<span>Unapproved fallback</span>,renderDialog:dialog}

test("approved gallery uses pinned image sources and omits sample claims",async()=>{
 const view=render(<ProductGallery {...props}/>)
 expect(view.container.querySelector(".gallery-main img")?.getAttribute("src")).toBe(images[0].src)
 expect(screen.getByText(/Approved image/)).toBeTruthy()
 expect(screen.queryByText(/Design mockups|Unapproved fallback|Image placeholder/)).toBeNull()
 fireEvent.click(screen.getByRole("button",{name:"Second approved image"}))
 expect(view.container.querySelector(".gallery-main img")?.getAttribute("src")).toBe(images[1].src)
 fireEvent.click(screen.getByRole("button",{name:"Enlarge image: Second approved image"}))
 expect(screen.getByRole("dialog").querySelector("img")?.getAttribute("src")).toBe(images[1].src)
 fireEvent.click(screen.getByRole("button",{name:"Close preview"}))
 await waitFor(()=>expect(document.activeElement?.getAttribute("aria-label")).toBe("Enlarge image: Second approved image"))
})

test("failed approved media shows an error instead of substituting a mockup and recovers on revision",()=>{
 const view=render(<ProductGallery {...props}/>)
 fireEvent.error(view.container.querySelector(".gallery-main img")!)
 expect(screen.getByText("Image unavailable")).toBeTruthy()
 expect(screen.queryByText(/Unapproved fallback|Sample mockup/)).toBeNull()
 view.rerender(<ProductGallery {...props} images={[{...images[0],src:"/api/v1/media/one/versions/new-revision/content"}]}/>)
 expect(view.container.querySelector(".gallery-main img")?.getAttribute("src")).toContain("new-revision")
})

test("reference gallery retains its visible sample disclosure",()=>{
 render(<ProductGallery {...props} approved={false}/>)
 expect(screen.getByText(/Design mockups only/)).toBeTruthy()
 expect(screen.getByText(/Image placeholder/)).toBeTruthy()
})
