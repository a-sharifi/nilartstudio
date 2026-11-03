import type {DiscountContent,DiscountRecord,DiscountRevision} from "../src/features/admin/discounts-api"
export const discountId="00000000-0000-4000-8000-000000000001",discountKey="00000000-0000-4000-8000-000000000002",discountStamp="2026-10-18T08:00:00Z"
export const discount:DiscountContent={kind:"percent",code:"SAVE10",title_fa:"تخفیف",title_en:"Private discount",value:"10",minimum:"0",maximum:null,valid_from:"2026-01-01",valid_to:"2027-12-31",total_limit:null,customer_limit:null,product_ids:[],collection_ids:[],category_ids:[],customer_phones:[],allow_bundle_stacking:false,first_purchase_only:false,active:false}
export const discountRecord:DiscountRecord={id:discountId,version:1,content:discount,updated_at:discountStamp}
export const discountRevision:DiscountRevision={revision_id:discountKey,discount_id:discountId,actor_id:discountId,expected_version:0,version:1,content:discount,reason:"Recorded discount",created_at:discountStamp}
