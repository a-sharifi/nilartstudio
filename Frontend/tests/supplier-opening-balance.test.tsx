import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import SupplierOpeningBalance from '../src/features/admin/SupplierOpeningBalance'
import {supplierOpeningsApi} from '../src/features/admin/supplier-openings-api'
vi.mock('../src/features/admin/supplier-openings-api',async original=>({...await original<typeof import('../src/features/admin/supplier-openings-api')>(),supplierOpeningsApi:{current:vi.fn(),history:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('requires explicit zero confirmation and retains the exact uncertain command',async()=>{
 vi.mocked(supplierOpeningsApi.current).mockResolvedValue(null);vi.mocked(supplierOpeningsApi.history).mockResolvedValue({items:[],next_before_version:null});vi.mocked(supplierOpeningsApi.save).mockRejectedValue(new Error('result_unknown'));vi.mocked(supplierOpeningsApi.saved).mockResolvedValue({} as never)
 const onSaved=vi.fn();render(<SupplierOpeningBalance id="supplier" en canWrite guardRef={{current:null}} onSaved={onSaved}/> )
 await screen.findByText('Opening is not configured. Zero also requires explicit confirmation.')
 fireEvent.change(screen.getByLabelText('Opening amount (toman)'),{target:{value:'0'}});fireEvent.change(screen.getByLabelText('Opening date (before first financial activity)'),{target:{value:'2020-01-01'}});fireEvent.change(screen.getByLabelText('Opening evidence reference'),{target:{value:'External statement'}});fireEvent.change(screen.getByLabelText('Entry or correction reason'),{target:{value:'Explicit zero confirmation'}})
 expect((screen.getByRole('button',{name:'Confirm opening balance'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByLabelText('This amount excludes purchases and payments already recorded in the system.'));fireEvent.click(screen.getByRole('button',{name:'Confirm opening balance'}))
 await screen.findByText('Result unconfirmed. Check the receipt or retry the same entry.')
 const [id,key,body]=vi.mocked(supplierOpeningsApi.save).mock.calls[0];expect(body.amount).toBe('0');expect(body.currency).toBe('IRT')
 fireEvent.click(screen.getByRole('button',{name:'Check opening receipt'}));await waitFor(()=>expect(supplierOpeningsApi.saved).toHaveBeenCalledWith(id,key,body));expect(onSaved).toHaveBeenCalledOnce()
})
it('does not render an opening write form for read-only finance staff',async()=>{vi.mocked(supplierOpeningsApi.current).mockResolvedValue(null);vi.mocked(supplierOpeningsApi.history).mockResolvedValue({items:[],next_before_version:null});render(<SupplierOpeningBalance id="supplier" en canWrite={false} guardRef={{current:null}} onSaved={vi.fn()}/>);await screen.findByText('Opening is not configured. Zero also requires explicit confirmation.');expect(screen.queryByLabelText('Opening amount (toman)')).toBeNull()})
it('does not report unconfigured or assume zero when the initial lookup fails',async()=>{vi.mocked(supplierOpeningsApi.current).mockRejectedValue(new Error('service_unavailable'));vi.mocked(supplierOpeningsApi.history).mockResolvedValue({items:[],next_before_version:null});render(<SupplierOpeningBalance id="supplier" en canWrite guardRef={{current:null}} onSaved={vi.fn()}/>);await screen.findByText('Unable to load opening balance.');expect(screen.queryByText('Opening is not configured. Zero also requires explicit confirmation.')).toBeNull();expect((screen.getByLabelText('Opening amount (toman)').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(true)})
