import {
  checkoutAmounts,
  checkoutRows,
  physicalCheckout,
  demoAuthPolicy,
  type CheckoutSession,
} from "./checkout"
import type { CartSnapshot, EvaluatedLine } from "./cart"
import { addressErrors, type Address, type AddressCheckout } from "./address"
import {
  deliveryContext,
  validDelivery,
  type DeliveryOption,
  type DeliveryState,
} from "./delivery"

export const paymentConfig = {
  demo: true,
  termsVersion: demoAuthPolicy.checkoutTermsVersion,
  methods: [
    {
      id: "online",
      name: ["پرداخت آنلاین", "Online payment"] as [string, string],
      active: true,
    },
  ],
  digitalTax: 0,
}
export interface PaymentInput {
  snapshot: CartSnapshot
  ids: string[]
  cartMode: string
  couponCode: string
  session: CheckoutSession
  address: AddressCheckout
  delivery: DeliveryState
  blocked: boolean
}
export interface ReceiptItem {
  name: [string, string]
  quantity: number
  total: number
  digital: boolean
}
export type AttemptStatus = "gateway" | "verifying" | "unknown" | "succeeded" | "failed" | "cancelled" | "late-paid"
export interface PaymentAttempt {
  id: string
  orderId: string
  status: AttemptStatus
  amount: number
  gatewayAmountToman: number
  gatewayAmountRial: number
  context: string
  items: ReceiptItem[]
  breakdown: {
    base: number
    bundleDiscount: number
    codeDiscount: number
    itemsTotal: number
    shipping: number
    tax: number
  }
  deliverySnapshot?: {
    address: Address
    option: DeliveryOption
  }
  transactionRef?: string
  retrySafe: boolean
  demo: true
}
export interface Reservation {
  attemptId: string
  status: "reserved" | "released" | "allocated" | "expired" | "reviewing"
  requirements: Record<string, number>
  couponCode: string
  demo: true
}
export interface PaymentState {
  selectedMethod: string | null
  acceptedTermsVersion: string | null
  attempt: PaymentAttempt | null
  reservation: Reservation | null
  adjustment: {
    reason: "price" | "coupon"
    previous: number
    next: number
    accepted: boolean
    sourceKey: string
  } | null
}
export const emptyPayment = (): PaymentState => ({
  selectedMethod: "online",
  acceptedTermsVersion: null,
  attempt: null,
  reservation: null,
  adjustment: null,
})
export const isPaymentRoute = (route: string) =>
  route === "/checkout/payment" ||
  /^\/checkout\/(verifying|success|failed)\/[a-zA-Z0-9_-]+$/.test(route)
export const activeAttempt = (attempt: PaymentAttempt | null) =>
  !!attempt &&
  ["gateway", "verifying", "unknown", "late-paid"].includes(attempt.status)
