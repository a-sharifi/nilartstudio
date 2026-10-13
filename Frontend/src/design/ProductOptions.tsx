import type { ReactNode } from "react"
import { covers, notebook, optionState, sizes, type Selection } from "./product"
import type { SKU } from "./catalog"

export default function ProductOptions({
  selection,
  onChange,
  language,
  disabled,
  unavailable,
  guide,
  variants = notebook.skus,
  bundle = false,
}: {
  selection: Selection
  onChange: (key: keyof Selection, value: string) => void
  language: 0 | 1
  disabled: boolean
  unavailable: boolean
  guide: () => void
  variants?: SKU[]
  bundle?: boolean
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const sheets = [
    ...new Set(
      variants
        .map((sku) => sku.sheets)
        .filter((value): value is number => value !== undefined),
    ),
  ]
  const groups = [
    {
      key: "size" as const,
      label: t("سایز دفتر", "Notebook size"),
      choices: sizes
        .filter((size) => variants.some((sku) => sku.size === size.value))
        .map((size) => ({
          value: size.value,
          name: size.value,
          caption: `${size.width.toLocaleString(language === 0 ? "fa-IR" : "en-US")} × ${size.height.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("میلی‌متر", "mm")}`,
        })),
    },
    {
      key: "sheets" as const,
      label: t("تعداد برگ هر دفتر", "Sheets per notebook"),
      choices: sheets.map((count) => ({
        value: String(count),
        name: `${count.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("برگ", "sheets")}`,
        caption: `${(count * 2).toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("صفحه", "pages")}`,
      })),
    },
    {
      key: "cover" as const,
      label: t("نوع جلد", "Cover type"),
      choices: covers
        .filter((cover) => variants.some((sku) => sku.cover === cover.value))
        .map((cover) => ({
          value: cover.value,
          name: cover.label[language],
          caption: "",
        })),
    },
  ]
  return <div className="product-option-groups">{groups.map(group =>
    <ProductOptionGroup key={group.key} id={group.key} label={group.label}
      selected={selection[group.key]} disabled={disabled} language={language}
      onChange={value=>onChange(group.key,value)}
      choices={group.choices.map(choice=>({...choice,status:optionState(selection,group.key,choice.value,unavailable,variants)}))}
      guide={group.key === "size" ? <button type="button" className="option-guide-link" onClick={guide}>{t("راهنمای سایز","Size guide")}</button> : undefined}
      helper={group.key === "sheets" ? t("تعداد برگ داخل هر دفتر؛ نه تعداد دفتر خریداری‌شده. تعداد روی چاپ‌شده به مشخصات محصول بستگی دارد.","Sheets inside each notebook, not the number of notebooks you buy. Printed sides depend on product specifications.") : undefined}
      bundle={bundle}/>
  )}</div>
}

// The reference option renderer is shared by prototype families and published SKUs.
export function ProductOptionGroup({id,label,selected,choices,onChange,language,disabled=false,guide,helper,bundle=false,namePrefix="product"}: {
 id:string;label:string;selected:string;choices:{value:string;name:string;caption?:string;status?:string}[];
 onChange:(value:string)=>void;language:0|1;disabled?:boolean;guide?:ReactNode;helper?:string;bundle?:boolean;namePrefix?:string;
}) {
 const t=(fa:string,en:string)=>language===0?fa:en
 return <fieldset disabled={disabled} className={`product-option-group option-${id}`}>
  <legend>{label}<span className="option-required">{selected?t("انتخاب شد","Selected"):t("انتخاب کنید","Choose an option")}</span></legend>
  {guide}
  <div className="product-radio-grid">{choices.map(choice=><label key={choice.value} className={`product-radio ${selected===choice.value?"selected":""} ${choice.status || ""}`}>
   <input type="radio" name={`${namePrefix}-${id}`} value={choice.value} checked={selected===choice.value} disabled={choice.status==="not-offered"} onChange={()=>onChange(choice.value)}/>
   <span className="radio-title"><span dir={id==="size"?"ltr":undefined}>{choice.name}</span>{selected===choice.value&&<span className="radio-check" aria-hidden="true">✓</span>}</span>
   {choice.caption&&<small>{choice.caption}</small>}
   {choice.status==="not-offered"&&<small className="option-status">{t(bundle?"این گزینه در این پکیج ارائه نمی‌شود.":"این ترکیب ارائه نمی‌شود.",bundle?"This option isn't offered in this bundle.":"This combination isn't offered.")}</small>}
   {choice.status==="out-of-stock"&&<small className="option-status">{t("فعلاً ناموجود","Currently out of stock")}</small>}
  </label>)}</div>
  {helper&&<p className="option-helper">{helper}</p>}
 </fieldset>
}
