import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import SandboxCheckout from '../src/features/payments/SandboxCheckout'
const state=vi.hoisted(()=>({request:vi.fn(),stock:vi.fn(),review:vi.fn()}))
vi.mock('../src/features/payments/stock-review',async(importOriginal)=>({...await importOriginal<typeof import('../src/features/payments/stock-review')>(),reviewStock:state.stock}))
vi.mock('../src/features/payments/checkout-review',async original=>({...await original<typeof import('../src/features/payments/checkout-review')>(),reviewCheckout:state.review}))
const reviewed={basket_version:3,fingerprint:'a'.repeat(64),settings_version:1,reservation_minutes:15,components:[],positions:[],ready:true}
state.stock.mockResolvedValue(reviewed)
state.review.mockImplementation(async(body:{discount_code?:string})=>({basket_version:3,fingerprint:'b'.repeat(64),settings_version:1,requires_address:true,weight_grams:100,shipping_methods:[{id:'00000000-0000-4000-8000-000000000001',title_fa:'پست',title_en:'Post'}],shipping_amount:'0',tax_amount:'0',subtotal:body.discount_code?'112500':'125000',total:body.discount_code?'112500':'125000',discount_amount:'0',policy:{return_days:7,return_policy_fa:'سیاست','return_policy_en':'Reviewed policy',reservation_minutes:15},lines:[],issues:[],ready:true}))
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:state.request}))
vi.mock('../src/features/basket/store',()=>({basketStore:{load:vi.fn()},useBasket:()=>({status:'ready',data:{version:3,totals:{total:'125000'},lines:[{id:'line',quote:{name:['دفتر','Notebook']},item:{quantity:1}}]}})}))
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({enabled:true,sandbox:true,provider:'zibal_sandbox'}))))})
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks();state.stock.mockResolvedValue(reviewed)})
const id='00000000-0000-4000-8000-000000000001'
async function accept(){const method=await screen.findByRole('combobox',{name:'Shipping method'});fireEvent.click(method);fireEvent.click(await screen.findByRole('option',{name:'Post'}));await waitFor(()=>expect(screen.queryByText('Calculating order terms…')).toBeNull());fireEvent.click(screen.getByRole('checkbox'))}

