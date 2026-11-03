import type {CustomerCommission} from '../customer/commissions-api';
export default function NotebookBrief({value,en}:{value:CustomerCommission['brief']['notebook'];en:boolean}){
 if(!value)return null;
 return <section className="dash-card"><strong>{en?'Custom notebook request':'درخواست دفتر اختصاصی'}</strong><p><a href={`/${en?'en':'fa'}/products/${value.slug}`}>{en?value.title_en:value.title_fa}</a> · <bdi>{value.code}</bdi></p><p>{value.design==='custom_cover'?(en?'Custom cover artwork':'طراحی اختصاصی جلد'):(en?'Digital design on the cover':'اجرای طرح دیجیتال روی جلد')}</p><small>{en?'Final notebook and design pricing awaits review; this request is not a purchase.':'قیمت نهایی دفتر و طراحی در انتظار بررسی است؛ این درخواست، خرید قطعی نیست.'}</small></section>
}
