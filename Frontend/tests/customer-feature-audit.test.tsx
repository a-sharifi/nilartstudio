import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react"
import {afterEach,beforeEach,expect,test,vi} from "vitest"
import FavoriteButton from "../src/features/customer/FavoriteButton"
import {customerApi,addressApi,supportApi} from "../src/features/customer/api"
import {privateRequest,ManagementApiError} from "../src/features/admin/identity-api"
const access=vi.hoisted(()=>({status:"ready",access:{owner:"owner-a",permissions:["account.read_self","account.write_self"]}}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>access}))
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn(),ManagementApiError:class extends Error{}}))
const id="00000000-0000-4000-8000-000000000002",target="00000000-0000-4000-8000-000000000003"
const favorite={id,kind:"favorite",version:0,data:{kind:"bundle",target_id:target},created_at:"2026-10-13T10:00:00Z",updated_at:"2026-10-13T10:00:00Z",catalog:null}
beforeEach(()=>{access.status="ready";access.access.owner="owner-a";access.access.permissions=["account.read_self","account.write_self"]})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.resetAllMocks()})
test("address loading follows every API cursor and retains all records",async()=>{
 const data={name:"Recipient",phone:"9123456789",province:"tehran",city:"tehran",street:"A test street",postal:"1234567890",label:"Home",default:false}
 vi.mocked(privateRequest).mockResolvedValueOnce({items:[{...favorite,kind:"address",data}],next_cursor:id}).mockResolvedValueOnce({items:[{...favorite,id:target,kind:"address",data}],next_cursor:null})
 const result=await addressApi.load()
 expect(result.map(item=>item.id)).toEqual([id,target])
 expect(privateRequest).toHaveBeenLastCalledWith(`/api/v1/account/panel/address?limit=100&cursor=${id}`)
})
test("a repeated pagination cursor fails rather than looping forever",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({items:[favorite],next_cursor:id})
 await expect(customerApi.all("favorite")).rejects.toThrow("pagination_loop")
 expect(privateRequest).toHaveBeenCalledTimes(2)
})
test("unknown favorite writes cannot repeat until the server result is reloaded",async()=>{
 const all=vi.spyOn(customerApi,"all").mockResolvedValue([])
 const save=vi.spyOn(customerApi,"save").mockRejectedValue(new Error("result_unknown"))
 render(<FavoriteButton kind="bundle" id={target} language={1}>Heart</FavoriteButton>)
 const button=screen.getByRole("button",{name:"Save to favorites"}) as HTMLButtonElement
 await waitFor(()=>expect(button.disabled).toBe(false))
 fireEvent.click(button)
 await screen.findByRole("alert")
 expect(button.disabled).toBe(true)
 fireEvent.click(button)
 expect(save).toHaveBeenCalledTimes(1)
 all.mockResolvedValue([favorite as Awaited<ReturnType<typeof customerApi.save>>])
 fireEvent.click(screen.getByRole("button",{name:"Reload favorites"}))
 const remove=await screen.findByRole("button",{name:"Remove favorite"}) as HTMLButtonElement
 expect(remove.disabled).toBe(false)
 expect(remove.getAttribute("aria-pressed")).toBe("true")
})
test("read-only accounts cannot save catalog favorites",async()=>{
 access.access.permissions=["account.read_self"]
 vi.spyOn(customerApi,"all").mockResolvedValue([])
 const save=vi.spyOn(customerApi,"save")
 render(<FavoriteButton kind="artwork" id={target} language={1}>Heart</FavoriteButton>)
 await waitFor(()=>expect(customerApi.all).toHaveBeenCalled())
 const button=screen.getByRole("button",{name:"Save to favorites"}) as HTMLButtonElement
 expect(button.disabled).toBe(true)
 fireEvent.click(button)
 expect(save).not.toHaveBeenCalled()
})
test("switching accounts clears favorite status and reloads the new owner",async()=>{
 const all=vi.spyOn(customerApi,"all").mockResolvedValueOnce([favorite as Awaited<ReturnType<typeof customerApi.save>>]).mockResolvedValueOnce([])
 const view=render(<FavoriteButton kind="bundle" id={target} language={1}>Heart</FavoriteButton>)
 await screen.findByRole("button",{name:"Remove favorite"})
 access.access.owner="owner-b"
 view.rerender(<FavoriteButton kind="bundle" id={target} language={1}>Heart</FavoriteButton>)
 await waitFor(()=>expect(all).toHaveBeenCalledTimes(2))
 await waitFor(()=>expect(screen.getByRole("button",{name:"Save to favorites"}).getAttribute("aria-pressed")).toBe("false"))
})
test("mark all notifications read follows pagination, skips read records, and awaits writes",async()=>{
 const unread={...favorite,kind:"notification" as const,data:{read:false}}
 vi.spyOn(customerApi,"all").mockResolvedValue([unread,{...unread,id:target,data:{read:true}}])
 const save=vi.spyOn(customerApi,"save").mockResolvedValue({...unread,data:{read:true}})
 await customerApi.markAllRead()
 expect(save).toHaveBeenCalledTimes(1)
 expect(save).toHaveBeenCalledWith("notification",id,0,{read:true})
})
test("support conversation follows scoped message pages and deduplicates replies",async()=>{
 const message={...favorite,kind:"message",data:{ticket_id:id,body:"Private reply"}}
 vi.mocked(privateRequest).mockResolvedValueOnce({items:[message],next_cursor:target}).mockResolvedValueOnce({items:[message,{...message,id:target}],next_cursor:null})
 const result=await customerApi.all("message",id)
 expect(result).toHaveLength(2)
 expect(privateRequest).toHaveBeenLastCalledWith(`/api/v1/account/panel/message?limit=100&cursor=${target}&ticket_id=${id}`)
})
test("support conversation rejects a response containing another ticket's message",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({items:[{...favorite,kind:"message",data:{ticket_id:target,body:"Wrong conversation"}}],next_cursor:null})
 await expect(customerApi.all("message",id)).rejects.toThrow("Invalid record kind")
})
test("ticket history forwards encoded search and status filters",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null})
 await customerApi.list("ticket",undefined,undefined,{q:"100% help",status:"closed"})
 expect(privateRequest).toHaveBeenCalledWith("/api/v1/account/panel/ticket?limit=100&q=100%25%20help&status=closed")
})

