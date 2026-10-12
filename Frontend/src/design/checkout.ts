import {
  cartTotals,
  demoCart,
  evaluateCart,
  evaluateCoupon,
  shoppingLines,
  type CartSnapshot,
  type EvaluatedLine,
} from "./cart"

export interface CheckoutSession {
  status: "guest" | "unverified" | "verified" | "expired"
  phone?: string
  country?: string
  signupTermsVersion?: string
  demo: true
}
export type AuthPurpose = "login" | "register" | "recovery" | "verify"
export interface DemoChallenge {
  id: string
  purpose: AuthPurpose
  length: number
  resendAt: number
  expiresAt: number
  used: boolean
}
// These are explicitly local simulation settings, not approved production policy.
export const demoAuthPolicy = {
  otpLength: 6,
  resendSeconds: 30,
  expiresSeconds: 120,
  passwordMinLength: 8,
  signupTermsVersion: "DEMO-SIGNUP-V1",
  checkoutTermsVersion: "DEMO-CHECKOUT-V1",
}
export const phoneCountries = [
  {
    id: "IR",
    code: "+98",
    name: ["ایران", "Iran"],
    length: 10,
    pattern: /^9\d{9}$/,
  },
  {
    id: "US",
    code: "+1",
    name: ["آمریکا", "United States"],
    length: 10,
    pattern: /^[2-9]\d{9}$/,
  },
  {
    id: "GB",
    code: "+44",
    name: ["بریتانیا", "United Kingdom"],
    length: 10,
    pattern: /^7\d{9}$/,
  },
]
export const normalizeDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
export function normalizePhone(value: string, country: string) {
  let digits = normalizeDigits(value).replace(/\D/g, "")
  const selected = phoneCountries.find((item) => item.id === country)!
  if (value.trim().startsWith("+") && digits.startsWith(selected.code.slice(1)))
    digits = digits.slice(selected.code.length - 1)
  if (country !== "US" && digits.startsWith("0")) digits = digits.slice(1)
  return digits
}
export function validPhone(value: string, country: string) {
  const selected = phoneCountries.find((item) => item.id === country)
  return !!selected && selected.pattern.test(normalizePhone(value, country))
}
export function maskedPhone(value = "") {
  return value.length > 5
    ? `${value.slice(0, 2)}${"•".repeat(Math.max(3, value.length - 6))}${value.slice(-4)}`
    : "•••• ••• ••••"
}
export function createDemoChallenge(
  purpose: AuthPurpose,
  now = Date.now(),
): DemoChallenge {
  return {
    id: `${purpose}-${now}`,
    purpose,
    length: demoAuthPolicy.otpLength,
    resendAt: now + demoAuthPolicy.resendSeconds * 1000,
    expiresAt: now + demoAuthPolicy.expiresSeconds * 1000,
    used: false,
  }
}
export function challengeError(
  challenge: DemoChallenge | null,
  purpose: AuthPurpose,
  code: string,
  now = Date.now(),
) {
  if (!challenge || challenge.purpose !== purpose || challenge.used)
    return "context"
  if (now >= challenge.expiresAt) return "expired"
  if (!new RegExp(`^\\d{${challenge.length}}$`).test(normalizeDigits(code)))
    return "format"
  return null
}
export function validDemoPassword(password: string, repeat: string) {
  return (
    password.length >= demoAuthPolicy.passwordMinLength && password === repeat
  )
}
export function parseCheckoutIds(search: string): string[] | null {
  const params = new URLSearchParams(search)
  if (!params.has("items")) return null
  return [
    ...new Set(
      (params.get("items") || "")
        .split(",")
        .filter((id) => id.length > 0 && id.length <= 500),
    ),
  ].slice(0, 50)
}
export function safeCheckoutReturn(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/checkout"
  try {
    const url = new URL(value, "https://nilart.invalid")
    if (url.origin !== "https://nilart.invalid" || url.pathname !== "/checkout")
      return "/checkout"
    const ids = parseCheckoutIds(url.search)
    return `/checkout${
      ids ? `?items=${encodeURIComponent(ids.join(","))}` : ""
    }`
  } catch {
    return "/checkout"
  }
}
export function checkoutRows(
  snapshot: CartSnapshot,
  ids: string[],
  mode = "normal",
) {
  const selected = new Set(ids)
  return evaluateCart(snapshot, mode).filter((row) => selected.has(row.line.id))
}
export function physicalCheckout(rows: EvaluatedLine[]) {
  return rows.some(
    (row) =>
      row.line.kind === "product" ||
      row.line.kind === "bundle" ||
      row.line.data.delivery !== "digital",
  )
}
export function checkoutAmounts(
  rows: EvaluatedLine[],
  code: string,
  stacking = false,
) {
  const coupon = evaluateCoupon(rows, code, stacking)
  return { coupon, totals: cartTotals(rows, coupon) }
}
export function mergeCheckoutCarts(guest: CartSnapshot, account: CartSnapshot) {
  const products = [...guest.products.map((line) => ({ ...line }))]
  const bundles = [
    ...guest.bundles.map((line) => ({
      ...line,
      parts: line.parts.map((part) => ({ ...part })),
    })),
  ]
  const art = [...guest.art.map((line) => ({ ...line }))]
  for (const line of account.products) {
    const current = products.find((item) => item.skuId === line.skuId)
    if (current) current.quantity += line.quantity
    else products.push({ ...line })
  }
  for (const line of account.bundles) {
    const current = bundles.find((item) => item.key === line.key)
    if (current) current.quantity += line.quantity
    else
      bundles.push({ ...line, parts: line.parts.map((part) => ({ ...part })) })
  }
  for (const line of account.art)
    if (!art.some((item) => item.id === line.id)) art.push({ ...line })
  const candidate: CartSnapshot = {
    products,
    bundles,
    art,
    livePrices: { ...guest.livePrices, ...account.livePrices },
    liveStocks: { ...guest.liveStocks, ...account.liveStocks },
  }
  const before = shoppingLines(guest)
  const changes = shoppingLines(candidate).filter((line) => {
    const previous = before.find((item) => item.id === line.id)
    return (
      !previous || JSON.stringify(previous.data) !== JSON.stringify(line.data)
    )
  })
  return {
    candidate,
    changes,
    conflicts: evaluateCart(candidate).filter(
      (row) => row.issue && row.issue !== "pending",
    ),
  }
}
export function checkoutFixture(mode: string) {
  const snapshot = demoCart("approved-quote")
  if (mode === "empty") return demoCart("empty")
  if (mode === "digital") {
    const art = snapshot.art.map((line) => ({
      ...line,
      delivery: "digital" as const,
      execution: ["دیجیتال — نمونه", "Digital — demo"] as [string, string],
    }))
    return { products: [], bundles: [], art }
  }
  if (mode === "quote-expired")
    snapshot.art = snapshot.art.map((line) => ({ ...line, status: "expired" }))
  snapshot.art.push(...demoCart("only-pending").art)
  return snapshot
}
