import type {CostContent,CostResource,CostRevision} from "../src/features/admin/costing-api"
export const costId="00000000-0000-4000-8000-000000000001",costRevisionId="00000000-0000-4000-8000-000000000002",costStamp="2026-10-17T08:00:00Z"
export const resourceContent:CostContent={kind:"material",code:"PAPER-A",title_fa:"کاغذ آزمایش",title_en:"Private test paper",base_unit:"sheet",purchase_unit:"pack",purchase_to_base:"250",supplier:"Private supplier",width_mm:null,height_mm:null,grammage:"127",rate:{amount:"12.000001",currency:"IRT"},valid_from:null,valid_to:null,active:true,zero_rate_acknowledged:false}
export const costResource:CostResource={id:costId,version:1,content:resourceContent,updated_at:costStamp}
export const costVersion:CostRevision={revision_id:costRevisionId,resource_id:costId,actor_id:costId,expected_version:0,version:1,content:resourceContent,reason:"Private source definition",created_at:costStamp}
