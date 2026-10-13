import type { PublishedBundle } from "../features/catalog/bundle-catalog";
import {useBundleDetail,cheapestBundleQuote,displayBundleMoney} from "../features/catalog/bundle-detail";
import { ReferenceBundleImage } from "./ReferenceMedia";

export default function PublishedBundleCard({bundle,language,onNavigate}: {
 bundle:PublishedBundle;language:0|1;onNavigate:(name:string,route:string)=>void;
}) {
 const detail=useBundleDetail(bundle);
 const quote=cheapestBundleQuote(bundle,detail.presentation,detail.products);
 const t=(fa:string,en:string)=>language===0?fa:en;
 const name=t(bundle.title_fa,bundle.title_en);
 const description=t(bundle.description_fa,bundle.description_en).split("\n\n");
 const route=`/${language===0?"fa":"en"}/bundles/${encodeURIComponent(bundle.slug)}`;
 const link=(event:React.MouseEvent<HTMLAnchorElement>)=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onNavigate(name,route);
 };
 return <article className="bundle-card"><div className="bundle-image"><ReferenceBundleImage slug={bundle.slug} language={language}/></div><div className="bundle-info"><span className="eyebrow">A LITTLE SET OF JOY</span><h3><a href={route} onClick={link}>{name}</a></h3><p>{description[0]}</p><div className="bundle-prices"><span>{quote?<>{t("از ","From ")}<strong>{displayBundleMoney(quote.price,quote.currency,language)}</strong></>:detail.status==="loading"?t("در حال دریافت قیمت…","Loading price…"):t("قیمت در دسترس نیست","Price unavailable")}</span></div>{description.slice(1).map((copy,index)=><small className="demo-price" key={index}>{copy}</small>)}<a className="text-link" href={route} onClick={link}>{t("مشاهده پکیج","View bundle")} <span aria-hidden="true">↗</span></a></div></article>;
}

export function referenceBundleOrder(a:PublishedBundle,b:PublishedBundle) {
 const order=["cats-bundle","cat-everyday-set","cat-keepsake-set"];
 const rank=(slug:string)=>order.includes(slug)?order.indexOf(slug):order.length;
 return rank(a.slug)-rank(b.slug);
}
