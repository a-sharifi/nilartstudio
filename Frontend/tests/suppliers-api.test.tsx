import {afterEach,expect,it,vi} from "vitest"
import {suppliersApi} from "../src/features/admin/suppliers-api"
import {privateRequest} from "../src/features/admin/identity-api"
import {supplierId,supplierKey,supplierRecord,supplierRevision,supplier} from "./supplier-fixture"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
afterEach(()=>vi.resetAllMocks())
it("preserves literal contact search, archive scope and cursor",async()=>{vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null});await suppliersApi.list("% contact","false",supplierId);const q=new URL(String(vi.mocked(privateRequest).mock.calls[0][0]),"http://localhost").searchParams;expect(q.get("q")).toBe("% contact");expect(q.get("active")).toBe("false");expect(q.get("cursor")).toBe(supplierId)})
it("rejects unrelated supplier and revision receipts",async()=>{vi.mocked(privateRequest).mockResolvedValue({...supplierRecord,id:supplierKey});await expect(suppliersApi.detail(supplierId)).rejects.toThrow("result_unknown");vi.mocked(privateRequest).mockResolvedValue({...supplierRevision,supplier_id:supplierKey});await expect(suppliersApi.saved(supplierId,supplierKey)).rejects.toThrow("result_unknown")})
it("treats malformed and mismatched save acknowledgements as unknown",async()=>{for(const raw of [{},{...supplierRevision,reason:"Different"},{...supplierRevision,version:3}]){vi.mocked(privateRequest).mockResolvedValue(raw);await expect(suppliersApi.save(supplierId,supplierKey,{expected_version:0,content:supplier,reason:supplierRevision.reason})).rejects.toThrow("result_unknown")}})
it("accepts only an exact saved intent",async()=>{vi.mocked(privateRequest).mockResolvedValue(supplierRevision);await expect(suppliersApi.save(supplierId,supplierKey,{expected_version:0,content:supplier,reason:supplierRevision.reason})).resolves.toEqual(supplierRevision)})
it("rejects cross-supplier history rows",async()=>{vi.mocked(privateRequest).mockResolvedValue({items:[{...supplierRevision,supplier_id:supplierKey}],next_before_version:null});await expect(suppliersApi.versions(supplierId)).rejects.toThrow("result_unknown")})
