import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,beforeEach,expect,test,vi} from "vitest"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
import SupportAttachments from "../src/features/customer/SupportAttachments"
import {supportAttachmentsApi,readSupportFile} from "../src/features/customer/support-attachments-api"
vi.mock("../src/features/customer/support-attachments-api",()=>({attachmentBase:(staff:boolean)=>staff?"/api/v1/admin/support":"/api/v1/account/support",readSupportFile:vi.fn(),supportAttachmentsApi:{list:vi.fn(),upload:vi.fn()}}))
const ticket="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-000000000002"
const saved={id,ticket_id:ticket,file_name:"shot.png",size:3,sha256:"0".repeat(64),created_at:"2026-10-14T12:00:00Z"}
beforeEach(()=>{vi.mocked(supportAttachmentsApi.list).mockResolvedValue([]);vi.mocked(readSupportFile).mockResolvedValue("png-base64")})
afterEach(()=>{cleanup();vi.resetAllMocks()})
async function choose(){fireEvent.change(await screen.findByLabelText("Choose support file"),{target:{files:[new File(["png"],"shot.png",{type:"image/png"})]}});await screen.findByRole("button",{name:"Attach file"})}
test("upload confirms recorded attachment and marks draft clean",async()=>{const dirty=vi.fn(),done=vi.fn();vi.mocked(supportAttachmentsApi.upload).mockResolvedValue(saved);render(<SupportAttachments ticket={ticket} en canWrite closed={false} onDirty={dirty} onSaved={done}/>);await screen.findByRole("button",{name:"Check saved attachments"});await choose();fireEvent.click(screen.getByRole("button",{name:"Attach file"}));await screen.findByText("Attachment added to the conversation.");expect(done).toHaveBeenCalledOnce();expect(dirty).toHaveBeenLastCalledWith(false);expect(screen.getByRole("link",{name:"Download attachment"}).getAttribute("href")).toContain(`/support/${ticket}/attachments/${id}/content`)})
test("unknown upload preserves identical identity for retry",async()=>{vi.mocked(supportAttachmentsApi.upload).mockRejectedValueOnce(new Error("result_unknown")).mockResolvedValueOnce(saved);render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);await choose();fireEvent.click(screen.getByRole("button",{name:"Attach file"}));fireEvent.click(await screen.findByRole("button",{name:"Retry same attachment"}));await screen.findByText("Attachment added to the conversation.");expect(vi.mocked(supportAttachmentsApi.upload).mock.calls[0]).toEqual(vi.mocked(supportAttachmentsApi.upload).mock.calls[1])})
test("unknown result can reconcile from immutable metadata without another upload",async()=>{vi.mocked(supportAttachmentsApi.upload).mockRejectedValue(new Error("result_unknown"));render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);await choose();fireEvent.click(screen.getByRole("button",{name:"Attach file"}));await screen.findByRole("button",{name:"Retry same attachment"});const key=vi.mocked(supportAttachmentsApi.upload).mock.calls[0][1];vi.mocked(supportAttachmentsApi.list).mockResolvedValue([{...saved,id:key}]);fireEvent.click(screen.getByRole("button",{name:"Check saved attachments"}));await screen.findByText("Saved attachment confirmed.");expect(supportAttachmentsApi.upload).toHaveBeenCalledOnce()})
test("read-only and closed conversations disable uploads",async()=>{render(<SupportAttachments ticket={ticket} en canWrite={false} closed={false}/>);expect((await screen.findByLabelText("Choose support file")).matches(":disabled")).toBe(true);expect(supportAttachmentsApi.upload).not.toHaveBeenCalled()})
test("staff attachments use the protected staff content route",async()=>{vi.mocked(supportAttachmentsApi.list).mockResolvedValue([saved]);render(<SupportAttachments ticket={ticket} en canWrite={false} closed staff/>);await screen.findByText("shot.png");expect(screen.getByRole("link",{name:"Download attachment"}).getAttribute("href")).toContain("/api/v1/admin/support/");expect(screen.queryByLabelText("Choose support file")).toBeNull()})
test("rejected upload preserves selected file without pretending success",async()=>{vi.mocked(supportAttachmentsApi.upload).mockRejectedValue(new Error("attachment_limit"));render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);await choose();fireEvent.click(screen.getByRole("button",{name:"Attach file"}));await screen.findByRole("alert");expect(screen.getByText("shot.png")).toBeTruthy();expect(screen.queryByText("Attachment added to the conversation.")).toBeNull()})

test("selected screenshot previews locally and removal sends nothing",async()=>{
 render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);await choose()
 expect(screen.getByRole("img",{name:"Selected screenshot preview"}).getAttribute("src")).toBe("data:image/png;base64,png-base64")
 expect(supportAttachmentsApi.upload).not.toHaveBeenCalled()
 fireEvent.click(screen.getByRole("button",{name:"Remove selected file"}))
 expect(screen.queryByRole("img")).toBeNull();expect(supportAttachmentsApi.upload).not.toHaveBeenCalled()
})
test("account change clears a selected private screenshot preview",async()=>{
 render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);await choose()
 act(()=>sessionLifecycle.authenticated("preview-other-owner",sessionLifecycle.capture()))
 expect(screen.queryByRole("img")).toBeNull();expect(screen.queryByText("shot.png")).toBeNull()
})
test("failed local preview is reported without uploading or losing the selected file",async()=>{
 render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);await choose()
 fireEvent.error(screen.getByRole("img"));await screen.findByText("This image preview could not be displayed; check the selected file.")
 expect(screen.getByRole("button",{name:"Remove selected file"})).toBeTruthy()
 expect(screen.getByText("shot.png")).toBeTruthy();expect(supportAttachmentsApi.upload).not.toHaveBeenCalled()
})

test("PDF selection has a file summary and never embeds the document",async()=>{render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);fireEvent.change(await screen.findByLabelText("Choose support file"),{target:{files:[new File(["pdf"],"evidence.pdf",{type:"application/pdf"})]}});await screen.findByText("evidence.pdf");expect(screen.queryByRole("img")).toBeNull();expect(document.querySelector("iframe,object,embed")).toBeNull();expect(supportAttachmentsApi.upload).not.toHaveBeenCalled()})
test("JPEG selection uses an image preview with the matching media type",async()=>{render(<SupportAttachments ticket={ticket} en canWrite closed={false}/>);fireEvent.change(await screen.findByLabelText("Choose support file"),{target:{files:[new File(["jpg"],"photo.jpg",{type:"image/jpeg"})]}});expect((await screen.findByRole("img",{name:"Selected screenshot preview"})).getAttribute("src")).toBe("data:image/jpeg;base64,png-base64");expect(supportAttachmentsApi.upload).not.toHaveBeenCalled()})

test("authorized staff upload uses the protected staff endpoint",async()=>{vi.mocked(supportAttachmentsApi.upload).mockResolvedValue(saved);render(<SupportAttachments ticket={ticket} en canWrite closed={false} staff/>);await choose();fireEvent.click(screen.getByRole("button",{name:"Attach file"}));await screen.findByText("Attachment added to the conversation.");expect(vi.mocked(supportAttachmentsApi.upload).mock.calls[0][5]).toBe(true)})
