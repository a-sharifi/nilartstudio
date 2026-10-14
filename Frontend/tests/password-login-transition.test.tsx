import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import PasswordForm from '../src/design/PasswordForm'
afterEach(cleanup)
for(const [target,expected] of [[null,'/en/account'],['/account','/en/account'],['/fa/cart','/fa/cart']] as const){
 it(`opens ${expected} after confirmed login`,async()=>{
  const navigate=vi.fn()
  render(<PasswordForm en suffix="" target={target} navigate={navigate} onContext={vi.fn()} phone="9991442086" setPhone={vi.fn()} country="IR" setCountry={vi.fn()} liveSignIn={async()=>'success'}/>)
  fireEvent.change(screen.getByLabelText('Password',{exact:true}),{target:{value:'sample88'}})
  fireEvent.submit(screen.getByLabelText('Password',{exact:true}).closest('form')!)
  await waitFor(()=>expect(navigate).toHaveBeenCalledWith(expected))
  expect(screen.queryByText(/account panel is not connected/)).toBeNull()
 })
}
