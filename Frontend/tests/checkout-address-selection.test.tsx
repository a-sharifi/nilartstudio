import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import CheckoutAddressSelection from '../src/features/payments/CheckoutAddressSelection'
const mocks=vi.hoisted(()=>({save:vi.fn()}))
vi.mock('../src/features/customer/api',()=>({addressApi:{save:mocks.save}}))
afterEach(()=>{cleanup();vi.clearAllMocks()})
const first={id:'00000000-0000-4000-8000-000000000001',version:2,label:'Home',default:true,name:'First recipient',phone:'9123456789',province:'تهران',city:'تهران',street:'First street, building 12',postal:'1234567890'}
const second={...first,id:'00000000-0000-4000-8000-000000000002',label:'Work',default:false,name:'Second recipient',street:'Second street, building 34'}
it('uses reference address cards with full recipient details and a delivery preview',()=>{
 const select=vi.fn()
 render(<CheckoutAddressSelection addresses={[first,second]} selectedId={first.id} onSelect={select} onSaved={vi.fn()} language={1}/>)
 expect(screen.getByRole('radiogroup',{name:'Delivery address'})).toBeTruthy()
 expect(screen.getByText('Default address')).toBeTruthy()
 expect(screen.getByText('Selected for this order')).toBeTruthy()
 expect(screen.getByRole('heading',{name:'Deliver to'})).toBeTruthy()
 expect(screen.getAllByText('First street, building 12')).toHaveLength(2)
 fireEvent.click(screen.getAllByRole('radio')[1])
 expect(select).toHaveBeenCalledWith(second.id)
 expect(mocks.save).not.toHaveBeenCalled()
 expect(screen.getByRole('button',{name:'Add new address'})).toBeTruthy()
})
it('disables destination changes while payment is being initiated',()=>{
 render(<CheckoutAddressSelection addresses={[first]} selectedId={first.id} onSelect={vi.fn()} onSaved={vi.fn()} language={1} blocked/>)
 expect((screen.getByRole('radio') as HTMLInputElement).disabled).toBe(true)
 expect((screen.getByRole('button',{name:'Add new address'}) as HTMLButtonElement).disabled).toBe(true)
})
