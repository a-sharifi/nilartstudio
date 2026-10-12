import {
  acceptedSupportFile,
  supportPolicy,
  supportTickets,
  type Ticket,
  type TicketStatus,
} from "./support"

export type ConversationFile = {
  id: string
  name: string
  type: string
  size: number
  state: "available" | "missing" | "checking" | "denied"
}
export type ReplyFile = {
  id: string
  name: string
  type: string
  size: number
  state: "selected" | "uploading" | "checking" | "accepted" | "failed"
}
export type ConversationMessage = {
  id: string
  sender: "customer" | "support"
  text: [string, string]
  at: string
  files: ConversationFile[]
  unread: boolean
  link?: "downloads"
}
export type Conversation = {
  ticket: Ticket
  created: string
  version: number
  canReply: boolean
  canReopen: boolean
  filesEnabled: boolean
  messages: ConversationMessage[]
}
export type ReplyPayload = {
  text: string
  files: ReplyFile[]
  version: number
}
export type ReplyResult =
  | {
      kind: "success"
      message: ConversationMessage
    }
  | {
      kind: "error"
      error?: string
    }
  | { kind: "unknown" }
  | { kind: "changed" }
  | { kind: "permission" }
export type ConversationMode = "normal" | "long" | "empty" | "loading" | "network" | "closed" | "reopen" | "no-files" | "attachment-error" | "denied" | "expired"
// Ephemeral prototype handoff only. Never stored in localStorage, URLs or analytics.
type TicketHandoff = {
  ticket: Ticket
  description: string
}
const handoffs = new Map<string, TicketHandoff>()
export function handoffDemoTicket(ticket: Ticket, description: string) {
  if (ticket.owner === "demo-customer")
    handoffs.set(ticket.id, { ticket: structuredClone(ticket), description })
}
export function clearConversationHandoffs() {
  handoffs.clear()
}
export function conversationFixture(
  id: string,
  customer: string,
  mode: ConversationMode = "normal",
): Conversation | null {
  const handoff = handoffs.get(id)
  const source = handoff?.ticket || supportTickets.find((t) => t.id === id)
  if (
    !source ||
    source.owner !== customer ||
    mode === "denied" ||
    mode === "expired"
  )
    return null
  const ticket = { ...source, title: [...source.title] as [string, string] }
  if (mode === "closed" || mode === "reopen") ticket.status = "closed"
  const updated = new Date(ticket.updated).getTime()
  const at = (minutes: number) =>
    new Date(updated - minutes * 60000).toISOString()
  const digital = ticket.topic === "digital"
  const messages: ConversationMessage[] = handoff
    ? [
        {
          id: `${id}-first`,
          sender: "customer",
          text: [handoff.description, handoff.description],
          at: ticket.updated,
          files: [],
          unread: false,
        },
      ]
    : [
        {
          id: "m-1",
          sender: "customer",
          text: digital
            ? [
                "سلام، برای دریافت فایل سفارش به راهنمایی نیاز دارم.",
                "Hello, I need some help accessing the files for my order.",
              ]
            : [
                "سلام، درباره موضوع این تیکت به راهنمایی نیاز دارم.",
                "Hello, I would like some guidance about this request.",
              ],
          at: at(2880),
          files: [],
          unread: false,
        },
        {
          id: "m-2",
          sender: "support",
          text: [
            "سلام، درخواست شما را دریافت کردیم. لطفاً فقط توضیحات مرتبط با مسئله را ارسال کنید.",
            "Hello, we received your request. Please share only the details relevant to this issue.",
          ],
          at: at(2800),
          files: [],
          unread: false,
        },
        {
          id: "m-3",
          sender: "customer",
          text: [
            "ممنون، توضیحات تکمیلی را در همین گفتگو ارسال می‌کنم.",
            "Thank you. I will share the additional details in this conversation.",
          ],
          at: at(2700),
          files: [],
          unread: false,
        },
        {
          id: "m-4",
          sender: "support",
          text: [
            "برای پیگیری، لطفاً بگویید در کدام مرحله با مشکل روبه‌رو شده‌اید.",
            "To help us follow up, please let us know at which step you encountered the issue.",
          ],
          at: at(2600),
          files: [],
          unread: false,
        },
        {
          id: "m-5",
          sender: "customer",
          text: digital
            ? [
                "با ورود به حساب، سفارش را می‌بینم؛ اما هنگام دریافت فایل پیام خطا نمایش داده می‌شود.",
                "I can see the order in my account, but an error appears when I try to download the file.",
              ]
            : [
                "لطفاً مسیر مناسب پیگیری این درخواست را راهنمایی کنید.",
                "Please help me find the appropriate way to follow up on this request.",
              ],
          at: at(1440),
          files: [],
          unread: false,
        },
        {
          id: "m-6",
          sender: "support",
          text: digital
            ? [
                "فایل‌های مجاز از بخش «دانلودها» در دسترس‌اند. راهنمای کوتاه نمونه را هم به این پیام پیوست کرده‌ایم.\nاین پیام نتیجه پرداخت یا تغییر وضعیت سفارش را تأیید نمی‌کند.",
                "Authorized files are available in Downloads. A sample quick guide is also attached here.\nThis message does not confirm a payment result or an order status change.",
              ]
            : [
                "پیگیری این موضوع در همین تیکت انجام می‌شود. هر نتیجه مربوط به سفارش یا بازپرداخت باید در مسیر اختصاصی بررسی شود.",
                "We can follow up on this issue in this ticket. Any order or refund result must be checked in its dedicated workflow.",
              ],
          at: at(1380),
          files: digital
            ? [
                {
                  id: "guide",
                  name: "download-guide.pdf",
                  type: "application/pdf",
                  size: 245760,
                  state: mode === "attachment-error" ? "missing" : "available",
                },
              ]
            : [],
          unread: false,
          ...(digital ? { link: "downloads" as const } : {}),
        },
        {
          id: "m-7",
          sender: "customer",
          text: digital
            ? [
                "هنوز مسئله حل نشده است. می‌توانم تصویر پیام خطا را بدون اطلاعات شخصی ارسال کنم.",
                "The issue is not resolved yet. I can share a screenshot of the error without personal information.",
              ]
            : [
                "ممنون از راهنمایی. توضیحات بیشتری درباره نتیجه موردانتظار دارم.",
                "Thank you for the guidance. I have a few more details about the outcome I need.",
              ],
          at: at(60),
          files: [],
          unread: false,
        },
        {
          id: "m-8",
          sender: "support",
          text: digital
            ? [
                "بله، لطفاً متن خطا یا تصویر بدون اطلاعات حساس را همین‌جا بفرستید تا موضوع را بررسی کنیم.\nرمز، کد تأیید و تصویر کارت بانکی لازم نیست.",
                "Yes, please share the error text or a screenshot without sensitive information so we can review the issue.\nWe do not need your password, verification code or a bank card image.",
              ]
            : [
                "در صورت نیاز، توضیحات مرتبط را همین‌جا اضافه کنید. برای ثبت درخواست مالی یا تأیید طرح، از مسیر رسمی استفاده کنید.",
                "You can add relevant details here if needed. Use the official workflow for financial requests or artwork approval.",
              ],
          at: ticket.updated,
          files: [],
          unread: ticket.unread > 0,
        },
      ]
  if (mode === "long" && !handoff) {
    messages.unshift(
      ...Array.from(
        { length: 12 },
        (_, n): ConversationMessage => ({
          id: `earlier-${n}`,
          sender: n % 2 ? "support" : "customer",
          text:
            n % 2
              ? [
                  "پیام قبلی نمونه: لطفاً جزئیات مرتبط با همین مسئله را در گفتگو نگه دارید.",
                  "Earlier demo message: please keep the details relevant to this issue in the conversation.",
                ]
              : [
                  "توضیح قبلی نمونه درباره مسئله؛ نتیجه موردانتظار را برای پیگیری روشن کرده‌ام.",
                  "Earlier demo details about the issue; I have clarified the outcome I need for follow-up.",
                ],
          at: at(5000 - n * 60),
          files: [],
          unread: false,
        }),
      ),
    )
  }
  return {
    ticket,
    created: messages[0]?.at || at(2880),
    version: 1,
    canReply: ticket.status !== "closed",
    canReopen: mode === "reopen",
    filesEnabled: mode !== "no-files",
    messages: mode === "empty" ? [] : messages,
  }
}
export function validateReply(
  conversation: Conversation | null,
  customer: string,
  payload: ReplyPayload,
) {
  const errors: Record<string, string> = {}
  if (!conversation || conversation.ticket.owner !== customer)
    errors.permission = "permission"
  else if (
    !conversation.canReply ||
    conversation.ticket.status === "closed" ||
    payload.version !== conversation.version
  )
    errors.status = "status"
  // Demo contract requires non-whitespace text, even when a file is present.
  if (
    !payload.text.trim() ||
    payload.text.length > supportPolicy.descriptionMax
  )
    errors.text = "text"
  if (
    payload.files.length > supportPolicy.fileCount ||
    payload.files.some(
      (f) => f.state !== "accepted" || !acceptedSupportFile(f),
    ) ||
    (payload.files.length > 0 && !conversation?.filesEnabled)
  )
    errors.files = "files"
  return errors
}
// A local, owner-scoped mock response boundary, not a real support service.
export class DemoConversationService {
  private record: Conversation | null
  private operations = new Map<string, {
    payload: ReplyPayload
    result?: ReplyResult
  }>()
  constructor(
    id: string,
    private customer: string,
    mode: ConversationMode = "normal",
  ) {
    this.record = conversationFixture(id, customer, mode)
  }
  snapshot(): Conversation | null {
    return this.record ? structuredClone(this.record) : null
  }
  private nextTime() {
    // Simulated server clock stays chronological even when fixture dates are in the future.
    const messages = this.record?.messages || []
    const last = messages[messages.length - 1]?.at
    return new Date(
      Math.max(Date.now(), last ? Date.parse(last) + 1000 : 0),
    ).toISOString()
  }
  begin(id: string, payload: ReplyPayload) {
    const existing = this.operations.get(id)
    if (existing) return {}
    const errors = validateReply(this.record, this.customer, payload)
    if (!Object.keys(errors).length)
      this.operations.set(id, { payload: structuredClone(payload) })
    return errors
  }
  resolve(
    id: string,
    outcome: "success" | "error" | "unknown" | "changed",
  ): ReplyResult {
    const operation = this.operations.get(id)
    if (
      !operation ||
      !this.record ||
      this.record.ticket.owner !== this.customer
    )
      return { kind: "permission" }
    if (operation.result) return operation.result
    if (outcome === "error") {
      operation.result = { kind: "error", error: "send" }
      return operation.result
    }
    if (outcome === "changed") {
      this.record.ticket.status = "closed"
      this.record.canReply = false
      this.record.version++
      operation.result = { kind: "changed" }
      return operation.result
    }
    const validation = validateReply(
      this.record,
      this.customer,
      operation.payload,
    )
    if (Object.keys(validation).length) return { kind: "changed" }
    const message: ConversationMessage = {
      id: `reply-${id}`,
      sender: "customer",
      text: [operation.payload.text.trim(), operation.payload.text.trim()],
      at: this.nextTime(),
      unread: false,
      files: operation.payload.files.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        state: "missing",
      })),
    }
    this.record.messages.push(message)
    this.record.ticket.updated = message.at
    this.record.ticket.status = "review"
    this.record.ticket.unread = 0
    this.record.version++
    operation.result = { kind: "success", message }
    return outcome === "unknown" ? { kind: "unknown" } : operation.result
  }
  check(id: string): ReplyResult {
    return this.operations.get(id)?.result || { kind: "unknown" }
  }
  markVisible(ids: string[]) {
    if (!this.record || this.record.ticket.owner !== this.customer) return
    this.record.messages.forEach((m) => {
      if (ids.includes(m.id) && m.sender === "support") m.unread = false
    })
    this.record.ticket.unread = this.record.messages.filter(
      (m) => m.unread,
    ).length
  }
  receive(): ConversationMessage | null {
    if (!this.record || this.record.ticket.owner !== this.customer) return null
    const message: ConversationMessage = {
      id: `incoming-${this.record.messages.length}`,
      sender: "support",
      text: [
        "پیام تکمیلی نمونه: لطفاً نتیجه آخرین بررسی خود را در همین گفتگو بنویسید.",
        "Additional demo message: please share the result of your latest check in this conversation.",
      ],
      at: this.nextTime(),
      files: [],
      unread: true,
    }
    this.record.messages.push(message)
    this.record.ticket.updated = message.at
    this.record.ticket.unread++
    return structuredClone(message)
  }
  reopen(version: number): boolean {
    if (
      !this.record ||
      this.record.ticket.owner !== this.customer ||
      !this.record.canReopen ||
      this.record.ticket.status !== "closed" ||
      this.record.version !== version
    )
      return false
    this.record.ticket.status = "review"
    this.record.canReply = true
    this.record.version++
    return true
  }
  clear() {
    this.record = null
    this.operations.clear()
  }
}
export const ticketStatusText: Record<TicketStatus, [string, string]> = {
  submitted: ["ثبت‌شده", "Submitted"],
  review: ["در حال بررسی", "Under review"],
  waiting: ["منتظر پاسخ شما", "Awaiting your reply"],
  answered: ["پاسخ داده‌شده", "Answered"],
  closed: ["بسته‌شده", "Closed"],
}