test("live reference support adapter applies filters to every ticket page",async()=>{
 vi.mocked(privateRequest).mockResolvedValueOnce({account_id:id}).mockResolvedValueOnce({items:[{...favorite,kind:"ticket",data:{subject:"First",topic:"general",status:"closed"}}],next_cursor:id}).mockResolvedValueOnce({items:[{...favorite,id:target,kind:"ticket",data:{subject:"Second",topic:"general",status:"closed"}}],next_cursor:null})
 const result=await supportApi.load({q:"help",status:"closed"})
 expect(result.tickets).toHaveLength(2)
 expect(privateRequest).toHaveBeenLastCalledWith(`/api/v1/account/panel/ticket?limit=100&cursor=${id}&q=help&status=closed`)
})
test("support recovery reads only the original ticket and validates its identity",async()=>{
 vi.mocked(privateRequest).mockResolvedValueOnce({...favorite,kind:"ticket",data:{subject:"Recovered",topic:"general",status:"submitted"}})
 expect((await supportApi.lookup(id,id))?.id).toBe(id)
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/account/panel/ticket/${id}`)
 vi.mocked(privateRequest).mockResolvedValueOnce({...favorite,id:target,kind:"ticket"})
 await expect(supportApi.lookup(id,id)).rejects.toThrow("Invalid ticket result")
})

test("support recovery treats only confirmed not-found responses as absence",async()=>{
 vi.mocked(privateRequest).mockRejectedValueOnce(new ManagementApiError("record_not_found"))
 expect(await supportApi.lookup(id,id)).toBeNull()
 vi.mocked(privateRequest).mockRejectedValueOnce(new ManagementApiError("service_unavailable"))
 await expect(supportApi.lookup(id,id)).rejects.toThrow("service_unavailable")
})
test("notification history forwards search read status and category filters",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null})
 await customerApi.list("notification",target,undefined,{q:"100% notice",read:"read",category:"support"})
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/account/panel/notification?limit=100&cursor=${target}&q=100%25%20notice&read_filter=read&category=support`)
})
test("favorite history forwards literal search and item type on each page",async()=>{
 vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null})
 await customerApi.list("favorite",target,undefined,{q:"100% artwork",favoriteType:"artwork"})
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/account/panel/favorite?limit=100&cursor=${target}&q=100%25%20artwork&favorite_type=artwork`)
})
