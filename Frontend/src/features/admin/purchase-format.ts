/** Format exact server decimal strings without conversion through floating point. */
export function purchaseNumber(value:string,en:boolean){
 const [whole,fraction=""]=value.split("."),tail=fraction.replace(/0+$/,"")
 const result=whole.replace(/\B(?=(\d{3})+(?!\d))/g,en?",":"٬")+(tail?(en?".":"٫")+tail:"")
 return en?result:result.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)])
}
