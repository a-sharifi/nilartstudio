'use client';

import {useEffect, useState} from 'react';
import {z} from 'zod';
import {imageSetPage} from '../catalog/notebook-images';
import './home-product-collage.css';

const product = z.object({
  id:z.string().uuid(), slug:z.string().regex(/^[a-z0-9_-]+$/),
  image_url:z.string().startsWith('/api/v1/media/').nullable().optional(),
  image_alt_fa:z.string().optional(), image_alt_en:z.string().optional(),
});
const gallery = z.object({gallery:z.array(z.object({
  asset_id:z.string().uuid(), revision_id:z.string().uuid(), alt_fa:z.string(), alt_en:z.string(),
}))});
type Piece = {
  slot:'notebook'|'sketchbook'|'sticker'|'bookmark-one'|'bookmark-two';
  src:string; alt:[string,string];
};

async function read(path:string,signal:AbortSignal) {
  const response=await fetch(`/api/v1/catalog${path}`,{signal,cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('image_unavailable');
  return response.json() as Promise<unknown>;
}

async function notebook(design:string,kind:'notebook'|'sketchbook',signal:AbortSignal):Promise<Piece[]> {
  const params=new URLSearchParams({design,group:'collection',notebook_type:kind,size:'A5',paper:kind==='notebook'?'writing-paper':'kraft-coffee-100gsm',limit:'1'});
  const page=imageSetPage.parse(await read(`/image-sets?${params}`,signal));
  const item=page.items[0],image=item?.images.find(photo=>photo.view==='front');
  if(!item||!image||item.spec.design!==design||item.spec.notebook_type!==kind)return [];
  return [{slot:kind,src:image.url,alt:[image.alt_fa,image.alt_en]}];
}

async function sticker(signal:AbortSignal):Promise<Piece[]> {
  const item=product.parse(await read('/products/roh-switch-sticker',signal));
  if(!item.image_url)return [];
  return [{slot:'sticker',src:item.image_url,alt:[item.image_alt_fa||'استیکر روح در کنار پریز؛ پریز همراه محصول نیست',item.image_alt_en||'Ghost socket sticker; socket not included']}];
}

async function bookmarks(signal:AbortSignal):Promise<Piece[]> {
  const page=z.object({items:z.array(product)}).parse(await read('/products?category=bookmarks&page_size=100',signal));
  const rank=(slug:string)=>slug.startsWith('qolche')?0:/gorbe|cat/.test(slug)?1:2;
  const candidates=page.items.sort((a,b)=>rank(a.slug)-rank(b.slug)).slice(0,2);
  const results=await Promise.allSettled(candidates.map(async item=>{
    const content=gallery.parse(await read(`/profiles/products/${item.id}`,signal));
    return content.gallery.map(photo=>({src:`/api/v1/media/${photo.asset_id}/versions/${photo.revision_id}/content`,alt:[photo.alt_fa,photo.alt_en] as [string,string]}));
  }));
  const approved=results.flatMap(r=>r.status==='fulfilled'&&r.value.length?[r.value]:[]);
  if(!approved.length)return [];
  const first=approved[0][1]||approved[0][0],second=approved[1]?.[0]||approved[0][0];
  return [{...first,slot:'bookmark-one'},...(second.src!==first.src?[{...second,slot:'bookmark-two' as const}]:[])];
}

function ProductPiece({piece,en}:{piece:Piece;en:boolean}) {
  const [failed,setFailed]=useState(false);
  if(failed)return null;
  return <div className={`home-collage-piece home-collage-${piece.slot}`}>
    <img src={`${piece.src}?thumbnail=true`} alt={piece.alt[en?1:0]} width="480" height="480" decoding="async" loading="eager" fetchPriority={piece.slot==='notebook'?'high':'auto'} onError={()=>setFailed(true)}/>
  </div>;
}

export default function HomeProductCollage({en=false}:{en?:boolean}) {
  const [pieces,setPieces]=useState<Piece[]>([]);
  useEffect(()=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    const tasks=[notebook('gorbe','notebook',controller.signal),notebook('gav','sketchbook',controller.signal),sticker(controller.signal),bookmarks(controller.signal)];
    for(const task of tasks)void task.then(items=>{if(!controller.signal.aborted)setPieces(old=>[...old,...items])}).catch(()=>{});
    void Promise.allSettled(tasks).then(()=>clearTimeout(timer));
    return()=>{controller.abort();clearTimeout(timer)};
  },[]);
  return <div className="hero-visual home-product-collage" role="region" aria-label={en?'A little world of NilArt products':'دنیای کوچک محصولات نیل‌آرت'}>
    <div className="hero-art-label"><span>THE LITTLE ART EDIT</span><span>NILART STUDIO</span></div>
    <div className="home-collage-stage">
      <span className="home-collage-orbit" aria-hidden="true"/>
      <span className="home-collage-spark home-collage-spark-one" aria-hidden="true">✳</span>
      <span className="home-collage-spark home-collage-spark-two" aria-hidden="true">✳</span>
      <span className="home-collage-handnote" aria-hidden="true">little things,<br/>big feelings.</span>
      {pieces.map(piece=><ProductPiece key={`${piece.slot}:${piece.src}`} piece={piece} en={en}/>)}
    </div>
    <div className="home-collage-footer">
      <span className="home-collage-caption">{en?'Your everyday, a little more you.':'چند تکه هنر، برای روزهای تو.'}</span>
      <div className="home-collage-types"><a href={`/${en?'en':'fa'}/shop`}>{en?'Notebooks':'دفتر'}</a><i aria-hidden="true"/><a href={`/${en?'en':'fa'}/categories/switch-socket-stickers`}>{en?'Stickers':'استیکر'}</a><i aria-hidden="true"/><a href={`/${en?'en':'fa'}/categories/bookmarks`}>{en?'Bookmarks':'نشانک'}</a></div>
    </div>
  </div>;
}
