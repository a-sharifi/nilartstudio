import {afterEach,expect,it,vi} from "vitest"
import {discountsApi} from "../src/features/admin/discounts-api"
import {privateRequest} from "../src/features/admin/identity-api"
import {discountId,discountKey,discountRecord,discountRevision,discount} from "./discount-fixture"
vi.mock("../src/features/admin/identity-api",()=>({privateRequest:vi.fn()}))
afterEach(()=>vi.resetAllMocks())
it("preserves literal contact search, archive scope and cursor",async()=>{vi.mocked(privateRequest).mockResolvedValue({items:[],next_cursor:null});await discountsApi.list("% code","false",discountId);const q=new URL(String(vi.mocked(privateRequest).mock.calls[0][0]),"http://localhost").searchParams;expect(q.get("q")).toBe("% code");expect(q.get("active")).toBe("false");expect(q.get("cursor")).toBe(discountId)})
it("rejects unrelated discount and revision receipts",async()=>{vi.mocked(privateRequest).mockResolvedValue({...discountRecord,id:discountKey});await expect(discountsApi.detail(discountId)).rejects.toThrow("result_unknown");vi.mocked(privateRequest).mockResolvedValue({...discountRevision,discount_id:discountKey});await expect(discountsApi.saved(discountId,discountKey)).rejects.toThrow("result_unknown")})
it("treats malformed and mismatched save acknowledgements as unknown",async()=>{for(const raw of [{},{...discountRevision,reason:"Different"},{...discountRevision,version:3}]){vi.mocked(privateRequest).mockResolvedValue(raw);await expect(discountsApi.save(discountId,discountKey,{expected_version:0,content:discount,reason:discountRevision.reason})).rejects.toThrow("result_unknown")}})
it("accepts only an exact saved intent",async()=>{vi.mocked(privateRequest).mockResolvedValue(discountRevision);await expect(discountsApi.save(discountId,discountKey,{expected_version:0,content:discount,reason:discountRevision.reason})).resolves.toEqual(discountRevision)})
it("rejects cross-discount history rows",async()=>{vi.mocked(privateRequest).mockResolvedValue({items:[{...discountRevision,discount_id:discountKey}],next_before_version:null});await expect(discountsApi.versions(discountId)).rejects.toThrow("result_unknown")})
