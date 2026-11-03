import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import CancellationProcessing from '../src/features/admin/CancellationProcessing'
import {cancellationsApi} from '../src/features/admin/cancellations-api'
vi.mock('../src/features/admin/cancellations-api',()=>({cancellationsApi:{plan:vi.fn(),history:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
const plan={request_id:'request',order_id:'order',expected_version:2,request_version:2,approved:true,payment_confirmed:false,financial_closed:false,cancellable:true,processed:false,issue:null}
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('allows approved cancellation with unconfirmed payment and keeps financial review visible',async()=>{
 vi.mocked(cancellationsApi.plan).mockResolvedValue(plan)
 vi.mocked(cancellationsApi.history).mockResolvedValue([])
 vi.mocked(cancellationsApi.save).mockImplementation(async()=>{vi.mocked(cancellationsApi.plan).mockResolvedValue({...plan,cancellable:false,processed:true});return {} as never})
 render(<CancellationProcessing id="request" en revision={0} onDirty={()=>{}} canFinance navigate={vi.fn()}/> )
 const reason=await screen.findByLabelText('Cancellation processing reason')
 expect(screen.getByText(/A late successful payment requires refund review/)).toBeTruthy()
 fireEvent.change(reason,{target:{value:'Explicit unpaid cancellation'}})
 fireEvent.click(screen.getByRole('button',{name:'Cancel order and release stock'}))
 await waitFor(()=>expect(cancellationsApi.save).toHaveBeenCalledWith('request',expect.any(String),{expected_version:2,request_version:2,reason:'Explicit unpaid cancellation'}))
 expect(await screen.findByText('The order is cancelled; financial review remains open until payment is reconciled.')).toBeTruthy()
 expect(screen.queryByRole('button',{name:'Review sandbox refund'})).toBeNull()
})
it('does not claim financial review is still open after explicit no-payment closure',async()=>{
 vi.mocked(cancellationsApi.plan).mockResolvedValue({...plan,cancellable:false,processed:true,financial_closed:true})
 vi.mocked(cancellationsApi.history).mockResolvedValue([])
 render(<CancellationProcessing id="request" en revision={0} onDirty={()=>{}} canFinance navigate={vi.fn()}/> )
 await screen.findByRole('button',{name:'Refresh cancellation status'})
 await waitFor(()=>expect(screen.queryByText('Loading…')).toBeNull())
 expect(screen.queryByText('The order is cancelled; financial review remains open until payment is reconciled.')).toBeNull()
})
