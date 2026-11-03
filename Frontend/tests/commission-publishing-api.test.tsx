import {expect,test} from "vitest"
import {readPreview} from "../src/features/admin/commission-publishing-api"
function file(bytes:Uint8Array,type="image/png",size=bytes.length){return {size,type,arrayBuffer:async()=>bytes.buffer} as File}
test("preview encodes bounded PNG bytes",async()=>{const bytes=new Uint8Array([137,80,78,71,13,10,26,10,1,2]);expect(await readPreview(file(bytes))).toBe(btoa(String.fromCharCode(...bytes)))})
test("wrong types, signatures and oversized previews are rejected",async()=>{await expect(readPreview(file(new Uint8Array([1,2,3])))).rejects.toThrow("invalid_preview");await expect(readPreview(file(new Uint8Array(0)))).rejects.toThrow("invalid_preview");await expect(readPreview(file(new Uint8Array([1]),"image/jpeg"))).rejects.toThrow("invalid_preview");await expect(readPreview(file(new Uint8Array([1]),"image/png",5*1024*1024+1))).rejects.toThrow("invalid_preview")})
