import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import PromotionsPanel from '../src/features/admin/PromotionsPanel';
import {privateRequest} from '../src/features/admin/identity-api';

const state=vi.hoisted(()=>({guard:vi.fn()}));
vi.mock('../src/design/AdminDashboard',()=>({default:({live}:{live:{children:ReactNode}})=><main>{live.children}</main>}));
vi.mock('../src/features/identity/use-account-access',()=>({useAccountAccess:()=>({access:{permissions:['catalog.manage','pricing.publish']}})}));
vi.mock('../src/features/navigation/NavigationGuardProvider',()=>({useNavigationGuard:()=>state.guard}));
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}));
vi.mock('../src/features/admin/ApprovedGalleryEditor',()=>({default:()=>null}));
vi.mock('../src/components/ui/PersianDateTimePicker',()=>({default:({label,value}:{label:string;value:string|null})=><label>{label}<input value={value||''} readOnly/></label>}));
vi.mock('../src/components/ui/Dropdown',()=>({default:({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void})=><label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}));
const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
const banner={tone:'terracotta',active:true,text_fa:'خرید اول',text_en:'Welcome',code:'WELCOME-NIL-100',link:'/fa/shop',starts_at:null,ends_at:null,gallery:[]};
const sale={kind:'sku',target_id:first,title:'Notebook',sale_amount:'900',starts_at:'2026-11-01T00:00:00Z',ends_at:'2026-12-01T00:00:00Z',active:true};
const content={banner,banners:[{...banner,id:first,code:'',text_fa:'دفتر',text_en:'Notebook'},{...banner,id:second,code:'',text_fa:'هنر',text_en:'Art'}],sales:[sale]};
beforeEach(()=>{
 vi.mocked(privateRequest).mockImplementation(async(path,method,body)=>method==='PUT'?{version:5,content:(body as {content:unknown}).content}:path.endsWith('/choices')?[]:{version:4,content});
});
afterEach(()=>{cleanup();vi.resetAllMocks()});

it('adds and reorders independent banners while preserving the primary coupon and sale settings',async()=>{
 render(<PromotionsPanel path="/en/admin/promotions" navigate={vi.fn()}/>);
 await screen.findByDisplayValue('Welcome');
 const art=screen.getByDisplayValue('Art').closest('details')!;
 fireEvent.click(within(art).getByRole('button',{name:'Move earlier'}));
 fireEvent.click(screen.getByRole('button',{name:'Add banner ＋'}));
 const rows=document.querySelectorAll<HTMLDetailsElement>('.promotion-banner-editor');
 fireEvent.change(within(rows[3]).getByLabelText('Persian text'),{target:{value:'پیشنهاد تازه'}});
 fireEvent.change(screen.getByLabelText('Reason for change'),{target:{value:'Add another announcement'}});
 fireEvent.click(screen.getByRole('button',{name:'Save settings'}));
 await screen.findByText('Banners and special offers saved.');
 const call=vi.mocked(privateRequest).mock.calls.find(([,method])=>method==='PUT')!;
 const body=call[2] as {expected_version:number;content:typeof content};
 expect(body.expected_version).toBe(4);
 expect(body.content.banner).toEqual(banner);
 expect(body.content.sales).toEqual([sale]);
 expect(body.content.banners.map(b=>b.id).slice(0,2)).toEqual([second,first]);
 expect(body.content.banners[2]).toMatchObject({text_fa:'پیشنهاد تازه',active:false});
});

it('freezes edits after an uncertain save and retries the same operation and payload',async()=>{
 let writes=0;
 vi.mocked(privateRequest).mockImplementation(async(path,method,body)=>{
  if(method==='PUT'){if(++writes===1)throw Error('network_error');return {version:5,content:(body as {content:unknown}).content}}
  return path.endsWith('/choices')?[]:{version:4,content};
 });
 render(<PromotionsPanel path="/en/admin/promotions" navigate={vi.fn()}/>);
 await screen.findByDisplayValue('Welcome');
 fireEvent.change(screen.getByLabelText('Reason for change'),{target:{value:'Keep existing announcements'}});
 fireEvent.click(screen.getByRole('button',{name:'Save settings'}));
 const retry=await screen.findByRole('button',{name:'Check the same operation'});
 expect((screen.getByLabelText('Reason for change') as HTMLInputElement).disabled).toBe(true);
 expect(document.querySelector('fieldset')?.disabled).toBe(true);
 fireEvent.click(retry);
 await waitFor(()=>expect(screen.getByText('Banners and special offers saved.')).toBeTruthy());
 const calls=vi.mocked(privateRequest).mock.calls.filter(([,method])=>method==='PUT');
 expect(calls).toHaveLength(2);
 expect(calls[1]).toEqual(calls[0]);
});
