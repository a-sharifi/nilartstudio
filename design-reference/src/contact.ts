import {
  normalizeTrackingDigits,
  normalizeTrackingPhone,
  trackingCountries,
} from "./tracking"

export type ContactText = readonly [string, string]
export type ReplyMethod = "" | "email" | "phone"
export interface ContactOption {
  id: string
  label: ContactText
  approved: boolean
}
export interface ContactChannel {
  id: string
  kind: "phone" | "email" | "social"
  title: ContactText
  value: string
  href: string
  active: boolean
  approved: boolean
}
export interface ContactAddress {
  approved: boolean
  public: boolean
  text: ContactText
  visitConditions: ContactText
  mapUrl?: string
}
export interface ContactConfig {
  demo: boolean
  formEnabled: boolean
  languages: readonly ("fa" | "en")[]
  topics: ContactOption[]
  replyMethods: ContactOption[]
  channels: ContactChannel[]
  hours?: ContactText
  hoursApproved?: boolean
  address?: ContactAddress
  maxLengths?: Partial<Record<"name" | "phone" | "email" | "order" | "message", number>>
}
export interface ContactDraft {
  name: string
  method: ReplyMethod
  country: string
  phone: string
  email: string
  topic: string
  order: string
  message: string
}
export type ContactErrors = Partial<Record<keyof ContactDraft, string>>
export const contactDemoConfig: ContactConfig = {
  demo: true,
  formEnabled: true,
  languages: ["fa", "en"],
  channels: [],
  topics: [
    {
      id: "product",
      label: ["پرسش درباره محصول", "Product question"],
      approved: false,
    },
    {
      id: "buying",
      label: ["راهنمایی پیش از خرید", "Help before buying"],
      approved: false,
    },
    { id: "order", label: ["سفارش موجود", "Existing order"], approved: false },
    {
      id: "commission",
      label: ["نقاشی سفارشی", "Custom artwork"],
      approved: false,
    },
    {
      id: "collaboration",
      label: ["همکاری", "Collaboration"],
      approved: false,
    },
    {
      id: "website",
      label: ["مشکل فنی سایت", "Website issue"],
      approved: false,
    },
    { id: "other", label: ["سایر", "Other"], approved: false },
  ],
  replyMethods: [
    { id: "email", label: ["ایمیل", "Email"], approved: false },
    { id: "phone", label: ["تلفن", "Phone"], approved: false },
  ],
}
export const contactCountries = trackingCountries
export const emptyContactDraft = (): ContactDraft => ({
  name: "",
  method: "",
  country: "IR",
  phone: "",
  email: "",
  topic: "",
  order: "",
  message: "",
})
export function enabledContactOptions(options: ContactOption[], demo: boolean) {
  return options.filter((option) => demo || option.approved)
}
export function publicContactChannels(channels: ContactChannel[]) {
  return channels.filter((channel) => {
    if (!channel.active || !channel.approved || !channel.value.trim())
      return false
    if (channel.kind === "phone") return /^tel:\+?[\d ()-]+$/.test(channel.href)
    if (channel.kind === "email")
      return /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(channel.href)
    try {
      const url = new URL(channel.href)
      return url.protocol === "https:" && !url.username && !url.password
    } catch {
      return false
    }
  })
}
export function normalizeContactDraft(draft: ContactDraft): ContactDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: normalizeTrackingDigits(draft.phone),
    order: normalizeTrackingDigits(draft.order),
    message: draft.message.trim(),
  }
}
export function validateContactDraft(
  draft: ContactDraft,
  config = contactDemoConfig,
): ContactErrors {
  const normalized = normalizeContactDraft(draft)
  const errors: ContactErrors = {}
  if (!normalized.name) errors.name = "required"
  if (
    !enabledContactOptions(config.topics, config.demo).some(
      (option) => option.id === normalized.topic,
    )
  )
    errors.topic = "required"
  if (
    !enabledContactOptions(config.replyMethods, config.demo).some(
      (option) => option.id === normalized.method,
    )
  )
    errors.method = "required"
  if (
    normalized.method === "phone" &&
    !normalizeTrackingPhone(normalized.phone, normalized.country)
  )
    errors.phone = "invalid"
  if (
    normalized.method === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  )
    errors.email = "invalid"
  if (!normalized.message) errors.message = "required"
  for (const [field, limit] of Object.entries(config.maxLengths ?? {})) {
    if (
      (field === "phone" && normalized.method !== "phone") ||
      (field === "email" && normalized.method !== "email") ||
      (field === "order" && normalized.topic !== "order")
    )
      continue
    const key = field as keyof NonNullable<ContactConfig["maxLengths"]>
    if (typeof limit === "number" && normalized[key].length > limit)
      errors[key] = "too-long"
  }
  return errors
}
export function contactPayload(draft: ContactDraft) {
  const clean = normalizeContactDraft(draft)
  // Only the selected reply channel and relevant optional reference are submitted.
  return {
    name: clean.name,
    topic: clean.topic,
    message: clean.message,
    method: clean.method,
    reply:
      clean.method === "phone"
        ? normalizeTrackingPhone(clean.phone, clean.country)
        : clean.email,
    ...(clean.topic === "order" && clean.order
      ? { orderReference: clean.order }
      : {}),
  }
}
export type ContactOutcome = "confirmed" | "network" | "server" | "unknown" | "limited"
export interface ContactResponse {
  status: ContactOutcome
  demo: true
  reference?: string
  retryAfterSeconds?: number
}
export function createDemoContactService() {
  const receipts = new Map<string, ContactResponse>()
  let submissions = 0
  return {
    async submit(
      key: string,
      outcome: ContactOutcome,
    ): Promise<ContactResponse> {
      if (receipts.has(key)) return receipts.get(key)!
      if (
        outcome === "network" ||
        outcome === "server" ||
        outcome === "limited"
      )
        return { status: outcome, demo: true }
      submissions++
      const response: ContactResponse = { status: outcome, demo: true }
      receipts.set(key, response)
      return response
    },
    async recover(key: string): Promise<ContactResponse> {
      const existing = receipts.get(key)
      if (!existing) return { status: "unknown", demo: true }
      if (existing.status === "unknown") {
        const response: ContactResponse = { status: "confirmed", demo: true }
        receipts.set(key, response)
        return response
      }
      return existing
    },
    submissionCount: () => submissions,
  }
}
export function isContactRoute(route: string) {
  return ["/contact", "/fa/contact", "/en/contact"].includes(
    route.split(/[?#]/)[0],
  )
}
export function contactOrdersRoute(signedIn: boolean) {
  return signedIn ? "/account/orders" : "/login?returnTo=%2Faccount%2Forders"
}
export const contactPreviewModes: ContactOption[] = [
  { id: "normal", label: ["فرم عمومی", "General form"], approved: false },
  {
    id: "order",
    label: ["موضوع سفارش موجود", "Existing order topic"],
    approved: false,
  },
  {
    id: "commission",
    label: ["موضوع نقاشی سفارشی", "Commission topic"],
    approved: false,
  },
  { id: "phone", label: ["روش پاسخ تلفن", "Phone reply"], approved: false },
  {
    id: "validation",
    label: ["خطای اعتبارسنجی", "Validation errors"],
    approved: false,
  },
  { id: "sending", label: ["در حال ارسال", "Sending"], approved: false },
  { id: "success", label: ["رسید نمایشی", "Demo receipt"], approved: false },
  { id: "network", label: ["خطای شبکه", "Network error"], approved: false },
  {
    id: "unknown",
    label: ["نتیجه نامشخص", "Unconfirmed outcome"],
    approved: false,
  },
  { id: "server", label: ["خطای سرویس", "Server error"], approved: false },
  { id: "limited", label: ["محدودیت ارسال", "Rate limit"], approved: false },
  {
    id: "channels-loading",
    label: ["بارگذاری کانال‌ها", "Loading channels"],
    approved: false,
  },
  {
    id: "empty-channels",
    label: ["بدون کانال منتشرشده", "No published channels"],
    approved: false,
  },
  {
    id: "form-disabled",
    label: ["فرم غیرفعال", "Form disabled"],
    approved: false,
  },
  {
    id: "unavailable",
    label: ["همه مسیرها ناموجود", "All options unavailable"],
    approved: false,
  },
  {
    id: "translation",
    label: ["ترجمه منتشرنشده", "Unpublished translation"],
    approved: false,
  },
]
