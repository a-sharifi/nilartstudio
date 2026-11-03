import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import OrderStockOutcome from '../src/features/customer/OrderStockOutcome'
import {privateRequest} from '../src/features/admin/identity-api'
import {sessionLifecycle} from '../src/features/identity/session-lifecycle'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111'
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('explains a paid shortage without promising shipment, then clears private data',async()=>{vi.mocked(privateRequest).mockResolvedValue({order_id:id,state:'shortage',expires_at:'2026-10-19T12:00:00Z',issue:null});render(<OrderStockOutcome id={id} en/>);expect((await screen.findByRole('alert')).textContent).toContain('Payment was confirmed, but stock is insufficient');sessionLifecycle.authenticated(null,sessionLifecycle.capture());await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull())})
it('rejects a stock outcome for a different account order',async()=>{vi.mocked(privateRequest).mockResolvedValue({order_id:'22222222-2222-4222-8222-222222222222',state:'committed',expires_at:null,issue:null});render(<OrderStockOutcome id={id} en/>);await screen.findByText('Stock confirmation could not be loaded. Check the order status again.');expect(screen.queryByText('Stock is committed to your paid order; shipment has not yet been confirmed.')).toBeNull()})