it('requires address and explicit sandbox confirmation before requesting payment',async()=>{
 state.request.mockImplementation(async(path:string)=>path.includes('/panel/address')?{items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test only',postal:'1234567890'}}]}:{id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null})
 const navigate=vi.fn();render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={navigate}/>)
 const pay=await screen.findByRole('button',{name:'Pay through sandbox gateway'})
 expect((pay as HTMLButtonElement).disabled).toBe(true)
 await accept()
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
it('applies the current server discount quote and pins its version at checkout',async()=>{
 state.request.mockImplementation(async(path:string)=>path.includes('/panel/address')?{items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test',postal:'1234567890'}}]}:path==='/api/v1/discounts/quote'?{discount_id:id,version:2,code:'SAVE10',basket_version:3,amount:'12500.00',eligible:'125000.00',total:'112500',allocations:{line:'1250000'}}:{id,order_id:id,status:'unknown',reference:null,amount_rial:'1125000',sandbox:true,gateway_url:null})
 const navigate=vi.fn();render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={navigate}/>);await screen.findByRole('button',{name:'Pay through sandbox gateway'});fireEvent.change(screen.getByLabelText('Discount code'),{target:{value:'save10'}});fireEvent.click(screen.getByRole('button',{name:'Check and apply code'}));await screen.findByRole('button',{name:'Remove code'});await accept();fireEvent.click(screen.getByRole('button',{name:'Pay through sandbox gateway'}));await waitFor(()=>expect(navigate).toHaveBeenCalled());expect(state.request).toHaveBeenCalledWith('/api/v1/payments/sandbox/checkout','POST',expect.objectContaining({discount_code:'SAVE10',discount_version:2,expected_total:'112500'}))
})
it('rejects an ineligible code without allowing payment with that draft code',async()=>{
 state.request.mockImplementation(async(path:string)=>{if(path.includes('/panel/address'))return {items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test',postal:'1234567890'}}]};throw new Error('discount_not_valid')});render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={vi.fn()}/>);await screen.findByRole('button',{name:'Pay through sandbox gateway'});fireEvent.change(screen.getByLabelText('Discount code'),{target:{value:'EXPIRED'}});fireEvent.click(screen.getByRole('button',{name:'Check and apply code'}));await screen.findByText('This code is not eligible for this basket. Check validity, minimum purchase, scope and usage limits.');await accept();expect((screen.getByRole('button',{name:'Pay through sandbox gateway'}) as HTMLButtonElement).disabled).toBe(true)
})
it('retries an uncertain request with the exact same payment intent',async()=>{
 let attempts=0;state.request.mockImplementation(async(path:string)=>{if(path.includes('/panel/address'))return {items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test',postal:'1234567890'}}]};if(++attempts===1)throw new Error('result_unknown');return {id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null}})
 const navigate=vi.fn();render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={navigate}/>);const pay=await screen.findByRole('button',{name:'Pay through sandbox gateway'});await accept();fireEvent.click(pay);await screen.findByRole('alert');expect((screen.getByLabelText('Discount code') as HTMLInputElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Pay through sandbox gateway'}));await waitFor(()=>expect(navigate).toHaveBeenCalled());const calls=state.request.mock.calls.filter(call=>call[0]==='/api/v1/payments/sandbox/checkout');expect(calls).toHaveLength(2);expect(calls[0][2]).toEqual(calls[1][2])
})
it('does not navigate from a payment response after checkout is unmounted',async()=>{
 let complete!:(value:unknown)=>void;state.request.mockImplementation(async(path:string)=>{if(path.includes('/panel/address'))return {items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test',postal:'1234567890'}}]};return new Promise(resolve=>{complete=resolve})});const navigate=vi.fn();const view=render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={navigate}/>);await screen.findByRole('button',{name:'Pay through sandbox gateway'});await accept();fireEvent.click(screen.getByRole('button',{name:'Pay through sandbox gateway'}));await waitFor(()=>expect(complete).toBeTypeOf('function'));view.unmount();complete({id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null});await waitFor(()=>expect(navigate).not.toHaveBeenCalled())
})

it('blocks payment when recorded stock is incomplete and requires renewed acceptance after review',async()=>{
 state.stock.mockResolvedValue({...reviewed,ready:false,positions:[{issue:'stock_insufficient'}]})
 state.request.mockImplementation(async(path:string)=>path.includes('/panel/address')?{items:[{id,data:{name:'Sandbox',province:'Test',city:'Test',street:'Test',postal:'1234567890'}}]}:{id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null})
 render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={vi.fn()}/>);await screen.findByText('Recorded stock is insufficient or incomplete for this order. Please review your basket.');await accept();expect((screen.getByRole('button',{name:'Pay through sandbox gateway'}) as HTMLButtonElement).disabled).toBe(true);state.stock.mockResolvedValue(reviewed);fireEvent.click(screen.getByRole('button',{name:'Check stock again'}));await screen.findByText(/Reservation after starting payment/);await waitFor(()=>expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false));expect((screen.getByRole('button',{name:'Pay through sandbox gateway'}) as HTMLButtonElement).disabled).toBe(true)
})

it('checks out digital-only delivery without any address or shipping selection',async()=>{
 const original=state.review.getMockImplementation()
 try{state.review.mockResolvedValue({basket_version:3,fingerprint:'d'.repeat(64),settings_version:1,requires_address:false,weight_grams:0,shipping_methods:[],shipping_amount:'0.00',tax_amount:'0.00',subtotal:'125000',total:'125000',discount_amount:'0',policy:{return_days:7,return_policy_fa:'سیاست',return_policy_en:'Reviewed policy',reservation_minutes:15},lines:[{basket_line_id:'line',delivery:'digital',returnable:false}],issues:[],ready:true});state.request.mockImplementation(async(path:string)=>path.includes('/panel/address')?{items:[]}:{id,order_id:id,status:'unknown',reference:null,amount_rial:'1250000',sandbox:true,gateway_url:null});const navigate=vi.fn();render(<SandboxCheckout path="/en/checkout/sandbox" search="" navigate={navigate}/>);await screen.findByRole('heading',{name:'Digital delivery'});expect(screen.queryByRole('combobox',{name:'Shipping method'})).toBeNull();fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Pay through sandbox gateway'}));await waitFor(()=>expect(navigate).toHaveBeenCalled());expect(state.request).toHaveBeenCalledWith('/api/v1/payments/sandbox/checkout','POST',expect.objectContaining({address_id:null,shipping_method_id:null,checkout_fingerprint:'d'.repeat(64)}))}finally{state.review.mockImplementation(original!)}
})
