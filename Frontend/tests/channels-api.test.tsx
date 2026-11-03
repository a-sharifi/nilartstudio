import {afterEach,expect,it,vi} from 'vitest';
import {channelsApi} from '../src/features/admin/channels-api';
import {privateRequest} from '../src/features/admin/identity-api';
vi.mock('../src/features/admin/identity-api',()=>({privateRequest:vi.fn()}));
const id='11111111-1111-4111-8111-111111111111',key='22222222-2222-4222-8222-222222222222';
afterEach(()=>vi.resetAllMocks());
it('binds publication receipts to the listing and operation',async()=>{
 const receipt={id:key,listing_id:id,kind:'sync',state:'queued',error_code:null,result:null,created_at:'2026-11-02T10:00:00Z'};
 vi.mocked(privateRequest).mockResolvedValue(receipt);
 await expect(channelsApi.sync('basalam',id,key,'a'.repeat(64))).resolves.toMatchObject({state:'queued'});
 expect(privateRequest).toHaveBeenCalledWith(`/api/v1/admin/channels/basalam/listings/${id}/sync/${key}`,'PUT',{fingerprint:'a'.repeat(64),confirmed:true});
 for(const wrong of [{...receipt,id},{...receipt,listing_id:key}]){
  vi.mocked(privateRequest).mockResolvedValue(wrong);
  await expect(channelsApi.sync('basalam',id,key,'a'.repeat(64))).rejects.toThrow('result_unknown');
 }
});
it('rejects previews from another channel or with inconsistent readiness',async()=>{
 const preview={listing_id:id,listing_version:1,channel:'basalam',settings_version:0,sku_code:'SKU-1',site_price:'150000',site_currency:'IRT',channel_price_toman:'165000',estimated_net_toman:null,available:1,payload:{},issues:[],warnings:[],ready:true,fingerprint:'a'.repeat(64)};
 vi.mocked(privateRequest).mockResolvedValue(preview);
 await expect(channelsApi.preview('basalam',id)).resolves.toMatchObject({channel_price_toman:'165000'});
 for(const wrong of [{...preview,channel:'digikala'},{...preview,issues:['missing_image']},{...preview,listing_id:key}]){
  vi.mocked(privateRequest).mockResolvedValue(wrong);
  await expect(channelsApi.preview('basalam',id)).rejects.toThrow('result_unknown');
 }
});
