import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import type {ReactNode} from "react"
import {afterEach,expect,it,vi} from "vitest"
import RecipesPanel from "../src/features/admin/RecipesPanel"
import {recipesApi} from "../src/features/admin/recipes-api"
import {sessionLifecycle} from "../src/features/identity/session-lifecycle"
import {record,revision,recipeId} from "./recipe-fixture"
vi.mock("../src/design/AdminDashboard",()=>({default:({live}:{live:{children:ReactNode}})=><main>{live.children}</main>}))
vi.mock("../src/features/identity/use-account-access",()=>({useAccountAccess:()=>({access:{permissions:["pricing.publish"]}})}))
vi.mock("../src/features/navigation/NavigationGuardProvider",()=>({useNavigationGuard:()=>()=>{}}))
vi.mock("../src/features/admin/recipes-api",async original=>({...await original<typeof import("../src/features/admin/recipes-api")>(),recipesApi:{detail:vi.fn(),versions:vi.fn(),list:vi.fn()}}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it("clears private recipe, rates and unsaved inputs on session changes",async()=>{vi.mocked(recipesApi.detail).mockResolvedValue(record);vi.mocked(recipesApi.versions).mockResolvedValue({items:[revision],next_before_version:null});render(<RecipesPanel path={`/en/admin/recipes/${recipeId}`} navigate={()=>{}}/>);const name=await screen.findByLabelText("English recipe name");fireEvent.change(name,{target:{value:"Private unsaved recipe"}});act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));expect(screen.queryByDisplayValue("Private unsaved recipe")).toBeNull();expect(screen.queryByText("Inside paper")).toBeNull();expect(screen.queryByRole("region",{name:"Recipe cost calculator"})).toBeNull()})
it("ignores a detail received after session clearing",async()=>{let complete!:(value:typeof record)=>void;vi.mocked(recipesApi.detail).mockImplementation(()=>new Promise(resolve=>{complete=resolve}));vi.mocked(recipesApi.versions).mockResolvedValue({items:[revision],next_before_version:null});render(<RecipesPanel path={`/en/admin/recipes/${recipeId}`} navigate={()=>{}}/>);act(()=>sessionLifecycle.authenticated(null,sessionLifecycle.capture()));await act(async()=>complete(record));expect(screen.queryByLabelText("English recipe name")).toBeNull()})
