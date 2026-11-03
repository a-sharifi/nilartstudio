import {render,screen,fireEvent,cleanup,waitFor,act} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import PromotionBanner from '../src/features/marketing/StorefrontPromotions';
afterEach(()=>{cleanup();sessionStorage.clear();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals()});
it('renders only a server-approved banner and copies its exact discount code',async()=>{
 const copy=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:copy}});
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({banner:{text_fa:'خرید اول، ۱۰۰ هزار تخفیف',text_en:'First order discount',code:'WELCOME-NIL-100',link:'/fa/shop',gallery:[]}})}));
 render(<PromotionBanner en={false}/>);expect(await screen.findByText('خرید اول، ۱۰۰ هزار تخفیف')).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'کپی کد تخفیف'}));await waitFor(()=>expect(copy).toHaveBeenCalledWith('WELCOME-NIL-100'));expect(await screen.findByText('کپی شد')).toBeTruthy();expect(screen.getByRole('link').getAttribute('href')).toBe('/fa/shop');
});
it('does not advertise an inactive banner or retain it after unmount',async()=>{const fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({banner:null})});vi.stubGlobal('fetch',fetch);const {container}=render(<PromotionBanner en/>);await waitFor(()=>expect(fetch).toHaveBeenCalledOnce());expect(container.textContent).toBe('')});
it('lets the visitor close the banner',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({banner:{text_fa:'پیشنهاد امروز',text_en:'Today',code:'',link:'/fa/shop',gallery:[]}})}));render(<PromotionBanner en={false}/>);await screen.findByText('پیشنهاد امروز');fireEvent.click(screen.getByRole('button',{name:'بستن بنر'}));expect(screen.queryByText('پیشنهاد امروز')).toBeNull()});

const slide=(id:string,text:string)=>({id,text_fa:text,text_en:text,code:'',link:'/fa/shop',gallery:[]});
it('browses multiple banners, pauses automatic rotation and remembers dismissal for the same campaign',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({banner:null,banners:[slide('a','First offer'),slide('b','Second offer')]})}));
 const view=render(<PromotionBanner en/>);await screen.findByText('First offer');
 fireEvent.click(screen.getByRole('button',{name:'Next banner'}));expect(screen.getByText('Second offer')).toBeTruthy();expect(screen.getByRole('button',{name:'Play banners'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Previous banner'}));expect(screen.getByText('First offer')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Close banner'}));expect(screen.queryByText('First offer')).toBeNull();view.unmount();render(<PromotionBanner en/>);await act(async()=>{});expect(screen.queryByText('First offer')).toBeNull();
});
it('automatically advances, but stops on hover and for reduced-motion visitors',async()=>{
 const response={ok:true,json:async()=>({banner:null,banners:[slide('a','First offer'),slide('b','Second offer')]})};
 vi.spyOn(document,'hidden','get').mockReturnValue(false);
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response));vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 vi.useFakeTimers();render(<PromotionBanner en/>);await act(async()=>{});expect(screen.getByText('First offer')).toBeTruthy();act(()=>{vi.advanceTimersByTime(7000)});expect(screen.getByText('Second offer')).toBeTruthy();fireEvent.mouseEnter(screen.getByRole('complementary'));act(()=>{vi.advanceTimersByTime(14000)});expect(screen.getByText('Second offer')).toBeTruthy();cleanup();
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()})));render(<PromotionBanner en/>);await act(async()=>{});act(()=>{vi.advanceTimersByTime(14000)});expect(screen.getByText('First offer')).toBeTruthy();expect(screen.queryByRole('button',{name:'Pause banners'})).toBeNull();
});
