import {useState} from "react";
import "./sample-stationery.css";
import BundleStillLife from "./BundleStillLife";
import Mockup from "./Mockup";

// Explicit associations with the pinned design catalog; never guess visuals for other products.
const visuals: Record<string, { color: string; kind: string }> = {
  "cats-sketchbook-127gsm": { color: "sage", kind: "book" },
  "notebook-ghosts": { color: "lilac", kind: "book" },
  "sticker-cows": { color: "sand", kind: "stickers" },
  "bookmark-love": { color: "rose", kind: "bookmark" },
  "cat-ruled": { color: "sage", kind: "book" },
  "cat-ruled-hard": { color: "sage", kind: "book" },
  "cat-stickers": { color: "sage", kind: "stickers" },
  "cat-bookmark": { color: "sage", kind: "bookmark" },
};
const photos=["notebook-pencils","notebook-stack","stationery-flatlay","stationery-desk"];
const notebookPhotos:Record<string,number>={"cats-sketchbook-127gsm":0,"notebook-ghosts":1,"cat-ruled":2,"cat-ruled-hard":3};
const bundlePhotos:Record<string,number>={"cats-bundle":0,"cat-everyday-set":2,"cat-keepsake-set":3};
export const hasStationeryPhoto=(slug:string)=>slug in notebookPhotos;
function StationeryPhoto({photo,language}:{photo:number;language:0|1}){
 const src=`/sample-stationery/${photos[photo%photos.length]}.jpg`;
 const [failed,setFailed]=useState("");
 if(failed===src)return <span>{language===0?"تصویر در دسترس نیست":"Image unavailable"}</span>;
 return <div className="sample-catalog-photo">
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={src} alt={language===0?"عکس نمونه دفتر و لوازم نوشتن":"Sample notebook and stationery photograph"} onError={()=>setFailed(src)} decoding="async"/>
  <small>{language===0?"عکس نمونه":"Sample photo"}</small>
 </div>;
}
export function ReferenceProductImage({slug,language,view=0}:{slug:string;language:0|1;view?:number}){
 if(hasStationeryPhoto(slug))return <StationeryPhoto photo={notebookPhotos[slug]+view} language={language}/>;
 const visual=visuals[slug];
 return visual?<Mockup {...visual}/>:<span>{language===0?"تصویر در دسترس نیست":"Image unavailable"}</span>;
}
export function ReferenceBundleImage({slug,language,view=0}:{slug:string;language:0|1;view?:number}){
 if(slug in bundlePhotos&&(view===2||view===3))return <BundleStillLife view={view} renderMedia={(color,kind)=><Mockup color={color} kind={kind}/>}/>;
 if(slug in bundlePhotos)return <StationeryPhoto photo={bundlePhotos[slug]+view} language={language}/>;
 return <span>{language===0?"تصویر در دسترس نیست":"Image unavailable"}</span>;
}
