'use client';
import {useEffect} from 'react';
export function useHomeMotion(enabled:boolean){
 useEffect(()=>{if(!enabled||typeof IntersectionObserver==='undefined')return;const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');if(media?.matches)return;const root=document.querySelector('[data-home-motion]');if(!root)return;
 const marked=new Set<HTMLElement>();const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('home-is-visible');observer.unobserve(entry.target)}},{threshold:0.08,rootMargin:'0px 0px -15px 0px'});
 const mark=()=>{root.querySelectorAll<HTMLElement>(':scope > section:not(.hero), .collection-card, .home-offer-card, .product-card, .bundle-card, .trust-item').forEach(node=>{if(marked.has(node))return;marked.add(node);if(node.closest('.hero'))return;node.classList.add('home-reveal');observer.observe(node)})};mark();const mutations=new MutationObserver(mark);mutations.observe(root,{childList:true,subtree:true});
 const reveal=()=>marked.forEach(node=>{node.classList.remove('home-reveal');node.classList.remove('home-is-visible')});media?.addEventListener?.('change',reveal);
 return()=>{observer.disconnect();mutations.disconnect();media?.removeEventListener?.('change',reveal);reveal()}
 },[enabled]);
}
