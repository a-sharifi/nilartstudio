import {cleanup,renderHook,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {useBundleAvailability} from '../src/features/catalog/bundle-detail'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('keeps digital delivery available without inventing a physical capacity',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({configured:true,capacity:null,unlimited:true})}));const {result}=renderHook(()=>useBundleAvailability('digital-bundle',{},true));await waitFor(()=>expect(result.current.status).toBe('normal'));expect(result.current.configured).toBe(true);expect(result.current.capacity).toBeNull();expect(result.current.unlimited).toBe(true)})
it('rejects contradictory physical and unlimited capacity claims',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({configured:true,capacity:'100',unlimited:true})}));const {result}=renderHook(()=>useBundleAvailability('digital-bundle',{},true));await waitFor(()=>expect(result.current.status).toBe('error'))})
