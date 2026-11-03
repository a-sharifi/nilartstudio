import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import NotebookImageGallery from '../src/features/catalog/NotebookImageGallery';
import {NOTEBOOK_SAMPLE_EVENT} from '../src/features/catalog/notebook-images';
vi.mock('../src/components/ui/Dropdown',()=>({default:({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void})=><label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>}));
const id='11111111-1111-4111-8111-111111111111';
const item={id,key:'gorbe/notebook/A5/writing-paper/80',spec:{design:'gorbe',title_fa:'گربه',title_en:'Cats',group:'collection',notebook_type:'notebook',size:'A5',paper:'writing-paper',sheets:80,binding:'side'},product_id:id,sku_id:id,product_slug:'gorbe-notebook',preview_only:false,images:['front','back','inside'].map((view,i)=>({asset_id:id,revision_id:id,view,url:`/api/v1/media/${id}/versions/${id}/content`,alt_fa:`نمای ${i}`,alt_en:`View ${i}`}))};
const reply=(items:unknown[],next_cursor:string|null=null)=>new Response(JSON.stringify({items,next_cursor}),{status:200,headers:{'Content-Type':'application/json'}});
beforeEach(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{fn(0);return 0})});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks()});
test('loads thumbnails only until a sample is opened and passes the pinned reference to the notebook form',async()=>{
 const fetch=vi.fn().mockResolvedValue(reply([item]));vi.stubGlobal('fetch',fetch);const picked=vi.fn();window.addEventListener(NOTEBOOK_SAMPLE_EVENT,picked);
 const view=render(<NotebookImageGallery en/>);await screen.findByRole('button',{name:'View images of Cats'});
 expect(view.container.querySelector('.notebook-library-image img')?.getAttribute('loading')).toBe('lazy');
 expect(view.container.querySelector('.notebook-library-image img')?.getAttribute('src')).toContain('?thumbnail=true');
 fireEvent.click(screen.getByRole('button',{name:'View images of Cats'}));expect(screen.getAllByRole('dialog').length).toBe(1);
 fireEvent.click(screen.getByRole('button',{name:/Customise a notebook with these specifications/}));expect(picked.mock.calls[0][0].detail.key).toBe(item.key);
 window.removeEventListener(NOTEBOOK_SAMPLE_EVENT,picked);
});
test('late responses from the previous size cannot replace the current filtered results',async()=>{
 let oldResolve:(response:Response)=>void=()=>{};
 const fetch=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{oldResolve=resolve})).mockResolvedValue(reply([]));vi.stubGlobal('fetch',fetch);
 render(<NotebookImageGallery en/>);fireEvent.change(screen.getByLabelText('Preview size'),{target:{value:'A6'}});
 await screen.findByText(/No approved images have been published/);oldResolve(reply([item]));
 await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));expect(screen.queryByRole('button',{name:'View images of Cats'})).toBeNull();expect(String(fetch.mock.calls[1][0])).toContain('size=A6');
});
test('changing to sketchbooks switches paper filters and handles unavailable media without an order action',async()=>{
 const fetch=vi.fn().mockResolvedValueOnce(reply([item])).mockResolvedValue(reply([{...item,key:'gav/sketchbook/A5/drawing-cream-127gsm/40',preview_only:true,sku_id:null,spec:{...item.spec,design:'gav',title_en:'Cows',notebook_type:'sketchbook',paper:'drawing-cream-127gsm',sheets:40,binding:'top'},images:item.images.slice(0,2)}]));vi.stubGlobal('fetch',fetch);
 render(<NotebookImageGallery en/>);await screen.findByRole('button',{name:'View images of Cats'});fireEvent.change(screen.getByLabelText('Preview type'),{target:{value:'sketchbook'}});
 await screen.findByRole('button',{name:'View images of Cows'});expect(String(fetch.mock.calls[1][0])).toContain('paper=drawing-cream-127gsm');
 fireEvent.click(screen.getByRole('button',{name:'View images of Cows'}));expect(screen.queryByRole('button',{name:/Customise a notebook with these specifications/})).toBeNull();expect(screen.getByText('Layout preview')).toBeTruthy();
});
