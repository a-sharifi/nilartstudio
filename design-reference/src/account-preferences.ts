export type AccountPreferencesMode = "normal" | "email-missing" | "email-unverified" | "email-ready" | "marketing" | "marketing-on" | "required-channel" | "unknown-channel" | "channel-changed" | "dirty" | "loading" | "network" | "save-error" | "unknown" | "conflict" | "denied"
export type AccountLanguage = "fa" | "en"
export type ChannelId = "inApp" | "sms" | "email"
type Localized = [string, string]
export type PreferenceCategory = {
  id: string
  title: Localized
  description: Localized
  optional: boolean
  channels: ChannelId[]
  minimum: number
}
export type AccountPreferenceDraft = {
  language: AccountLanguage
  choices: Record<string, Partial<Record<ChannelId, boolean | null>>>
}
export type AccountPreferenceRecord = AccountPreferenceDraft & {
  owner: string
  version: number
  country: "IR"
  currency: "IRT"
  timeZone: "Asia/Tehran"
  calendar: "gregory"
}
export type AccountPreferencePolicy = {
  categories: PreferenceCategory[]
  channels: ChannelId[]
  smsStatus: "ready" | "unknown" | "unavailable"
  emailStatus: "ready" | "missing" | "unverified"
  emailVerificationRequired: boolean
  marketingEnabled: boolean
  queuedMessageCaveat: boolean
}
// Explicit fixture capability/policy records, not published store policy or consent inferred from orders.
export function accountPreferencesFixture(
  mode: AccountPreferencesMode,
  language: AccountLanguage,
) {
  const marketingEnabled = mode === "marketing" || mode === "marketing-on"
  const emailEnabled =
    marketingEnabled ||
    ["email-missing", "email-unverified", "email-ready"].includes(mode)
  const channels: ChannelId[] = emailEnabled
    ? ["inApp", "sms", "email"]
    : ["inApp", "sms"]
  const categories: PreferenceCategory[] = [
    {
      id: "order",
      title: ["تغییر وضعیت سفارش", "Order status updates"],
      description: [
        "خبرهای خدماتی سفارش، جدا از اطلاعات ضروری پرداخت.",
        "Service updates, separate from essential payment information.",
      ],
      optional: false,
      channels,
      minimum: 0,
    },
    {
      id: "delivery",
      title: ["ارسال و تحویل", "Shipping & delivery"],
      description: [
        "خبرهای آماده‌سازی و تحویل مرسوله‌های مرتبط.",
        "Updates on preparation and delivery of relevant shipments.",
      ],
      optional: false,
      channels,
      minimum: 0,
    },
    {
      id: "proposal",
      title: ["پیشنهاد نقاشی آماده بررسی", "Commission proposal ready"],
      description: [
        "اطلاع از پیشنهاد جدید برای بررسی در مسیر مستقل.",
        "A new proposal to review through its independent flow.",
      ],
      optional: false,
      channels,
      minimum: 0,
    },
    {
      id: "artwork",
      title: ["نسخه اولیه و اصلاحات", "Artwork drafts & revisions"],
      description: [
        "خبرهای نسخه جدید و بازخورد سفارش سفارشی.",
        "New-version and feedback updates for your commission.",
      ],
      optional: false,
      channels,
      minimum: 0,
    },
    {
      id: "files",
      title: ["آماده‌شدن فایل", "Files ready"],
      description: [
        "اطلاع از تحویل فایل‌های مجاز مشتری.",
        "Updates on authorized customer-file delivery.",
      ],
      optional: false,
      channels,
      minimum: 0,
    },
    {
      id: "support",
      title: ["پاسخ پشتیبانی", "Support replies"],
      description: [
        "خبر از پاسخ تیکت، بدون نمایش متن حساس مکاتبه.",
        "Ticket reply notifications without sensitive correspondence previews.",
      ],
      optional: false,
      channels,
      minimum: mode === "required-channel" ? 1 : 0,
    },
  ]
  if (marketingEnabled)
    categories.push(
      {
        id: "newsletter",
        title: ["خبرنامه", "Newsletter"],
        description: [
          "مطالب و خبرهای هنری؛ رضایت مستقل از خدمات سفارش.",
          "Art stories and news; consent separate from order services.",
        ],
        optional: true,
        channels: ["email"],
        minimum: 0,
      },
      {
        id: "collections",
        title: [
          "کالکشن‌ها و پیشنهاد محصولات",
          "Collections & product recommendations",
        ],
        description: [
          "معرفی کالکشن جدید و پیشنهاد محصول؛ اختیاری و مستقل از خرید.",
          "New collection and product recommendations; optional and independent of purchases.",
        ],
        optional: true,
        channels,
        minimum: 0,
      },
    )
  const choices: AccountPreferenceDraft["choices"] = {}
  for (const category of categories) {
    choices[category.id] = {}
    for (const channel of category.channels)
      choices[category.id][channel] = category.optional
        ? false
        : channel === "inApp" ||
          (channel === "sms" && ["order", "delivery"].includes(category.id))
    if (mode === "unknown-channel" && category.channels.includes("sms"))
      choices[category.id].sms = null
  }
  if (mode === "marketing-on") {
    choices.newsletter.email = true
    choices.collections.inApp = true
  }
  const policy: AccountPreferencePolicy = {
    categories,
    channels,
    smsStatus: mode === "unknown-channel" ? "unknown" : "ready",
    emailStatus:
      mode === "email-missing"
        ? "missing"
        : mode === "email-unverified"
          ? "unverified"
          : "ready",
    emailVerificationRequired: emailEnabled,
    marketingEnabled,
    queuedMessageCaveat: marketingEnabled,
  }
  const record: AccountPreferenceRecord = {
    owner: "demo-customer",
    version: 1,
    language,
    choices,
    country: "IR",
    currency: "IRT",
    timeZone: "Asia/Tehran",
    calendar: "gregory",
  }
  return { policy, record }
}
export function accountPreferenceDraft(
  record: AccountPreferenceRecord,
): AccountPreferenceDraft {
  return {
    language: record.language,
    choices: Object.fromEntries(
      Object.entries(record.choices).map(([id, choices]) => [
        id,
        { ...choices },
      ]),
    ),
  }
}
export function preferencesDirty(
  record: AccountPreferenceRecord,
  draft: AccountPreferenceDraft,
) {
  if (record.language !== draft.language) return true
  const categories = new Set([
    ...Object.keys(record.choices),
    ...Object.keys(draft.choices),
  ])
  for (const id of categories)
    for (const channel of ["inApp", "sms", "email"] as ChannelId[])
      if (record.choices[id]?.[channel] !== draft.choices[id]?.[channel])
        return true
  return false
}
export function channelAvailable(
  channel: ChannelId,
  policy: AccountPreferencePolicy,
) {
  return (
    policy.channels.includes(channel) &&
    (channel === "inApp" ||
      (channel === "sms" && policy.smsStatus === "ready") ||
      (channel === "email" && (policy.emailStatus === "ready" || policy.emailStatus === "unverified" && !policy.emailVerificationRequired)))
  )
}
export function validateAccountPreferences(
  draft: AccountPreferenceDraft,
  policy: AccountPreferencePolicy,
) {
  const errors: Record<string, string> = {}
  if (!["fa", "en"].includes(draft.language)) errors.language = "language"
  for (const id of Object.keys(draft.choices)) {
    const category = policy.categories.find((item) => item.id === id)
    if (!category) {
      errors[`category-${id}`] = "readonly"
      continue
    }
    for (const [channel, value] of Object.entries(draft.choices[id])) {
      if (
        !category.channels.includes(channel as ChannelId) ||
        !policy.channels.includes(channel as ChannelId) ||
        !["boolean", "object"].includes(typeof value) ||
        (typeof value === "object" && value !== null)
      )
        errors[`category-${id}`] = "readonly"
      else if (
        value === true &&
        !channelAvailable(channel as ChannelId, policy)
      )
        errors[`category-${id}`] = "channel"
    }
  }
  for (const category of policy.categories) {
    for (const channel of category.channels) {
      const value = draft.choices[category.id]?.[channel]
      if (
        typeof value !== "boolean" &&
        !(value === null && channel === "sms" && policy.smsStatus === "unknown")
      )
        errors[`category-${category.id}`] = "readonly"
    }
    const count = category.channels.filter(
      (channel) =>
        draft.choices[category.id]?.[channel] === true &&
        channelAvailable(channel, policy),
    ).length
    if (count < category.minimum) errors[`category-${category.id}`] = "minimum"
    if (!draft.choices[category.id])
      errors[`category-${category.id}`] = "readonly"
  }
  return errors
}
export function applyAccountPreferences(
  record: AccountPreferenceRecord,
  draft: AccountPreferenceDraft,
  policy: AccountPreferencePolicy,
  owner: string,
  version: number,
) {
  if (owner !== record.owner) return { record, error: "permission", errors: {} }
  if (version !== record.version)
    return { record, error: "conflict", errors: {} }
  const errors = validateAccountPreferences(draft, policy)
  if (Object.keys(errors).length) return { record, error: "validation", errors }
  return {
    record: {
      ...record,
      ...accountPreferenceDraft({ ...record, ...draft }),
      version: record.version + 1,
    },
    error: null,
    errors: {},
  }
}
