import {afterEach,expect,it,vi} from 'vitest'
import {bundleAuthoringApi,type BundleCommand} from '../src/features/admin/bundle-authoring-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222'
const content={slug:'bundle',title_fa:'پکیج',title_en:'Bundle',description_fa:'',description_en:'',collection_ids:[],components:[],gallery:[],discount_kind:'fixed' as const,discount_amount:'0',packaging_cost:null,service_cost:null,allow_discount_stacking:false}
const body:BundleCommand={expected_version:0,action:'draft',content,reason:'Reviewed bundle draft'}
const record={id,title_fa:'پکیج',title_en:'Bundle',slug:'bundle',version:1,content,published:false,published_revision:null,legacy:false}
const receipt={id:key,bundle_id:id,actor_id:id,version:1,intent:body,result:record,created_at:'2026-10-20T12:00:00Z'}
afterEach(()=>vi.resetAllMocks())
it('checks exact receipt identity, intent and version before recovery',async()=>{vi.mocked(privateRequest).mockResolvedValue(receipt);await expect(bundleAuthoringApi.saved(id,key,body)).resolves.toMatchObject({id:key});for(const invalid of [{...receipt,bundle_id:key},{...receipt,version:2},{...receipt,result:{...record,version:2}},{...receipt,intent:{...body,action:'publish'}}]){vi.mocked(privateRequest).mockResolvedValue(invalid);await expect(bundleAuthoringApi.saved(id,key,body)).rejects.toThrow('result_unknown')}})
it('distinguishes authoritative rejection from an uncertain write',async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error('Failed to fetch'));await expect(bundleAuthoringApi.save(id,key,body)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockRejectedValue(new Error('bundle_version_conflict'));await expect(bundleAuthoringApi.save(id,key,body)).rejects.toThrow('bundle_version_conflict')})