export function reviewPayment(input: PaymentInput) {
  const rows = checkoutRows(input.snapshot, input.ids, input.cartMode)
  const amounts = checkoutAmounts(
    rows,
    input.couponCode,
    input.cartMode === "stacking",
  )
  const physical = physicalCheckout(rows)
  const destination = input.address.addresses.find(
    (a) => a.id === input.address.selectedAddressId,
  )
  const context = deliveryContext(destination, rows, input.couponCode)
  const shipping = physical
    ? input.delivery.quote?.options.find(
        (o) => o.id === input.delivery.selectedDeliveryOption,
      )?.amount
    : 0
  const tax = physical
    ? input.delivery.quote?.tax.amount
    : paymentConfig.digitalTax
  const issue =
    input.session.status !== "verified"
      ? "session"
      : !rows.length || rows.length !== input.ids.length
        ? "empty"
        : input.blocked
          ? "merge"
          : rows.some((r) => r.issue)
            ? "items"
            : amounts.coupon.error
              ? "coupon"
              : physical &&
                  (!destination ||
                    Object.keys(addressErrors(destination)).length)
                ? "address"
                : physical && !validDelivery(input.delivery, context)
                  ? "delivery"
                  : !Number.isSafeInteger(amounts.totals.total) ||
                      !Number.isSafeInteger(shipping) ||
                      !Number.isSafeInteger(tax)
                    ? "amount"
                    : null
  const total = issue ? null : amounts.totals.total + shipping! + tax!
  return {
    rows,
    amounts,
    physical,
    destination,
    shipping,
    tax,
    total,
    issue,
    context,
  }
}
export function paymentFingerprint(input: PaymentInput) {
  const review = reviewPayment(input)
  return JSON.stringify([
    review.context,
    input.session.status,
    input.cartMode,
    input.blocked,
    input.delivery.quote?.version,
    input.delivery.acceptedVersion,
    input.delivery.selectedDeliveryOption,
    review.total,
  ])
}
export function aggregateReservation(rows: EvaluatedLine[]) {
  const requirements: Record<string, number> = {}
  for (const row of rows)
    for (const [sku, count] of row.requirements)
      requirements[sku] = (requirements[sku] || 0) + count * row.quantity
  return requirements
}
export function paymentInvoice(input: PaymentInput, state: PaymentState) {
  const review = reviewPayment(input)
  const adjustment =
    state.adjustment?.sourceKey === paymentFingerprint(input)
      ? state.adjustment
      : null
  const rows =
    adjustment?.reason === "price"
      ? review.rows.map((row, index) =>
          index === 0
            ? {
                ...row,
                currentPrice: row.currentPrice + 10000,
                acceptedPrice: row.currentPrice + 10000,
                basePrice: row.basePrice + 10000,
              }
            : row,
        )
      : review.rows
  const code = adjustment?.reason === "coupon" ? "" : input.couponCode
  const amounts = checkoutAmounts(rows, code, input.cartMode === "stacking")
  const total =
    review.total === null
      ? null
      : amounts.totals.total + review.shipping! + review.tax!
  return { ...review, rows, amounts, code, total, adjustment }
}
export function canStartPayment(input: PaymentInput, state: PaymentState) {
  return (
    reviewPayment(input).total !== null &&
    paymentConfig.methods.some(
      (m) => m.id === state.selectedMethod && m.active,
    ) &&
    state.acceptedTermsVersion === paymentConfig.termsVersion &&
    !activeAttempt(state.attempt) &&
    state.attempt?.status !== "succeeded" &&
    (!state.adjustment ||
      (state.adjustment.sourceKey === paymentFingerprint(input) &&
        state.adjustment.accepted))
  )
}

