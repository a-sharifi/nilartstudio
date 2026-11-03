import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,expect,it,vi} from "vitest"
import OperationalSummary from "../src/features/admin/OperationalSummary"
import {reportsApi,type ReportPage} from "../src/features/admin/reports-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
vi.mock("../src/features/admin/reports-api",()=>({reportsApi:{read:vi.fn()}}))
const totals={count:2,value:"123.450000",groups:[],wip:"25",abnormal_loss:"5",incomplete_batches:1}
const result:ReportPage={report:"inventory",filters:{as_of:"2026-10-19T00:00:00Z",from_time:null,q:"",kind:null,low:false},currency:"IRT",items:[],totals,next_cursor:null,reservation_history_available:false}
afterEach(()=>{cleanup();vi.resetAllMocks()})
it("uses one recorded cutoff for all dashboard metrics and carries it into low-stock review",async()=>{vi.mocked(reportsApi.read).mockResolvedValue(result);const navigate=vi.fn();render(<OperationalSummary en base="/en/admin" navigate={navigate}/>);await screen.findByText('123.45');const calls=vi.mocked(reportsApi.read).mock.calls;expect(calls).toHaveLength(3);expect(new Set(calls.map(c=>c[1].as_of)).size).toBe(1);expect(calls[2][1].low).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Review low stock'}));const target=new URL(navigate.mock.calls[0][0],'http://localhost');expect(target.searchParams.get('as_of')).toBe(calls[0][1].as_of);expect(target.searchParams.get('low')).toBe('true')})
it("never substitutes zero after an error and ignores late metrics following private-cache clearing",async()=>{let resolve!:(p:ReportPage)=>void;const deferred=new Promise<ReportPage>(r=>{resolve=r});vi.mocked(reportsApi.read).mockReturnValue(deferred);render(<OperationalSummary en base="/en/admin" navigate={vi.fn()}/>);await act(async()=>{sessionLifecycle.authenticated(null,sessionLifecycle.capture());resolve(result)});expect(screen.queryByText('123.45')).toBeNull();vi.mocked(reportsApi.read).mockRejectedValue(new Error('permission_denied'));fireEvent.click(screen.getByRole('button',{name:'Refresh dashboard reports'}));await screen.findByRole('alert');expect(screen.queryByText('0')).toBeNull()})
