import {afterEach,expect,test,vi} from 'vitest';
import {mockupApi} from '../src/features/admin/mockup-api';
import {privateRequest} from '../src/features/admin/identity-api';
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}));
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function item(n:number){return {id:id(n),set_key:`personal-${n}/notebook/A5/writing-paper/80`,version:1,spec:{design:`personal-${n}`,title_fa:'طرح',title_en:'Design',group:'personal',notebook_type:'notebook',size:'A5',paper:'writing-paper',sheets:80,binding:'side'},target:{product_id:null,sku_id:null,collection_id:id(999)},published_run:null,inputs:null}}
afterEach(()=>vi.resetAllMocks());
test('admin includes all 120 personal-design sets across API pages instead of dropping the final twenty',async()=>{
 vi.mocked(privateRequest).mockResolvedValueOnce({items:Array.from({length:100},(_,i)=>item(i+1)),next_cursor:'personal-99'}).mockResolvedValueOnce({items:Array.from({length:20},(_,i)=>item(i+101)),next_cursor:null});
 const result=await mockupApi.sets(undefined,undefined,'personal');expect(result.items).toHaveLength(120);expect(result.items.at(-1)?.id).toBe(id(120));expect(String(vi.mocked(privateRequest).mock.calls[1][0])).toContain('cursor=personal-99');
});
test('a repeated cursor or a product-scoped response from a different product is rejected',async()=>{
 vi.mocked(privateRequest).mockResolvedValueOnce({items:[item(1)],next_cursor:'same'}).mockResolvedValueOnce({items:[item(2)],next_cursor:'same'});await expect(mockupApi.sets()).rejects.toThrow('result_unknown');
 vi.mocked(privateRequest).mockResolvedValueOnce({items:[item(3)],next_cursor:null});await expect(mockupApi.sets(id(55))).rejects.toThrow('result_unknown');
});
