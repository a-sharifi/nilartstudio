import {afterEach,expect,test,vi} from 'vitest'
import {privateRequest} from '../src/features/admin/identity-api'
import {sessionLifecycle} from '../src/features/identity/session-lifecycle'
afterEach(()=>vi.unstubAllGlobals())
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})}
test('overlapping commands retain a valid rotating CSRF token until each command finishes',async()=>{
 let token=0,active=0,maximum=0
 const calls:string[]=[]
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:RequestInit)=>{
  if(path.endsWith('/session/csrf')){token++;calls.push(`csrf${token}`);return json({csrf_token:`token-${token}`})}
  active++;maximum=Math.max(maximum,active)
  await new Promise(resolve=>setTimeout(resolve,10))
  const valid=(options.headers as Record<string,string>)['X-CSRF-Token']===`token-${token}`
  calls.push(path);active--
  return valid?json({ok:true}):json({code:'csrf_invalid'},403)
 }))
 await expect(Promise.all([privateRequest('/review-a','POST',{}),privateRequest('/review-b','POST',{})])).resolves.toEqual([{ok:true},{ok:true}])
 expect(maximum).toBe(1);expect(calls).toEqual(['csrf1','/review-a','csrf2','/review-b'])
})
test('a failed command releases the queue without replaying it',async()=>{
 let writes=0
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>path.endsWith('/session/csrf')?json({csrf_token:'token'}):++writes===1?json({code:'validation_error'},422):json({ok:true})))
 const results=await Promise.allSettled([privateRequest('/first','POST',{}),privateRequest('/second','POST',{})])
 expect(results[0].status).toBe('rejected');expect(results[1]).toMatchObject({status:'fulfilled',value:{ok:true}});expect(writes).toBe(2)
})
test('queued commands cannot cross an account/session change',async()=>{
 let finish!:()=>void,started!:()=>void
 const pending=new Promise<void>(resolve=>{finish=resolve}),begun=new Promise<void>(resolve=>{started=resolve});const calls:string[]=[]
 vi.stubGlobal('fetch',vi.fn(async(path:string)=>{calls.push(path);if(path.endsWith('/session/csrf'))return json({csrf_token:'token'});started();await pending;return json({ok:true})}))
 const first=privateRequest('/old-account','POST',{}),second=privateRequest('/queued','POST',{})
 const results=Promise.allSettled([first,second]);await begun
 sessionLifecycle.authenticated(null,sessionLifecycle.capture());finish()
 expect((await results).map(r=>r.status)).toEqual(['rejected','rejected']);expect(calls).toEqual(['/api/v1/auth/session/csrf','/old-account'])
})
