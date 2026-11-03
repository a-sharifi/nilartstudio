// Normalize localized decimal digits without guessing grouping or comma semantics.
export function costDecimalInput(value:string){return value.replace(/[۰-۹٠-٩]/g,char=>String("۰۱۲۳۴۵۶۷۸۹".includes(char)?"۰۱۲۳۴۵۶۷۸۹".indexOf(char):"٠١٢٣٤٥٦٧٨٩".indexOf(char))).replace(/٫/g,".")}
