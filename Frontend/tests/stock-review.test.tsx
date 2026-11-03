import {afterEach,expect,it,vi} from 'vitest'
import {reviewStock} from '../src/features/payments/stock-review'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const review={basket_version:3,fingerprint:'a'.repeat(64),settings_version:1,reservation_minutes:15,components:[],positions:[],ready:true}
afterEach(()=>vi.resetAllMocks())
it('requires the accepted basket version and internally coherent readiness',async()=>{vi.mocked(privateRequest).mockResolvedValue(review);await expect(reviewStock(3)).resolves.toMatchObject({fingerprint:review.fingerprint});vi.mocked(privateRequest).mockResolvedValue({...review,basket_version:4});await expect(reviewStock(3)).rejects.toThrow('result_unknown');vi.mocked(privateRequest).mockResolvedValue({...review,ready:false});await expect(reviewStock(3)).rejects.toThrow('result_unknown')})

it('accepts stable basket hashes separately from real order/component UUIDs',async()=>{const id='11111111-1111-4111-8111-111111111111';vi.mocked(privateRequest).mockResolvedValue({...review,components:[{line_id:id,basket_line_id:'55224b7273a3693e0d810b629c564c9d',unit_amount:'100',paid_amount:null,component:0,kind:'sku',reference_id:id,position_id:id,per_unit:1,quantity:2,title_fa:'آزمایش',title_en:'Test'}]});await expect(reviewStock(3)).resolves.toMatchObject({components:[{basket_line_id:'55224b7273a3693e0d810b629c564c9d'}]})})
