import { checkoutAmounts } from "./checkout"
import type { EvaluatedLine } from "./cart"
interface Props {
  rows: EvaluatedLine[]
  code: string
  stacking: boolean
  language: 0 | 1
  frozen?: {
    base: number
    bundleDiscount: number
    codeDiscount: number
    total: number
  }
}
export default function CheckoutAmounts({
  rows,
  code,
  stacking,
  language,
  frozen,
}: Props) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const { totals: calculated } = checkoutAmounts(rows, code, stacking)
  const totals = frozen ?? calculated
  const money = (n: number) =>
    `${n.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
  return (
    <>
      <div className="checkout-summary-lines">
        <div>
          <span>{t("مجموع قبل از تخفیف", "Items before discounts")}</span>
          <strong>{money(totals.base)}</strong>
        </div>
        <div>
          <span>{t("تخفیف پکیج", "Bundle discount")}</span>
          <strong>− {money(totals.bundleDiscount)}</strong>
        </div>
        <div>
          <span>{t("تخفیف کد", "Code discount")}</span>
          <strong>− {money(totals.codeDiscount)}</strong>
        </div>
      </div>
      <div className="checkout-grand-total">
        <span>{t("جمع اقلام آماده", "Ready items total")}</span>
        <strong>{money(totals.total)}</strong>
      </div>
    </>
  )
}