// Local idempotent service simulation. No bank, inventory or coupon service is called.
// A production service must atomically reserve aggregated SKU demand and coupon use.
const attempts = new Map<string, {
  attempt: PaymentAttempt
  reservation: Reservation
}>()
export function createDemoAttempt(
  input: PaymentInput,
  state: PaymentState,
  key: string,
) {
  const existing = attempts.get(key)
  if (existing) {
    if (
      existing.attempt.context !== paymentFingerprint(input) ||
      existing.attempt.amount !== paymentInvoice(input, state).total
    )
      throw new Error("idempotency-context-conflict")
    return existing
  }
  if (!canStartPayment(input, state)) throw new Error("checkout-invalid")
  if (
    [...attempts.values()].some(
      (value) =>
        value.attempt.context === paymentFingerprint(input) &&
        activeAttempt(value.attempt),
    )
  )
    throw new Error("existing-active-attempt")
  const r = paymentInvoice(input, state)
  const amount = r.total!
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(amount * 10)
  )
    throw new Error("amount-invalid")
  const id = `DEMO-P-${crypto.randomUUID()}`
  const attempt: PaymentAttempt = {
    id,
    orderId: `DEMO-O-${id.slice(-8).toUpperCase()}`,
    status: "gateway",
    amount,
    gatewayAmountToman: amount,
    gatewayAmountRial: amount * 10,
    context: paymentFingerprint(input),
    items: r.rows.map((row) => ({
      name: [...row.name] as [string, string],
      quantity: row.quantity,
      total: row.currentPrice * row.quantity,
      digital:
        row.line.kind !== "product" &&
        row.line.kind !== "bundle" &&
        row.line.data.delivery === "digital",
    })),
    breakdown: {
      base: r.amounts.totals.base,
      bundleDiscount: r.amounts.totals.bundleDiscount,
      codeDiscount: r.amounts.totals.codeDiscount,
      itemsTotal: r.amounts.totals.total,
      shipping: r.shipping!,
      tax: r.tax!,
    },
    ...(r.physical && r.destination
      ? {
          deliverySnapshot: {
            address: structuredClone(r.destination),
            option: structuredClone(
              input.delivery.quote!.options.find(
                (o) => o.id === input.delivery.selectedDeliveryOption,
              )!,
            ),
          },
        }
      : {}),
    retrySafe: false,
    demo: true,
  }
  const reservation: Reservation = {
    attemptId: id,
    status: "reserved",
    requirements: aggregateReservation(r.rows),
    couponCode: r.code,
    demo: true,
  }
  const result = { attempt, reservation }
  attempts.set(key, result)
  return result
}
export function demoCallback(
  state: PaymentState,
  result: AttemptStatus,
  callbackAttemptId = state.attempt?.id,
): PaymentState {
  const attempt = state.attempt
  if (callbackAttemptId !== attempt?.id) return state
  if (
    !attempt ||
    ["succeeded", "failed", "cancelled", "late-paid"].includes(attempt.status)
  )
    return state
  const record = [...attempts.entries()].find(
    ([, value]) => value.attempt.id === attempt.id,
  )
  if (
    record &&
    ["succeeded", "failed", "cancelled", "late-paid"].includes(
      record[1].attempt.status,
    )
  )
    return { ...state, ...record[1] }
  const settled = ["succeeded", "failed", "cancelled", "late-paid"].includes(
    result,
  )
  const next = {
    ...attempt,
    status: result,
    retrySafe: result === "failed" || result === "cancelled",
    ...(result === "succeeded" || result === "late-paid"
      ? { transactionRef: `DEMO-T-${attempt.id.slice(-8)}` }
      : {}),
  }
  const updated: PaymentState = {
    ...state,
    attempt: next,
    reservation: state.reservation
      ? {
          ...state.reservation,
          status:
            result === "succeeded"
              ? "allocated"
              : result === "late-paid"
                ? "reviewing"
                : settled
                  ? "released"
                  : state.reservation.status,
        }
      : null,
  }
  if (record && updated.attempt && updated.reservation)
    attempts.set(record[0], {
      attempt: updated.attempt,
      reservation: updated.reservation,
    })
  return updated
}

// Only an opaque lock is persisted. Never put recipient/cart/card data in storage.
// A lost response/refresh remains unknown rather than enabling a parallel attempt.
const lockKey = "nilart-demo-payment-lock-v1"
export function readDemoPaymentLock(): string | null {
  try {
    return window.localStorage.getItem(lockKey)
  } catch {
    return null
  }
}
export async function claimDemoPaymentLock(id: string) {
  const claim = () => {
    if (readDemoPaymentLock()) return false
    try {
      window.localStorage.setItem(lockKey, id)
      return readDemoPaymentLock() === id
    } catch {
      return false
    }
  }
  if (navigator.locks) return navigator.locks.request(lockKey, claim)
  return false // Without atomic cross-tab locking the simulation fails closed.
}
export function releaseDemoPaymentLock(id: string) {
  try {
    if (readDemoPaymentLock() === id) window.localStorage.removeItem(lockKey)
  } catch {
    /* fail closed */
  }
}
