import type { Address } from "./address"
import type { EvaluatedLine } from "./cart"

export type DeliveryMode = "normal" | "single" | "loading" | "error" | "none" | "expired" | "changed" | "removed" | "items-changed" | "offline" | "multiple"
export interface DeliveryGroup {
  id: string
  title: [string, string]
  itemIds: string[]
  preparation: [string, string]
  transit: [string, string]
  cost: number
}
export interface DeliveryOption {
  id: string
  name: [string, string]
  description: [string, string]
  transit: [string, string]
  amount: number
  groups: DeliveryGroup[]
}
export interface DeliveryQuote {
  version: string
  context: string
  validity: "valid" | "expired"
  options: DeliveryOption[]
  tax: {
    status: "confirmed"
    amount: number
    demo: true
  }
  demo: true
}
export interface DeliveryState {
  selectedDeliveryOption: string | null
  quote: DeliveryQuote | null
  acceptedVersion: string | null
  costChange?: {
    old: number
    next: number
  } | null
}
export const emptyDelivery = (): DeliveryState => ({
  selectedDeliveryOption: null,
  quote: null,
  acceptedVersion: null,
})
export const isPhysicalRow = (r: EvaluatedLine) =>
  r.line.kind === "product" ||
  r.line.kind === "bundle" ||
  r.line.data.delivery !== "digital"
export function deliveryContext(
  address: Address | undefined,
  rows: EvaluatedLine[],
  code: string,
) {
  return JSON.stringify({
    address,
    items: rows.map((r) => ({
      line: r.line,
      price: r.currentPrice,
      quantity: r.quantity,
      issue: r.issue,
      requirements: [...r.requirements],
    })),
    code,
  })
}
// Deliberately fixed local quote fixtures, NOT a carrier tariff or weight calculator.
// Production must replace this adapter with destination/weight/package-aware service data.
export async function requestDemoDelivery(
  context: string,
  rows: EvaluatedLine[],
  mode: DeliveryMode,
): Promise<DeliveryQuote> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (mode === "error") throw new Error("demo-service-error")
  const physicalIds = rows.filter(isPhysicalRow).map((r) => r.line.id)
  const commissionIds = rows
    .filter((r) => isPhysicalRow(r) && r.line.kind === "commission")
    .map((r) => r.line.id)
  const laterIds =
    mode === "multiple" && physicalIds.length > commissionIds.length
      ? commissionIds
      : []
  const standard = mode === "changed" || mode === "expired" ? 95000 : 75000
  const make = (
    id: string,
    name: [string, string],
    amount: number,
    transit: [string, string],
  ): DeliveryOption => {
    const groups: DeliveryGroup[] = laterIds.length
      ? [
          {
            id: "ready",
            title: ["محصولات آماده · نمونه", "Ready products · demo"],
            itemIds: physicalIds.filter((id) => !laterIds.includes(id)),
            preparation: [
              "آماده‌سازی طبق وضعیت اقلام؛ بازه تأییدشده ارائه نشده",
              "Preparation follows item status; no approved estimate supplied",
            ],
            transit,
            cost: Math.floor(amount * 0.6),
          },
          {
            id: "art",
            title: [
              "نقاشی دستی سفارشی · نمونه",
              "Custom hand-painted artwork · demo",
            ],
            itemIds: laterIds,
            preparation: [
              "زمان اجرای هنرمند طبق توافق؛ مستقل از حمل",
              "Artist execution follows the agreement, independently of transit",
            ],
            transit,
            cost: amount - Math.floor(amount * 0.6),
          },
        ]
      : [
          {
            id: "physical",
            title: ["مرسوله فیزیکی · نمونه", "Physical shipment · demo"],
            itemIds: physicalIds,
            preparation: [
              "بازه آماده‌سازی تأییدشده ارائه نشده است",
              "No approved preparation estimate supplied",
            ],
            transit,
            cost: amount,
          },
        ]
    return {
      id,
      name,
      amount,
      transit,
      groups,
      description:
        id === "standard"
          ? [
              "گزینه معمول برای ارسال سفارش · داده نمایشی",
              "A regular delivery option · demo data",
            ]
          : [
              "زمان حمل کوتاه‌تر در این پیشنهاد نمونه",
              "Shorter transit time in this sample quote",
            ],
    }
  }
  const options =
    mode === "none"
      ? []
      : [
          ...(mode === "removed"
            ? []
            : [
                make(
                  "standard",
                  ["ارسال استاندارد", "Standard delivery"],
                  standard,
                  [
                    "۳ تا ۵ روز کاری پس از ارسال · نمونه",
                    "3–5 business days after dispatch · demo",
                  ],
                ),
              ]),
          ...(mode === "single"
            ? []
            : [
                make("faster", ["ارسال سریع‌تر", "Faster delivery"], 125000, [
                  "۱ تا ۲ روز کاری پس از ارسال · نمونه",
                  "1–2 business days after dispatch · demo",
                ]),
              ]),
        ]
  return {
    context,
    version: `DEMO-${mode}-${Date.now()}`,
    validity: "valid",
    options,
    tax: { status: "confirmed", amount: 0, demo: true },
    demo: true,
  }
}
export function validDelivery(state: DeliveryState, context: string) {
  const q = state.quote
  return (
    !!q &&
    q.context === context &&
    q.validity === "valid" &&
    q.tax.status === "confirmed" &&
    !state.costChange &&
    state.acceptedVersion === q.version &&
    q.options.some(
      (o) =>
        o.id === state.selectedDeliveryOption &&
        o.groups.reduce((n, g) => n + g.cost, 0) === o.amount,
    )
  )
}
export function deliveryTotal(
  items: number,
  option: DeliveryOption | undefined,
  quote: DeliveryQuote | null,
) {
  return option && quote ? items + option.amount + quote.tax.amount : null
}
