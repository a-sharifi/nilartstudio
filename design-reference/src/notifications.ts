export type NoticeCategory = "orders" | "payments" | "commissions" | "support" | "account"
export type ReadFilter = "all" | "unread" | "read"
export type NoticeTarget = "order" | "proposal" | "artwork" | "ticket" | "refund" | "downloads" | "payment" | "security"
export type Notice = {
  id: string
  eventId: string
  owner: string
  category: NoticeCategory
  title: [string, string]
  description: [string, string]
  at: string
  read: boolean
  reference: string
  target: NoticeTarget
  actionable: boolean
}
export type NoticeSnapshot = {
  owner: string
  revision: number
  items: Notice[]
  unread: number | null
  fetchedAt: string
  bulk: "account" | "page" | "none"
}
export type NoticeMode = "normal" | "loading" | "network" | "empty" | "all-read" | "unknown-count" | "read-error" | "pending" | "partial-error" | "new-event" | "page-only" | "no-bulk" | "denied" | "expired"
export const noticeCategories: [NoticeCategory, string, string, string][] = [
  ["orders", "سفارش و ارسال", "Orders and delivery", "box"],
  ["payments", "پرداخت و بازپرداخت", "Payments and refunds", "bag"],
  ["commissions", "نقاشی سفارشی", "Commissions", "paint"],
  ["support", "پشتیبانی", "Support", "chat"],
  ["account", "حساب و امنیت", "Account and security", "shield"],
]
const demoOwner = "demo-customer"
export function noticeFixture(now = Date.now()): Notice[] {
  // Illustrative, explicitly Demo historical events; never future-dated.
  const base = Math.min(now - 3600000, Date.parse("2026-02-24T09:30:00Z"))
  const at = (minutes: number) => new Date(base - minutes * 60000).toISOString()
  const make = (
    id: string,
    category: NoticeCategory,
    title: [string, string],
    description: [string, string],
    minutes: number,
    read: boolean,
    target: NoticeTarget,
    reference: string,
    actionable = false,
  ): Notice => ({
    id,
    eventId: `event-${id}`,
    owner: demoOwner,
    category,
    title,
    description,
    at: at(minutes),
    read,
    target,
    reference,
    actionable,
  })
  return [
    make(
      "NT-108",
      "commissions",
      ["نسخه جدید طرح ارائه شد.", "A new artwork version has been submitted."],
      [
        "نسخه ارائه‌شده را در صفحه بررسی طرح ببینید؛ این اعلان به معنی تأیید طرح نیست.",
        "View the submitted version on the artwork review page; this notification does not approve it.",
      ],
      0,
      false,
      "artwork",
      "NA-24106",
      true,
    ),
    make(
      "NT-107",
      "support",
      ["پشتیبانی به تیکت شما پاسخ داد.", "Support has replied to your ticket."],
      [
        "برای ادامه پیگیری، پاسخ را در گفتگوی خصوصی خود بخوانید.",
        "Read the reply in your private conversation to continue following up.",
      ],
      0,
      false,
      "ticket",
      "SP-208",
      true,
    ),
    make(
      "NT-106",
      "payments",
      [
        "نتیجه پرداخت در حال بررسی است.",
        "Your payment result is being checked.",
      ],
      [
        "نتیجه پرداخت در حال بررسی است. دوباره پرداخت نکنید.",
        "Your payment result is being checked. Do not pay again.",
      ],
      120,
      false,
      "payment",
      "NA-24018",
    ),
    make(
      "NT-105",
      "commissions",
      [
        "پیشنهاد نقاشی برای بررسی آماده است.",
        "Your commission proposal is ready for review.",
      ],
      [
        "جزئیات و شرایط نسخه پیشنهادی را در مسیر اختصاصی بررسی کنید.",
        "Review the details and terms of the proposed version in its dedicated workflow.",
      ],
      240,
      false,
      "proposal",
      "Q-1042",
      true,
    ),
    make(
      "NT-104",
      "orders",
      ["فایل نهایی آماده دریافت است.", "Your final file is ready to download."],
      [
        "دسترسی جاری فایل و مجوز دریافت را در بخش دانلودها بررسی کنید.",
        "Check current file access and download permission in Downloads.",
      ],
      1440,
      true,
      "downloads",
      "NA-23976",
    ),
    make(
      "NT-103",
      "payments",
      [
        "وضعیت بازپرداخت به‌روزرسانی شد.",
        "Your refund status has been updated.",
      ],
      [
        "نتیجه جاری را در صفحه درخواست ببینید؛ این پیام تأیید انتقال وجه نیست.",
        "View the current result on your request page; this message does not confirm a funds transfer.",
      ],
      1500,
      true,
      "refund",
      "RR-2056",
    ),
    make(
      "NT-102",
      "orders",
      ["وضعیت سفارش شما تغییر کرد.", "Your order status has changed."],
      [
        "آخرین وضعیت سفارش و ارسال را در صفحه سفارش دنبال کنید.",
        "Follow the latest order and delivery status on the order page.",
      ],
      2880,
      false,
      "order",
      "NA-24018",
    ),
    make(
      "NT-101",
      "account",
      [
        "تنظیمات امنیت حساب به‌روزرسانی شد.",
        "Your account security settings were updated.",
      ],
      [
        "اگر این تغییر را نمی‌شناسید، از مسیر امنیت حساب پیگیری کنید. رمز یا کد تأیید ارسال نکنید.",
        "If you do not recognize this change, follow up in Account security. Do not send a password or verification code.",
      ],
      3000,
      true,
      "security",
      "",
    ),
    make(
      "NT-100",
      "orders",
      ["به‌روزرسانی یک سفارش ثبت شد.", "An order update was recorded."],
      [
        "این رویداد تاریخی است؛ دسترسی فعلی مقصد ممکن است تغییر کرده باشد.",
        "This is a historical event; current destination access may have changed.",
      ],
      4320,
      true,
      "order",
      "NA-unavailable",
    ),
  ]
}
export function sortNotices(items: Notice[]) {
  return [...items].sort(
    (a, b) =>
      b.at.localeCompare(a.at) ||
      b.eventId.localeCompare(a.eventId) ||
      b.id.localeCompare(a.id),
  )
}
export function filterNotices(
  items: Notice[],
  owner: string,
  read: ReadFilter,
  category: NoticeCategory | "all",
) {
  return sortNotices(
    items.filter(
      (n) =>
        n.owner === owner &&
        (category === "all" || n.category === category) &&
        (read === "all" || (read === "read" ? n.read : !n.read)),
    ),
  )
}
export function acceptNoticeSnapshot(
  current: NoticeSnapshot | null,
  incoming: NoticeSnapshot,
  owner: string,
) {
  if (
    incoming.owner !== owner ||
    (current && incoming.revision < current.revision)
  )
    return current
  const unique = new Map<string, Notice>()
  for (const notice of sortNotices(incoming.items)) {
    if (notice.owner === owner && !unique.has(notice.eventId))
      unique.set(notice.eventId, notice)
  }
  return { ...incoming, items: sortNotices([...unique.values()]) }
}
// Internal destinations are built from an allowlist, never arbitrary URLs from message text.
export function noticeDestination(
  notice: Notice,
  owner: string,
  language: "fa" | "en",
) {
  if (notice.owner !== owner) return null
  const account = `/${language}/account`
  const allowed: Record<NoticeTarget, string[]> = {
    order: ["NA-24018", "NA-23976"],
    payment: ["NA-24018"],
    artwork: ["NA-24106"],
    ticket: ["SP-208"],
    refund: ["RR-2056"],
    downloads: ["NA-23976"],
    security: [""],
    proposal: ["Q-1042"],
  }
  if (!allowed[notice.target]?.includes(notice.reference)) return null
  if (notice.target === "order") return `${account}/orders/${notice.reference}`
  if (notice.target === "payment")
    return `${account}/orders/${notice.reference}/receipt`
  if (notice.target === "artwork")
    return `${account}/orders/${notice.reference}/artwork-review`
  if (notice.target === "ticket")
    return `${account}/support/${notice.reference}`
  if (notice.target === "refund")
    return `${account}/requests/${notice.reference}`
  if (notice.target === "downloads") return `${account}/downloads`
  if (notice.target === "security") return `${account}/security`
  // No current proposal/assessment is connected in this demo. Do not fabricate its validity.
  return null
}
export const noticeActionText: Record<NoticeTarget, [string, string]> = {
  order: ["مشاهده سفارش", "View order"],
  payment: ["وضعیت پرداخت", "Payment status"],
  proposal: ["بررسی پیشنهاد", "Review proposal"],
  artwork: ["بررسی طرح", "Review artwork"],
  ticket: ["مشاهده پاسخ", "View reply"],
  refund: ["مشاهده بازپرداخت", "View refund"],
  downloads: ["رفتن به دانلودها", "Go to downloads"],
  security: ["امنیت حساب", "Account security"],
}
type ReadOperation = {
  ids: string[]
  result?: NoticeSnapshot
}
export class DemoNotificationsService {
  private items: Notice[]
  private revision = 1
  private operations = new Map<string, ReadOperation>()
  private authorized = true
  private fetchedAt = new Date().toISOString()
  constructor(
    private owner: string,
    private mode: NoticeMode = "normal",
  ) {
    this.items = mode === "empty" ? [] : noticeFixture()
    this.authorized =
      owner === demoOwner && !["denied", "expired"].includes(mode)
    if (!this.authorized) this.items = []
    if (mode === "all-read") this.items.forEach((n) => (n.read = true))
  }
  snapshot(): NoticeSnapshot | null {
    if (!this.authorized) return null
    const items = this.items.filter((n) => n.owner === this.owner)
    return structuredClone({
      owner: this.owner,
      revision: this.revision,
      items,
      unread:
        this.mode === "unknown-count"
          ? null
          : items.filter((n) => !n.read).length,
      fetchedAt: this.fetchedAt,
      bulk:
        this.mode === "no-bulk"
          ? "none"
          : this.mode === "page-only"
            ? "page"
            : "account",
    })
  }
  beginRead(operationId: string, ids?: string[]) {
    if (!this.authorized) return false
    if ((this.mode === "no-bulk" || this.mode === "page-only") && !ids) return false
    if (this.mode === "no-bulk" && ids && ids.length > 1) return false
    if (this.mode === "page-only" && ids && ids.length > 5) return false
    if (this.operations.has(operationId)) return true
    const permitted = this.items.filter((n) => n.owner === this.owner)
    if (ids?.some((id) => !permitted.some((n) => n.id === id))) return false
    this.operations.set(operationId, {
      ids: permitted
        .filter((n) => !n.read && (!ids || ids.includes(n.id)))
        .map((n) => n.id),
    })
    return true
  }
  confirmRead(operationId: string, fail = false): NoticeSnapshot | null {
    if (!this.authorized) return null
    const operation = this.operations.get(operationId)
    if (!operation) return null
    if (operation.result) return structuredClone(operation.result)
    if (fail || this.mode === "read-error") return null
    this.items.forEach((n) => {
      if (n.owner === this.owner && operation.ids.includes(n.id)) n.read = true
    })
    this.revision++
    this.fetchedAt = new Date().toISOString()
    operation.result = this.snapshot()!
    return structuredClone(operation.result)
  }
  refresh(includeNew = false): NoticeSnapshot | null {
    if (
      !this.authorized ||
      this.mode === "partial-error" ||
      this.mode === "network"
    )
      return null
    if (includeNew) {
      const eventId = "event-manual-refresh"
      if (!this.items.some((n) => n.eventId === eventId))
        this.items.push({
          id: "NT-109",
          eventId,
          owner: this.owner,
          category: "support",
          title: [
            "پاسخ تکمیلی پشتیبانی ثبت شد.",
            "An additional support reply was recorded.",
          ],
          description: [
            "برای دیدن پیام، گفتگوی خصوصی تیکت را باز کنید.",
            "Open your private ticket conversation to view the message.",
          ],
          at: new Date(Date.now() - 1000).toISOString(),
          read: false,
          reference: "SP-208",
          target: "ticket",
          actionable: true,
        })
    }
    this.revision++
    this.fetchedAt = new Date().toISOString()
    return this.snapshot()
  }
  clear() {
    this.items = []
    this.operations.clear()
    this.authorized = false
  }
}
// Single Demo account only, in-memory cache; no customer content is persisted to browser storage.
let demoService: DemoNotificationsService | null = null
let cacheSession: string | null = null
let view: {
  read: ReadFilter
  category: NoticeCategory | "all"
  page: number
  scroll: number
} = { read: "all", category: "all", page: 1, scroll: 0 }
export function syncNotificationsSession(session: string) {
  if (cacheSession !== session) {
    clearNotificationsDemo()
    cacheSession = session
  }
}
export function notificationsService(session = "demo") {
  syncNotificationsSession(session)
  return (demoService ||= new DemoNotificationsService(demoOwner))
}
export function notificationsView() {
  return { ...view }
}
export function saveNotificationsView(next: typeof view) {
  view = { ...next }
}
export function resetNotificationsDemo(mode: NoticeMode) {
  demoService?.clear()
  demoService = new DemoNotificationsService(demoOwner, mode)
  view = { read: "all", category: "all", page: 1, scroll: 0 }
  return demoService
}
export function clearNotificationsDemo() {
  demoService?.clear()
  demoService = null
  cacheSession = null
  view = { read: "all", category: "all", page: 1, scroll: 0 }
}
