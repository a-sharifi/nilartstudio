'use client';
import {useId,useState} from 'react';
import './dashboard-charts.css';

type TrendDay={date:string;orders:number;paid_orders:number;sales_amount:string};
type Status={key:string;count:number};
type TopProduct={sku:string;title_fa:string;title_en:string;quantity:number;sales_amount:string};
const colors=['#a34b33','#819271','#c39d6d','#8c8174','#b67d75','#656e65'];
const statusNames:Record<string,[string,string]>={pending:['در انتظار پرداخت','Awaiting payment'],verification:['در حال تأیید پرداخت','Payment verification'],paid:['پرداخت‌شده','Paid'],failed:['پرداخت ناموفق','Payment failed'],partially_refunded:['بازپرداخت جزئی','Partially refunded'],refunded:['بازپرداخت کامل','Refunded']};
const statusColor=(key:string,index:number)=>({pending:'#c39d6d',verification:'#8c8174',paid:'#819271',failed:'#a34b33',partially_refunded:'#b67d75',refunded:'#656e65'} as Record<string,string>)[key]||colors[index%colors.length];
const number=(value:number,en:boolean)=>value.toLocaleString(en?'en':'fa-IR',{maximumFractionDigits:2});
function money(value:string,en:boolean){if(!/^\d+(?:\.\d+)?$/.test(value))return '—';const [whole,decimal='']=value.split('.');const fraction=decimal.replace(/0+$/,'');return BigInt(whole).toLocaleString(en?'en':'fa-IR')+(fraction?(en?'.':'٫')+(en?fraction:fraction.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)])):'')}
function short(value:number,en:boolean){const unit=value>=1000000?1000000:value>=1000?1000:1;return number(value/unit,en)+(unit===1000000?(en?'m':' میلیون'):unit===1000?(en?'k':' هزار'):'')}
function dateLabel(value:string,en:boolean,long=false){const date=new Date(`${value}T12:00:00Z`);return Number.isNaN(date.getTime())?value:new Intl.DateTimeFormat(en?'en-US':'fa-IR-u-ca-persian',{timeZone:'Asia/Tehran',month:long?'long':'short',day:'numeric',...(long?{year:'numeric' as const}:{})}).format(date)}
function niceMaximum(value:number){const exponent=10**Math.floor(Math.log10(value||1));const scaled=value/exponent;return (scaled<=1?1:scaled<=2?2:scaled<=5?5:10)*exponent}
function EmptyChart({en,kind}:{en:boolean;kind:'sales'|'orders'|'products'}){return <div className="dc-empty"><svg viewBox="0 0 140 54" aria-hidden="true"><path d="M7 44H133M15 10V44"/><path d="M24 37H119" strokeDasharray="4 5"/><circle cx="70" cy="37" r="3"/></svg><p>{kind==='sales'?(en?'No paid sales in this period.':'در این بازه فروش پرداخت‌شده‌ای ثبت نشده است.'):kind==='orders'?(en?'No orders in this period.':'در این بازه سفارشی ثبت نشده است.'):(en?'No paid products to rank in this period.':'در این بازه کالای پرداخت‌شده‌ای برای رتبه‌بندی وجود ندارد.')}</p></div>}

