import {fireEvent,render,screen,waitFor,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import OtpRequestForm from '../src/design/OtpRequestForm'
afterEach(()=>{cleanup();vi.useRealTimers()})
const props={en:true,suffix:'',navigate:vi.fn(),phone:'9991881995',setPhone:vi.fn(),country:'IR',setCountry:vi.fn(),onContext:vi.fn(),onContinue:vi.fn(),purpose:'register' as const}
it('uses the server retry period and restores the request button',async()=>{
 vi.useFakeTimers({shouldAdvanceTime:true})
 render(<OtpRequestForm {...props} liveRequest={async()=>({status:'limited',retryAfterSeconds:2})}/> )
 fireEvent.click(screen.getByRole('button',{name:'Get verification code'}))
 await waitFor(()=>expect(screen.getByText(/You can request another code/).textContent).toContain('2 seconds'))
 expect((screen.getByRole('button',{name:'Get verification code'}) as HTMLButtonElement).disabled).toBe(true)
 await vi.advanceTimersByTimeAsync(2100)
 await waitFor(()=>expect((screen.getByRole('button',{name:'Get verification code'}) as HTMLButtonElement).disabled).toBe(false))
})
it('does not permanently block requests when retry metadata is absent',async()=>{
 render(<OtpRequestForm {...props} liveRequest={async()=>({status:'limited'})}/> )
 fireEvent.click(screen.getByRole('button',{name:'Get verification code'}))
 await screen.findByText('Too many requests. Please try again shortly.')
 expect((screen.getByRole('button',{name:'Get verification code'}) as HTMLButtonElement).disabled).toBe(false)
 expect(screen.queryByText(/simulated countdown/)).toBeNull()
})
