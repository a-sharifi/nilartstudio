import {afterEach,expect,it,vi} from 'vitest'
import {supplierStatementsApi} from '../src/features/admin/supplier-statements-api'
import {privateRequest} from '../src/features/admin/identity-api'
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}))
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',revision='a'.repeat(64)
const report={supplier_id:id,supplier_code:'TEST',title_fa:'آزمایش',title_en:'Test',currency:'IRT',from_date:'2026-10-01',to_date:'2026-10-20',opening_balance_configured:false,opening_change:'0',opening_recorded_balance:'10',liability_change:'80',paid_net:'40',closing_recorded_balance:'50',fingerprint:revision,items:[],next_offset:null,total_entries:0}
afterEach(()=>vi.resetAllMocks())
it('binds supplier, dates and pagination revision to the returned statement',async()=>{vi.mocked(privateRequest).mockResolvedValue(report);await expect(supplierStatementsApi.load(id,report.from_date,report.to_date,25,revision)).resolves.toMatchObject({supplier_id:id});expect(privateRequest).toHaveBeenCalledWith(expect.stringContaining('fingerprint='+revision));for(const wrong of [{...report,supplier_id:other},{...report,from_date:'2026-09-01'},{...report,fingerprint:'b'.repeat(64)}]){vi.mocked(privateRequest).mockResolvedValue(wrong);await expect(supplierStatementsApi.load(id,report.from_date,report.to_date,25,revision)).rejects.toThrow('supplier_statement_changed')}})
it('exports the exact displayed filters and fingerprint',()=>{const url=supplierStatementsApi.exportUrl(id,report.from_date,report.to_date,revision,'xlsx');expect(url).toContain(`/suppliers/${id}/statement/export?`);expect(url).toContain('fingerprint='+revision);expect(url).toContain('format=xlsx')})
