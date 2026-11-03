import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import ShipmentTracking from '../src/features/customer/ShipmentTracking'
import {privateRequest} from '../src/features/admin/identity-api'
import {sessionLifecycle} from '../src/features/identity/session-lifecycle'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',parcel='22222222-2222-4222-8222-222222222222'
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('shows recorded parcel tracking and clears it when the private session changes',async()=>{vi.mocked(privateRequest).mockResolvedValue({order_id:id,items:[{id:parcel,status:'dispatched',quantities:{[id]:1},carrier:'Sandbox post',tracking:'TEST-TRACK',dispatched_at:'2026-10-19T12:00:00Z',delivered_at:null,return_until:null}],next_cursor:null});render(<ShipmentTracking id={id} en/>);await screen.findByText('Sandbox post',{exact:false});expect(screen.getByText('TEST-TRACK',{exact:true})).toBeTruthy();sessionLifecycle.authenticated(null,sessionLifecycle.capture());await waitFor(()=>expect(screen.queryByText('TEST-TRACK',{exact:true})).toBeNull())})
it('rejects a response for a different owned order',async()=>{vi.mocked(privateRequest).mockResolvedValue({order_id:parcel,items:[],next_cursor:null});render(<ShipmentTracking id={id} en/>);expect((await screen.findByRole('alert')).textContent).toBe('Unable to load parcel tracking.')})
