import {cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,test,vi} from "vitest"
import {AddressForm,AddressDetails} from "../src/design/AddressFields"
import {addressErrors,cleanAddress,emptyAddress} from "../src/design/address"
afterEach(cleanup)
const address={...emptyAddress(),name:"Recipient",phone:"9123456789",province:" خراسان رضوی ",city:" مشهد ",street:"Test street",postal:"1234567890"}
test("live region validation accepts named regions and trims their whitespace",()=>{expect(addressErrors(address,true)).toEqual({});expect(cleanAddress(address).province).toBe("خراسان رضوی");expect(cleanAddress(address).city).toBe("مشهد");expect(addressErrors({...address,city:"  "},true).city).toBe("required");expect(addressErrors(address).city).toBe("required")})
test("saved named locations display even without matching the demo list",()=>{render(<AddressDetails address={address} language={0} demo={false}/>);expect(screen.getByText(/خراسان رضوی.*مشهد/)).toBeTruthy()})
test("backend regions populate searchable dependent dropdowns",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>[{id:"1",name_fa:"خراسان رضوی",name_en:"Razavi Khorasan",cities:[{id:"1",name_fa:"مشهد",name_en:"Mashhad"}]},{id:"2",name_fa:"تهران",name_en:"Tehran",cities:[{id:"2",name_fa:"ری",name_en:"Rey"}]}]}))
 const save=vi.fn();render(<AddressForm initial={address} language={1} live busy={false} cityFailure={false} onRetry={vi.fn()} onSave={save} onCancel={vi.fn()} saveError="" offline={false}/>)
 const province=await screen.findByRole("combobox",{name:"Province"})
 await vi.waitFor(()=>expect((province as HTMLInputElement).value).toBe("Razavi Khorasan"))
 expect(province.getAttribute("aria-autocomplete")).toBe("list")
 fireEvent.submit(province.closest("form")!);expect(save).toHaveBeenCalledWith(expect.objectContaining({province:"خراسان رضوی",city:"مشهد"}))
 fireEvent.change(province,{target:{value:"Teh"}});fireEvent.click(await screen.findByRole("option",{name:"Tehran"}))
 expect((screen.getByRole("combobox",{name:"City"}) as HTMLInputElement).value).toBe("")
 fireEvent.click(screen.getByRole("combobox",{name:"City"}));expect(await screen.findByRole("option",{name:"Rey"})).toBeTruthy();expect(screen.queryByRole("option",{name:"Mashhad"})).toBeNull()
 vi.unstubAllGlobals()
})
