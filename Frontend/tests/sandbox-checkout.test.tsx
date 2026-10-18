import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import SandboxCheckout from '../src/features/payments/SandboxCheckout'
const state=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:state.request}))
vi.mock('../src/features/basket/store',()=>({basketStore:{load:vi.fn()},useBasket:()=>({status:'ready',data:{version:3,totals:{total:'125000'},lines:[{id:'line',quote:{name:['دفتر','Notebook']},item:{quantity:1}}]}})}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const id='00000000-0000-4000-8000-000000000001'
it('requires address and explicit sandbox confirmation before requesting payment',async()=>{
 state.request.mockImplementation(async(path:string)=>path.includes('/panel/address')?{items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test only',postal:'1234567890'}}]}:{id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null})
 const navigate=vi.fn();render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={navigate}/>)
 const pay=await screen.findByRole('button',{name:'Pay with Zarinpal sandbox'})
 expect((pay as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('checkbox'))
 fireEvent.click(pay)
 await waitFor(()=>expect(navigate).toHaveBeenCalledWith(`/en/payment/result?id=${id}`))
 expect(state.request).toHaveBeenCalledWith('/api/v1/payments/sandbox/checkout','POST',expect.objectContaining({basket_version:3,address_id:id,expected_total:'125000',sandbox_confirmed:true}))
})
it('shows verified result from server, never from callback query status',async()=>{
 state.request.mockResolvedValue({id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null})
 render(<SandboxCheckout path="/en/payment/result" search={`id=${id}&Status=OK`} navigate={vi.fn()}/>)
 expect(await screen.findByRole('status')).toBeTruthy()
 expect(await screen.findByText('Payment outcome is unknown; do not pay again')).toBeTruthy()
 expect(screen.queryByText('Sandbox payment verified')).toBeNull()
})
