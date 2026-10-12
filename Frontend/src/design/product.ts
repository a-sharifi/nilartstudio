import { catalogProducts, type SKU } from "./catalog"
import type { Localized } from "./data"

export const productSlug = "cats-sketchbook-127gsm"
export const notebook = catalogProducts.find(
  (product) => product.slug === productSlug,
)!
export const notebookCopy = {
  name: ["دفتر طراحی ۱۲۷ گرم", "127 gsm sketchbook"] as Localized,
  intro: [
    "دفتر طراحی با طرح کالکشن گربه. سایز، تعداد برگ و جلد دلخواهت را از گزینه‌های موجود انتخاب کن.",
    "A sketchbook featuring the Cats collection. Choose your size, sheet count, and cover from available options.",
  ] as Localized,
  about: [
    "جایی برای ثبت ایده‌ها و همراه‌داشتن دنیای تصویری محبوبتان. این متن و گزینه‌ها نمونه طراحی‌اند؛ مشخصات نهایی از داده تأییدشده برند جایگزین می‌شوند.",
    "A place to keep your ideas and your favorite visual world close. This copy and these options are design samples; approved brand specifications will replace them.",
  ] as Localized,
}
export const sizes = [
  { value: "A4", width: 210, height: 297 },
  { value: "A5", width: 148, height: 210 },
  { value: "A6", width: 105, height: 148 },
]
interface CoverOption {
  value: string
  label: Localized
}
export interface GalleryImage {
  label: Localized
  view: string
  src?: string
}
export const covers: CoverOption[] = [
  { value: "2mm", label: ["جلد سخت ۲ میلی‌متر", "2 mm hard cover"] },
  { value: "3mm", label: ["جلد سخت ۳ میلی‌متر", "3 mm hard cover"] },
]
export const gallery: GalleryImage[] = [
  { label: ["جلد جلو", "Front cover"], view: "front" },
  { label: ["پشت دفتر", "Back cover"], view: "back" },
  { label: ["داخل دفتر", "Inside notebook"], view: "inside" },
  { label: ["کاغذ و صحافی", "Paper & binding"], view: "detail" },
]
export interface Selection {
  size: string
  sheets: string
  cover: string
}
export const emptySelection: Selection = { size: "", sheets: "", cover: "" }
export const matches = (sku: SKU, selection: Selection) =>
  (!selection.size || sku.size === selection.size) &&
  (!selection.sheets || String(sku.sheets) === selection.sheets) &&
  (!selection.cover || sku.cover === selection.cover)
export function selectedSKU(
  selection: Selection,
  variants: SKU[] = notebook.skus,
): SKU | undefined {
  if (!selection.size || !selection.sheets || !selection.cover) return undefined
  return variants.find((sku) => matches(sku, selection))
}
export function changeSelection(
  previous: Selection,
  key: keyof Selection,
  value: string,
  variants: SKU[] = notebook.skus,
) {
  const next: Selection = { ...emptySelection, [key]: value }
  const cleared: Array<keyof Selection> = []
  for (const field of ["size", "sheets", "cover"] as const) {
    if (field === key || !previous[field]) continue
    const candidate = { ...next, [field]: previous[field] }
    if (variants.some((sku) => matches(sku, candidate)))
      next[field] = previous[field]
    else cleared.push(field)
  }
  return { selection: next, cleared }
}
export function optionState(
  selection: Selection,
  key: keyof Selection,
  value: string,
  allUnavailable = false,
  variants: SKU[] = notebook.skus,
) {
  const relevant: Selection =
    key === "size"
      ? { ...emptySelection, size: value }
      : key === "sheets"
        ? { size: selection.size, sheets: value, cover: "" }
        : { ...selection, cover: value }
  const options = variants.filter((sku) => matches(sku, relevant))
  return options.length === 0
    ? "not-offered"
    : options.some((sku) => sku.stock > 0) && !allUnavailable
      ? "available"
      : "out-of-stock"
}
export const validQuantity = (value: string, stock: number) =>
  /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= stock
export type CartLine = {
  skuId: string
  quantity: number
  unitPrice: number
  selection: Selection
}
export function mergeCart(
  lines: CartLine[],
  line: CartLine,
  stock: number,
): CartLine[] | null {
  const existing = lines.find((item) => item.skuId === line.skuId)
  const total = (existing?.quantity || 0) + line.quantity
  if (
    !Number.isInteger(line.quantity) ||
    line.quantity < 1 ||
    total > stock ||
    stock < 1
  )
    return null
  return existing
    ? lines.map((item) =>
        item.skuId === line.skuId ? { ...line, quantity: total } : item,
      )
    : [...lines, line]
}
