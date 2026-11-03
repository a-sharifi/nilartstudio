"use client";
import NotebookImageGallery from './NotebookImageGallery';
import './notebook-commission.css';
export default function NotebookPortfolioPage({language}:{language:0|1}){
 const en=language===1,t=(fa:string,english:string)=>en?english:fa;
 return <div className="container notebook-commission"><header className="notebook-hero"><span className="eyebrow">CUSTOM NOTEBOOK PORTFOLIO</span><h1>{t('نمونه‌کارهای دفتر اختصاصی','Custom notebook portfolio')}</h1><p>{t('از ایده تا جلد؛ جلو، پشت و صفحات دفترهای اختصاصی را در سایزها و کاغذهای مختلف ببین.','From an idea to a cover: explore custom notebook fronts, backs and pages in every size and paper.')}</p><a className="button primary" href={`/${en?'en':'fa'}/commissions/notebook#notebook-request`}>{t('سفارش طرح اختصاصی برای دفتر من','Request my own notebook design')}</a></header><NotebookImageGallery en={en} initialGroup="personal"/></div>;
}
