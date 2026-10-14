import {formatCatalogAmount} from "../catalog/catalog-price"
function units(value:string,scale:number){const [whole,fraction=""]=value.split(".");return BigInt(whole)*10n**BigInt(scale)+BigInt(fraction.padEnd(scale,"0")||"0")}
function decimal(value:bigint,scale:number){const text=value.toString().padStart(scale+1,"0");return scale?text.slice(0,-scale)+(text.slice(-scale).replace(/0+$/,"")?"."+text.slice(-scale).replace(/0+$/,""):""):text}
export function multiplyAmount(value:string,quantity:number){const scale=(value.split(".")[1]||"").length;return decimal(units(value,scale)*BigInt(quantity),scale)}
export function differenceAmount(left:string,right:string){const scale=Math.max((left.split(".")[1]||"").length,(right.split(".")[1]||"").length);const delta=units(left,scale)-units(right,scale);return decimal(delta<0n?-delta:delta,scale)}
export const basketMoney=(value:string,language:0|1,quantity=1)=>formatCatalogAmount(multiplyAmount(value,quantity),language)+" "+(language===0?"تومان":"toman")
export type ExactPrices={accepted:string;current:string;base:string;saving:string}

export const fromMicroUnits=(value:bigint)=>decimal(value,6)
export function tomanAmount(value:string,currency:"IRT"|"IRR"){const scale=(value.split(".")[1]||"").length;return currency==="IRT"?value:decimal(units(value,scale),scale+1)}
export function addAmounts(left:string,right:string){const scale=Math.max((left.split(".")[1]||"").length,(right.split(".")[1]||"").length);return decimal(units(left,scale)+units(right,scale),scale)}
export function compareAmounts(left:string,right:string){const scale=Math.max((left.split(".")[1]||"").length,(right.split(".")[1]||"").length);const delta=units(left,scale)-units(right,scale);return delta<0n?-1:delta>0n?1:0}
