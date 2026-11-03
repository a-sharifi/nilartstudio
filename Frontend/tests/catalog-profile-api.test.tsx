import {afterEach,expect,it,vi} from 'vitest'
import {catalogProfileApi,type ProfileCommand} from '../src/features/admin/catalog-profile-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222'
const content={gallery:[],specifications:[],delivery:'physical' as const,weight_grams:125,returnable:true,length_cm:null,width_cm:null,height_cm:null,weight_estimated:false}
const body:ProfileCommand={expected_version:0,action:'draft',content,reason:'Reviewed profile draft'}
const record={kind:'skus',entity_id:id,version:1,content,published_revision:null}
const receipt={id:key,kind:'skus',entity_id:id,actor_id:id,version:1,intent:body,result:record,created_at:'2026-10-21T12:00:00Z'}
afterEach(()=>vi.resetAllMocks())
it('recovers only the exact profile operation, identity, content and version',async()=>{vi.mocked(privateRequest).mockResolvedValue(receipt);await expect(catalogProfileApi.saved('skus',id,key,body)).resolves.toMatchObject({id:key});for(const invalid of [{...receipt,kind:'products'},{...receipt,entity_id:key},{...receipt,version:2},{...receipt,result:{...record,version:2}},{...receipt,intent:{...body,action:'publish'}},{...receipt,result:{...record,content:{...content,weight_grams:999}}}]){vi.mocked(privateRequest).mockResolvedValue(invalid);await expect(catalogProfileApi.saved('skus',id,key,body)).rejects.toThrow('result_unknown')}})
it('keeps network failures uncertain and returns authoritative conflicts',async()=>{vi.mocked(privateRequest).mockRejectedValue(new Error('Failed to fetch'));await expect(catalogProfileApi.save('skus',id,key,body)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockRejectedValue(new Error('profile_version_conflict'));await expect(catalogProfileApi.save('skus',id,key,body)).rejects.toThrow('profile_version_conflict')})