export function DailyTrend({data,metric,en}:{data:TrendDay[];metric:'sales'|'orders';en:boolean}){
 const gradient=useId().replace(/:/g,''),[selected,setSelected]=useState<number|null>(null);
 const values=data.map(row=>metric==='sales'?Math.max(0,Number(row.sales_amount)||0):Math.max(0,row.orders));
 if(!values.some(value=>value>0))return <EmptyChart en={en} kind={metric}/>;
 const maximum=metric==='orders'?Math.max(4,Math.ceil(Math.max(...values)/4)*4):niceMaximum(Math.max(...values)),w=760,h=280,left=64,right=20,top=24,bottom=52,plotW=w-left-right,plotH=h-top-bottom,baseline=h-bottom;
 const point=(index:number)=>({x:left+(metric==='orders'?(index+.5)*plotW/data.length:data.length===1?plotW/2:index*plotW/(data.length-1)),y:baseline-values[index]/maximum*plotH});
 const line=values.map((_,i)=>`${i?'L':'M'}${point(i).x},${point(i).y}`).join(' '),area=`${line} L${point(values.length-1).x},${baseline} L${point(0).x},${baseline} Z`;
 const barWidth=Math.min(38,plotW/Math.max(data.length,1)*.62);
 const active=selected===null?null:data[selected],metricName=metric==='sales'?(en?'Paid sales (toman)':'فروش پرداخت‌شده (تومان)'):(en?'Orders':'سفارش‌ها');
 return <div className="dc-trend"><div className="dc-trend-summary" aria-live="polite"><span className={`dc-series-key ${metric==='orders'?'is-orders':''}`}>{metricName}</span>{active?<span><b>{dateLabel(active.date,en,true)}</b> · {metric==='sales'?money(active.sales_amount,en):number(active.orders,en)} {metric==='sales'?(en?'toman':'تومان'):(en?'orders':'سفارش')}</span>:<span>{en?'Point to a day or use the date details below.':'برای دیدن مقدار روز، روی نمودار بروید یا جزئیات روزانه را باز کنید.'}</span>}</div>
 <svg className="dc-trend-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={metricName} direction="ltr"><title>{metricName} · {dateLabel(data[0].date,en)} — {dateLabel(data[data.length-1].date,en)}</title><defs><linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#a34b33" stopOpacity=".2"/><stop offset="100%" stopColor="#a34b33" stopOpacity=".015"/></linearGradient></defs>
 {[0,1,2,3,4].map(tick=>{const value=maximum*tick/4,y=baseline-tick*plotH/4;return <g key={tick}><line x1={left} x2={w-right} y1={y} y2={y} className="dc-gridline"/><text x={left-11} y={y+4} textAnchor="end" className="dc-axis-label">{metric==='orders'&&!Number.isInteger(value)?'':short(value,en)}</text></g>})}
 {metric==='sales'?<><path d={area} fill={`url(#${gradient})`}/><path d={line} className="dc-sales-line"/>{data.length===1&&<circle cx={point(0).x} cy={point(0).y} r="4" fill="#a34b33"/>}</>:data.map((row,i)=><rect key={row.date} x={point(i).x-barWidth/2} y={point(i).y} width={barWidth} height={baseline-point(i).y} rx="3" className="dc-order-column"/>)}
 {data.map((row,i)=>{const p=point(i),step=plotW/Math.max(data.length,1);return <g key={row.date}><rect x={Math.max(left,p.x-step/2)} y={top} width={step} height={plotH} fill="transparent" tabIndex={0} role="button" aria-label={`${dateLabel(row.date,en,true)}: ${metric==='sales'?money(row.sales_amount,en):number(row.orders,en)} ${metric==='sales'?(en?'toman':'تومان'):(en?'orders':'سفارش')}`} onMouseEnter={()=>setSelected(i)} onMouseLeave={()=>setSelected(null)} onFocus={()=>setSelected(i)} onBlur={()=>setSelected(null)} onClick={()=>setSelected(i)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelected(i)}}}><title>{dateLabel(row.date,en,true)}: {metric==='sales'?money(row.sales_amount,en):number(row.orders,en)}</title></rect>{selected===i&&<><line x1={p.x} x2={p.x} y1={top} y2={baseline} className="dc-focus-line"/><circle cx={p.x} cy={p.y} r="5" fill={metric==='sales'?'#a34b33':'#819271'} stroke="white" strokeWidth="3"/></>}</g>})}
 {data.map((row,i)=>{const every=Math.max(1,Math.ceil((data.length-1)/5));if(i!==data.length-1&&i%every!==0)return null;return <text key={row.date} x={point(i).x} y={h-19} textAnchor="middle" className="dc-axis-label">{dateLabel(row.date,en)}</text>})}</svg>
 <details className="dc-table-details"><summary>{en?'Daily figures':'مشاهدهٔ اعداد روزانه'}</summary><div className="dc-table-scroll"><table><caption>{metricName}</caption><thead><tr><th>{en?'Date':'تاریخ'}</th><th>{en?'Orders placed':'سفارش ثبت‌شده'}</th><th>{en?'Paid orders':'سفارش پرداخت‌شده'}</th><th>{en?'Paid sales (toman)':'فروش پرداخت‌شده (تومان)'}</th></tr></thead><tbody>{data.map(row=><tr key={row.date}><td>{dateLabel(row.date,en,true)}</td><td>{number(row.orders,en)}</td><td>{number(row.paid_orders,en)}</td><td>{money(row.sales_amount,en)}</td></tr>)}</tbody></table></div></details>
 </div>
}

export function StatusChart({data,en}:{data:Status[];en:boolean}){
 const total=data.reduce((sum,row)=>sum+row.count,0),rows=data.filter(row=>row.count>0);
 if(!total)return <EmptyChart en={en} kind="orders"/>;
 return <div className="dc-status"><div className="dc-stacked-bar" role="img" aria-label={en?`${total} orders by payment status`:`${number(total,en)} سفارش به تفکیک وضعیت پرداخت`}>{rows.map((row,index)=><span key={row.key} style={{width:`${row.count/total*100}%`,background:statusColor(row.key,index)}} title={`${statusNames[row.key]?.[en?1:0]??row.key}: ${number(row.count,en)}`}/>)}</div><ul className="dc-status-list">{rows.map((row,index)=><li key={row.key}><span><i style={{background:statusColor(row.key,index)}}/>{statusNames[row.key]?.[en?1:0]??`${en?'Other status':'وضعیت دیگر'} (${row.key})`}</span><strong>{number(row.count,en)}</strong><small>{number(row.count/total*100,en)}٪</small></li>)}</ul><p className="dc-chart-note">{en?'Current payment states of orders placed in this period.':'وضعیت فعلی پرداخت سفارش‌هایی که در این بازه ثبت شده‌اند.'}</p></div>
}

export function TopProductsChart({data,en}:{data:TopProduct[];en:boolean}){
 const rows=data.filter(row=>row.quantity>0).slice(0,5),maximum=Math.max(1,...rows.map(row=>row.quantity));
 if(!rows.length)return <EmptyChart en={en} kind="products"/>;
 return <div className="dc-top-products"><ol>{rows.map((row,index)=><li key={`${row.sku}:${index}`}><div className="dc-product-rank">{number(index+1,en).padStart(en?2:1,'0')}</div><div className="dc-product-data"><div className="dc-product-heading"><strong title={en?row.title_en:row.title_fa}>{en?row.title_en:row.title_fa}</strong><span>{number(row.quantity,en)} {en?'units':'عدد'}</span></div><div className="dc-product-track"><span style={{width:`${row.quantity/maximum*100}%`}}/></div><div className="dc-product-foot"><bdi>{row.sku}</bdi><span>{money(row.sales_amount,en)} {en?'toman':'تومان'}</span></div></div></li>)}</ol><p className="dc-chart-note">{en?'Ranked by paid units; figures use historical order prices.':'رتبه‌بندی بر اساس تعداد کالای پرداخت‌شده، با قیمت ثبت‌شده در سفارش.'}</p></div>
}
