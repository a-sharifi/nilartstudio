import {afterEach,expect,test,vi} from "vitest"
import {finalFilesApi} from "../src/features/admin/final-files-api"
import {privateRequest} from "../src/features/admin/identity-api"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
const id="00000000-0000-4000-8000-000000000001",order="00000000-0000-4000-8000-000000000002"
const item={id,order_id:order,line_id:id,file_name:"Final.pdf",description:"",size:3,sha256:"0".repeat(64),version:0,created_at:"2026-10-18T10:00:00Z",updated_at:"2026-10-18T10:00:00Z",order_reference:"ORDER",active:true}
afterEach(()=>vi.resetAllMocks())
test("release rejects checksum, size and target mismatches",async()=>{const body={order_id:order,line_id:id,file_name:item.file_name,description:"",content_base64:"abc"};for(const value of [{...item,sha256:"1".repeat(64)},{...item,size:4},{...item,order_id:id}]){vi.mocked(privateRequest).mockResolvedValueOnce(value);await expect(finalFilesApi.release(id,body,3,item.sha256)).rejects.toThrow("result_unknown")}})
test("file history rejects records from another order",async()=>{vi.mocked(privateRequest).mockResolvedValueOnce({items:[item],next_cursor:null});await expect(finalFilesApi.list(id)).rejects.toThrow("result_unknown")})
test("revocation acknowledgement checks saved version and file integrity",async()=>{vi.mocked(privateRequest).mockResolvedValueOnce({...item,version:1});await expect(finalFilesApi.revoke(item,"Wrong artwork")).resolves.toMatchObject({active:false,version:1});vi.mocked(privateRequest).mockResolvedValueOnce({...item,version:0});await expect(finalFilesApi.revoke(item,"Wrong artwork")).rejects.toThrow("result_unknown")})
