import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import RegistrationPasswordPage from '../src/design/RegistrationPasswordPage'
afterEach(cleanup)
for(const [target,expected] of [[null,'/en/account'],['/account','/en/account'],['/fa/commissions/new/references','/fa/commissions/new/references']] as const){
 it(`continues verified registration to ${expected}`,async()=>{
  const navigate=vi.fn()
  render(<RegistrationPasswordPage en suffix="" target={target} navigate={navigate} resetFlow={vi.fn()} setGrant={vi.fn()} grant={{demo:false,purpose:'register',maskedPhone:'sample',token:'fixture',expiresAt:Date.now()+60000}} liveComplete={async()=>'createdSession'}/>)
  fireEvent.change(screen.getByLabelText('Password',{exact:true}),{target:{value:'sample88'}})
  fireEvent.change(screen.getByLabelText('Confirm password',{exact:true}),{target:{value:'sample88'}})
  fireEvent.click(screen.getByRole('button',{name:'Complete registration',exact:true}))
  await waitFor(()=>expect(navigate).toHaveBeenCalledWith(expected))
 })
}
