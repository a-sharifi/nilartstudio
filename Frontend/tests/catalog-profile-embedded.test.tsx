import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CatalogProfileEditor} from '../src/features/admin/CatalogProfilePanel'
import {catalogProfileApi} from '../src/features/admin/catalog-profile-api'
import type {NavigationGuard} from '../src/features/navigation/history-guard'
vi.mock('../src/features/admin/catalog-profile-api',async original=>({...await original<typeof import('../src/features/admin/catalog-profile-api')>(),catalogProfileApi:{read:vi.fn(),history:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
vi.mock('../src/features/admin/ApprovedGalleryEditor',()=>({default:()=>null}))
vi.mock('../src/features/navigation/NavigationGuardProvider',()=>({useNavigationGuard:()=>{throw Error('Embedded editor must use supplied guard')}}))
const id='11111111-1111-4111-8111-111111111111',content={gallery:[],specifications:[],delivery:'physical' as const,weight_grams:125,returnable:true,length_cm:21,width_cm:14.8,height_cm:1,weight_estimated:true}
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('uses the parent navigation guard, keeps measured dimensions, and publishes the SKU profile',async()=>{
 vi.mocked(catalogProfileApi.read).mockResolvedValue({kind:'skus',entity_id:id,version:2,content,published_revision:id});vi.mocked(catalogProfileApi.history).mockResolvedValue([])
 const register=vi.fn<(guard:NavigationGuard|null)=>void>(),saved=vi.fn();
 render(<CatalogProfileEditor kind="skus" id={id} en navigate={vi.fn()} registerGuard={register} onSaved={saved}/>);
 await screen.findByLabelText('Shipping weight (grams)');
 expect((screen.getByLabelText('Length (cm)') as HTMLInputElement).value).toBe('21');
 expect((screen.getByLabelText('Width (cm)') as HTMLInputElement).value).toBe('14.8');
 fireEvent.change(screen.getByLabelText('Shipping weight (grams)'),{target:{value:'220'}});
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false),proceed=vi.fn();register.mock.calls.at(-1)![0]!(proceed);expect(proceed).not.toHaveBeenCalled();confirm.mockRestore();
 fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Measured this notebook variant'}});fireEvent.click(screen.getByRole('checkbox',{name:'I reviewed the profile and publication effect.'}));
 vi.mocked(catalogProfileApi.save).mockImplementation(async(kind,target,key,body)=>({id:key,kind,entity_id:target,actor_id:id,version:3,intent:body,result:{kind,entity_id:target,version:3,content:body.content,published_revision:id},created_at:'2026-11-02T12:00:00Z'}));
 fireEvent.click(screen.getByRole('button',{name:'Publish profile'}));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 expect(vi.mocked(catalogProfileApi.save).mock.calls[0][3]).toMatchObject({action:'publish',expected_version:2,content:{weight_grams:220,length_cm:21,width_cm:14.8,height_cm:1,weight_estimated:true}});
 expect(screen.queryByRole('button',{name:'Back to list'})).toBeNull();
});
