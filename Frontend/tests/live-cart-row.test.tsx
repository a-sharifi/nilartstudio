import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,test,vi} from "vitest"
import CartRow from "../src/design/CartRow"
import {evaluateCoupon,type EvaluatedLine} from "../src/design/cart"

afterEach(cleanup)
const row:EvaluatedLine={line:{id:"saved-line",kind:"product",data:{skuId:"published-sku",quantity:3,unitPrice:100,selection:{size:"A5",sheets:"50",cover:"3mm"}}},name:["دفتر آزمایش","Test notebook"],currentPrice:100,acceptedPrice:100,basePrice:100,bundleSaving:0,quantity:3,maxQuantity:99,requirements:new Map(),blockedParts:[]}
const props={row,language:1 as const,coupon:evaluateCoupon([row],""),stacking:false,busy:false,expanded:false,offline:false,onQuantity:vi.fn(),onRemove:vi.fn(),onEdit:vi.fn(),onAcceptPrice:vi.fn(),onNavigate:vi.fn(),renderMedia:()=>null,arrow:null}

test("live basket preserves recorded amounts and quantity controls without demo claims",()=>{
 render(<CartRow {...props} live exact={{accepted:"100",current:"100",base:"100",saving:"0"}}/>)
 expect(screen.queryByText("Demo details and price")).toBeNull()
 expect(screen.getByRole("img",{name:"Image: Test notebook"})).toBeTruthy()
 expect(screen.getByRole("textbox",{name:"Quantity"})).toHaveProperty("value","3")
 expect(screen.getByText("300 toman")).toBeTruthy()
 fireEvent.click(screen.getByRole("button",{name:"Increase quantity of Test notebook"}))
 expect(props.onQuantity).toHaveBeenCalledWith("saved-line",4)
 fireEvent.click(screen.getByRole("button",{name:"Edit options"}))
 expect(props.onEdit).toHaveBeenCalledWith("saved-line")
})

test("reference basket keeps its explicit demo disclosure",()=>{
 render(<CartRow {...props}/>)
 expect(screen.getByText("Demo details and price")).toBeTruthy()
 expect(screen.getByRole("img",{name:"Sample image: Test notebook"})).toBeTruthy()
})
