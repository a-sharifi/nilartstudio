import type {SupplierContent,SupplierRecord,SupplierRevision} from "../src/features/admin/suppliers-api"
export const supplierId="00000000-0000-4000-8000-000000000001",supplierKey="00000000-0000-4000-8000-000000000002",supplierStamp="2026-10-18T08:00:00Z"
export const supplier:SupplierContent={kind:"supplier",code:"SUP-A",title_fa:"تأمین‌کننده",title_en:"Private supplier",contact_name:"Private contact",phone:"",email:"",address:"Private address",notes:"Private notes",active:true}
export const supplierRecord:SupplierRecord={id:supplierId,version:1,content:supplier,updated_at:supplierStamp}
export const supplierRevision:SupplierRevision={revision_id:supplierKey,supplier_id:supplierId,actor_id:supplierId,expected_version:0,version:1,content:supplier,reason:"Recorded supplier",created_at:supplierStamp}
