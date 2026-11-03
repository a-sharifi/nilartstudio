import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import CancellationFinancialClosure from '../src/features/admin/CancellationFinancialClosure'
import {financialClosuresApi} from '../src/features/admin/financial-closures-api'
vi.mock('../src/features/admin/financial-closures-api',()=>({financialClosuresApi:{plan:vi.fn(),history:vi.fn(),save:vi.fn(),saved:vi.fn()}}))
const plan={order_id:'order',request_id:'request',expected_version:2,request_version:3,payment_id:'payment',payment_version:4,inquiry_id:'inquiry',eligible:true,closed:false,issue:null}
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('preserves the exact uncertain closure for recovery and marks no money moved',async()=>{
 vi.mocked(financialClosuresApi.plan).mockResolvedValue(plan);vi.mocked(financialClosuresApi.history).mockResolvedValue([]);vi.mocked(financialClosuresApi.save).mockRejectedValue(new Error('result_unknown'));vi.mocked(financialClosuresApi.saved).mockImplementation(async()=>{vi.mocked(financialClosuresApi.plan).mockResolvedValue({...plan,eligible:false,closed:true});return {} as never})
 render(<CancellationFinancialClosure id="request" en revision={0} canWrite blocked={false} onDirty={()=>{}} navigate={vi.fn()}/> )
 fireEvent.change(await screen.findByLabelText('Financial closure reason'),{target:{value:'Confirmed gateway rejection reviewed'}})
 fireEvent.click(screen.getByRole('button',{name:'Close without payment or refund'}))
 await screen.findByText('Result unconfirmed. Check the receipt or retry the same action.')
 const [id,key,body]=vi.mocked(financialClosuresApi.save).mock.calls[0]
 fireEvent.click(screen.getByRole('button',{name:'Check closure receipt'}))
 await waitFor(()=>expect(financialClosuresApi.saved).toHaveBeenCalledWith(id,key,body))
 expect(await screen.findByText('No-payment closure is recorded; check the current order and payment status.')).toBeTruthy()
})
it('blocks unknown results and does not render a write action without finance permission',async()=>{
 vi.mocked(financialClosuresApi.plan).mockResolvedValue({...plan,eligible:false,issue:'confirmed_rejection_required'});vi.mocked(financialClosuresApi.history).mockResolvedValue([])
 render(<CancellationFinancialClosure id="request" en revision={0} canWrite={false} blocked={false} onDirty={()=>{}} navigate={vi.fn()}/> )
 expect(await screen.findByText('A fresh inquiry confirming rejected payment is required. A browser return alone is insufficient.')).toBeTruthy()
 expect(screen.queryByLabelText('Financial closure reason')).toBeNull()
})
