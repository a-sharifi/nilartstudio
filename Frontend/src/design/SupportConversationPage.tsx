import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import ReplyAttachments, { type LocalReplyFile } from "./ReplyAttachments"
import type { ReferenceNavigationGuard } from "./ReferencesPage"
import { supportOrders, supportPolicy, topics } from "./support"
import {
  DemoConversationService,
  clearConversationHandoffs,
  ticketStatusText,
  type ConversationMode,
  type ConversationMessage,
  type ReplyPayload,
  type ReplyResult,
} from "./support-conversation"
import "./support.css"
import "./support-conversation.css"

const modes: [ConversationMode, string, string][] = [
  ["normal", "گفتگوی نمونه", "Sample conversation"],
  ["long", "تاریخچه طولانی", "Long history"],
  ["closed", "تیکت بسته", "Closed ticket"],
  ["reopen", "بازگشایی فعال", "Reopening enabled"],
  ["empty", "بدون پیام", "No messages"],
  ["loading", "بارگذاری", "Loading"],
  ["network", "خطای دریافت", "Load error"],
  ["attachment-error", "پیوست ناموجود", "Missing attachment"],
  ["no-files", "پیوست غیرفعال", "Attachments off"],
  ["denied", "عدم دسترسی", "Access denied"],
  ["expired", "نشست منقضی", "Session expired"],
]
type SendState = "idle" | "sending" | "success" | "error" | "unknown" | "changed"
type Modal = "leave" | "reopen" | "destination" | null

export default function SupportConversationPage({
  page,
  navigate,
  registerGuard,
}: {
  page: string
  navigate: (route: string) => void
  registerGuard: (guard: ReferenceNavigationGuard | null) => void
}) {
  const en = page.startsWith("/en/"),
    ix = en ? 1 : 0
  const t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`,
    id = page.split("/")[4]
  const [service, setService] = useState(
    () => new DemoConversationService(id, "demo-customer"),
  )
  const [record, setRecord] = useState(() => service.snapshot())
  const [mode, setMode] = useState<ConversationMode>("normal")
  const [text, setText] = useState(""),
    [files, setFiles] = useState<LocalReplyFile[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [sendState, setSendState] = useState<SendState>("idle")
  const [live, setLive] = useState(""),
    [attachmentNotice, setAttachmentNotice] = useState<Record<string, string>>(
      {},
    )
  const [loaded, setLoaded] = useState(4),
    [earlierBusy, setEarlierBusy] = useState(false)
  const [newMessageId, setNewMessageId] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null),
    [destination, setDestination] = useState("")
  const [pendingReply, setPendingReply] = useState<ReplyPayload | null>(null)
  const dialog = useRef<HTMLDialogElement>(null),
    history = useRef<HTMLElement>(null),
    reply = useRef<HTMLTextAreaElement>(null)
  const origin = useRef<HTMLElement | null>(null),
    leaveAction = useRef<(() => void) | null>(null)
  const dirtyRef = useRef(false),
    sendLock = useRef(false),
    resolveLock = useRef(false),
    operationId = useRef(""),
    languagePass = useRef(false)
  const scrollAnchor = useRef<{
    id: string
    top: number
    focus?: boolean
  } | null>(null)
  const serviceRef = useRef(service),
    mounted = useRef(true)
  const restricted = !record || mode === "denied" || mode === "expired"
  const ready = !restricted && mode !== "loading" && mode !== "network"
  const blocked = sendState === "sending" || sendState === "unknown"
  dirtyRef.current =
    !restricted && (text.length > 0 || files.length > 0 || blocked)
  serviceRef.current = service
  const messages = record?.messages || []
  const visibleMessages = messages.slice(-loaded)
  const hasEarlier = messages.length > loaded
  const canReply =
    ready && record?.canReply && record.ticket.status !== "closed"
  const relatedOrder =
    record &&
    supportOrders.find(
      (o) => o.id === record.ticket.order && o.owner === record.ticket.owner,
    )
  const date = (value: string) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value))
  const timestamp = (value: string) => (
    <time dateTime={value}>{date(value)}</time>
  )
  const focusOrigin = () =>
    requestAnimationFrame(() => {
      if (origin.current?.isConnected)
        origin.current.focus({ preventScroll: true })
      else reply.current?.focus({ preventScroll: true })
    })
  const closeModal = () => {
    setModal(null)
    leaveAction.current = null
    focusOrigin()
  }
  const requestLeave = (proceed: () => void) => {
    if (sendState === "sending") return
    if (!dirtyRef.current) {
      proceed()
      return
    }
    leaveAction.current = proceed
    origin.current = (document.activeElement as HTMLElement)
    setModal("leave")
  }
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const retired = serviceRef.current
      queueMicrotask(() => {
        if (!mounted.current) retired.clear()
      })
    }
  }, [])
  useEffect(() => {
    const guard: ReferenceNavigationGuard = (proceed) => {
      if (!dirtyRef.current || languagePass.current) {
        proceed()
        return true
      }
      if (sendState === "sending") return false
      leaveAction.current = proceed
      origin.current = (document.activeElement as HTMLElement)
      setModal("leave")
      return false
    }
    registerGuard(guard)
    return () => registerGuard(null)
  }, [registerGuard, sendState])
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault()
        event.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", unload)
    return () => window.removeEventListener("beforeunload", unload)
  }, [])
  useEffect(() => {
    if (modal) {
      if (!dialog.current?.open) dialog.current?.showModal()
      requestAnimationFrame(() =>
        dialog.current?.querySelector<HTMLElement>("button")?.focus(),
      )
    } else if (dialog.current?.open) dialog.current.close()
  }, [modal])
  useLayoutEffect(() => {
    const anchor = scrollAnchor.current
    if (!anchor) return
    const node = document.getElementById(`conversation-${anchor.id}`)
    if (node) {
      window.scrollBy(0, node.getBoundingClientRect().top - anchor.top)
      if (anchor.focus) node.focus({ preventScroll: true })
    }
    scrollAnchor.current = null
  }, [loaded])
  // Only visible, loaded messages in this authorized Demo record are marked in memory.
  // No read receipt from support is invented, and no other ticket is touched.
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        const ids = entries
          .filter((e) => e.isIntersecting)
          .map((e) => (e.target as HTMLElement).dataset.messageId!)
          .filter(Boolean)
        if (!ids.length || !mounted.current) return
        service.markVisible(ids)
      },
      { threshold: 0.5 },
    )
    history.current
      ?.querySelectorAll<HTMLElement>("[data-message-id]")
      .forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [service, ready, visibleMessages.map((m) => m.id).join("|")])
  const route = (target: string) => {
    if (
      target === `${account}/orders/${relatedOrder?.id}`
    ) {
      setDestination(target)
      setModal("destination")
    } else navigate(target)
  }
  const panelNavigation = (target: string) => {
    if (
      /^\/(fa|en)\/account\/support\/[^/]+$/.test(target) &&
      target.split("/")[4] === id
    ) {
      // App keeps this component keyed by ticket, so switching language retains the reply.
      languagePass.current = true
      try {
        navigate(target)
      } finally {
        languagePass.current = false
      }
    } else requestLeave(() => route(target))
  }
  const follow = (target: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    event.preventDefault()
    origin.current = event.currentTarget
    requestLeave(() => route(target))
  }
  const leave = () => {
    const proceed = leaveAction.current
    dirtyRef.current = false
    sendLock.current = false
    operationId.current = ""
    setText("")
    setFiles([])
    setPendingReply(null)
    setModal(null)
    leaveAction.current = null
    proceed?.()
  }
  const errorText = (key: string) =>
    ({
      text: t(
        "متن پاسخ را وارد کنید؛ حد طول را نیز رعایت کنید.",
        "Enter your reply and stay within the length limit.",
      ),
      files: t(
        "این فایل قابل قبول نیست. همه فایل‌ها باید پذیرفته شده باشند.",
        "This file is not accepted. All files must be accepted.",
      ),
      status: t(
        "این تیکت در حال حاضر قابل پاسخ نیست.",
        "This ticket currently cannot receive replies.",
      ),
      permission: t("دسترسی مجاز نیست.", "Access denied."),
    })[key]
  const handleResult = (result: ReplyResult) => {
    if (result.kind === "unknown") {
      setSendState("unknown")
      resolveLock.current = false
      return
    }
    if (result.kind === "permission") {
      service.clear()
      clearConversationHandoffs()
      setRecord(null)
      setText("")
      setFiles([])
      setPendingReply(null)
      dirtyRef.current = false
      setSendState("idle")
      sendLock.current = false
      resolveLock.current = false
      return
    }
    if (result.kind === "error") {
      setSendState("error")
      setPendingReply(null)
      sendLock.current = false
      resolveLock.current = false
      operationId.current = ""
      setLive(
        t(
          "ارسال پاسخ ممکن نشد. متن و فایل‌های انتخابی حفظ شدند.",
          "Unable to send your reply. Your text and selected files are preserved.",
        ),
      )
      return
    }
    if (result.kind === "changed") {
      setRecord(service.snapshot())
      setSendState("changed")
      setPendingReply(null)
      sendLock.current = false
      resolveLock.current = false
      operationId.current = ""
      setLive(
        t(
          "وضعیت تیکت تغییر کرده است. اقدام‌های مجاز را بررسی کنید.",
          "The ticket status has changed. Review the available actions.",
        ),
      )
      return
    }
    setRecord(service.snapshot())
    setLoaded((n) => n + 1)
    setText("")
    setFiles([])
    setErrors({})
    setPendingReply(null)
    setSendState("success")
    sendLock.current = false
    resolveLock.current = false
    operationId.current = ""
    dirtyRef.current = false
    setLive(
      t(
        "پاسخ در گفتگوی نمونه ثبت شد · Demo؛ ارسال واقعی انجام نشد.",
        "Reply added to the sample conversation · Demo; no real reply was sent.",
      ),
    )
    requestAnimationFrame(() => {
      const node = document.getElementById(`conversation-${result.message.id}`)
      node?.scrollIntoView({ block: "nearest" })
      node?.focus({ preventScroll: true })
    })
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (sendLock.current || !ready) return
    const payload: ReplyPayload = {
      text,
      files: files.map(({ id, name, type, size, state }) => ({
        id,
        name,
        type,
        size,
        state,
      })),
      version: record!.version,
    }
    const id = crypto.randomUUID()
    const validation = service.begin(id, payload)
    setErrors(validation)
    if (Object.keys(validation).length) {
      requestAnimationFrame(() =>
        document
          .getElementById(
            Object.keys(validation)[0] === "files"
              ? "reply-files"
              : "conversation-reply",
          )
          ?.focus(),
      )
      return
    }
    sendLock.current = true
    resolveLock.current = false
    operationId.current = id
    setPendingReply(payload)
    setSendState("sending")
    setLive(
      t(
        "در حال ارسال… · Demo؛ منتظر انتخاب پاسخ نمونه.",
        "Sending… · Demo; awaiting a sample response selection.",
      ),
    )
  }
  const receiveResponse = (
    outcome: "success" | "error" | "unknown" | "changed",
  ) => {
    if (resolveLock.current || !operationId.current || sendState !== "sending")
      return
    resolveLock.current = true
    handleResult(service.resolve(operationId.current, outcome))
  }
  const loadEarlier = () => {
    const first =
      history.current?.querySelector<HTMLElement>("[data-message-id]")
    if (first)
      scrollAnchor.current = {
        id: first.dataset.messageId!,
        top: first.getBoundingClientRect().top,
        focus: true,
      }
    setLoaded((n) => n + 4)
    setEarlierBusy(false)
    setLive(
      t("پیام‌های قبلی نمونه دریافت شدند.", "Earlier demo messages loaded."),
    )
  }
  const receiveNew = () => {
    if (!ready || blocked) return
    const anchors = Array.from(
      history.current?.querySelectorAll<HTMLElement>("[data-message-id]") || [],
    )
    const anchor =
      anchors.find(
        (node) =>
          node.getBoundingClientRect().bottom > 0 &&
          node.getBoundingClientRect().top < window.innerHeight,
      ) || anchors[0]
    if (anchor)
      scrollAnchor.current = {
        id: anchor.dataset.messageId!,
        top: anchor.getBoundingClientRect().top,
      }
    const message = service.receive()
    if (!message) return
    setRecord((previous) =>
      previous
        ? {
            ...previous,
            ticket: { ...previous.ticket, updated: message.at },
            messages: [...previous.messages, message],
          }
        : previous,
    )
    // Keep the same older messages rendered; never scroll to the new one automatically.
    setLoaded((n) => n + 1)
    setNewMessageId(message.id)
    setLive(
      t(
        "یک پیام جدید نمونه دریافت شد؛ موقعیت مطالعه تغییر نکرد.",
        "A new demo message arrived; your reading position is unchanged.",
      ),
    )
  }
  const jumpNew = () => {
    if (!newMessageId) return
    const node = document.getElementById(`conversation-${newMessageId}`)
    node?.scrollIntoView({ block: "center", behavior: "smooth" })
    node?.focus({ preventScroll: true })
    setNewMessageId(null)
  }
  const reset = (value: ConversationMode) => {
    service.clear()
    if (value === "expired" || value === "denied") clearConversationHandoffs()
    const next = new DemoConversationService(id, "demo-customer", value)
    setService(next)
    setRecord(next.snapshot())
    setMode(value)
    setLoaded(4)
    setEarlierBusy(false)
    setNewMessageId(null)
    setText("")
    setFiles([])
    setErrors({})
    setPendingReply(null)
    setSendState("idle")
    setAttachmentNotice({})
    setLive("")
    sendLock.current = false
    resolveLock.current = false
    operationId.current = ""
    dirtyRef.current = false
  }
  const preview = (value: ConversationMode) => {
    if (value === "expired" || value === "denied") reset(value)
    else requestLeave(() => reset(value))
  }
  const copy = async () => {
    if (!ready || !record) return
    try {
      await navigator.clipboard.writeText(record.ticket.id)
      if (mounted.current)
        setLive(t("شماره تیکت کپی شد.", "Ticket number copied."))
    } catch {
      if (mounted.current)
        setLive(
          t(
            "کپی ممکن نشد؛ شماره تیکت را دستی انتخاب کنید.",
            "Could not copy; select the ticket number manually.",
          ),
        )
    }
  }
  const attachment = (message: ConversationMessage) =>
    message.files.map((file) => (
      <div className="conversation-file" key={file.id}>
        <span className="conversation-file-icon">
          <Glyph name="download" size={20} />
        </span>
        <div>
          <bdi>{file.name}</bdi>
          <small>
            {file.type} · {(file.size / 1024).toFixed(0)} KB · Demo
          </small>
          {file.state !== "available" && (
            <p>
              {t(
                "این فایل برای دریافت در دسترس نیست؛ ممکن است حذف شده، بررسی‌نشده یا غیرمجاز باشد.",
                "This file is unavailable; it may be removed, unreviewed or unauthorized.",
              )}
            </p>
          )}
          {attachmentNotice[`${message.id}-${file.id}`] && (
            <p role="status">{attachmentNotice[`${message.id}-${file.id}`]}</p>
          )}
        </div>
        {file.state === "available" && (
          <button
            type="button"
            className="text-link reply-text-button"
            onClick={() =>
              setAttachmentNotice((previous) => ({
                ...previous,
                [`${message.id}-${file.id}`]: t(
                  "فایل نمونه محتوای قابل دریافت ندارد و سرویس متصل نیست؛ دانلود آغاز نشد.",
                  "This sample file has no downloadable content and no service is connected; no download started.",
                ),
              }))
            }
          >
            {t("دریافت فایل · Demo", "Get file · Demo")}
          </button>
        )}
      </div>
    ))
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      activeSection="support"
      panelTitle={
        ready
          ? record!.ticket.title[ix]
          : t("گفتگو با پشتیبانی", "Support conversation")
      }
      onBeforeNavigate={panelNavigation}
    >
      <div className="support-page conversation-page">
        <nav
          className="support-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <a href={`${account}/support`} onClick={follow(`${account}/support`)}>
            {t("پشتیبانی", "Support")}
          </a>
          <span>/</span>
          <bdi aria-current="page">{ready ? record!.ticket.id : "—"}</bdi>
        </nav>
        <header className="conversation-heading">
          <div>
            <span className="eyebrow">NILART · CUSTOMER CARE</span>
            <h1>
              {ready
                ? record!.ticket.title[ix]
                : t("گفتگو با پشتیبانی", "Support conversation")}
            </h1>
            <p>
              {t(
                "یک گفتگو، برای پیگیری روشن مسئله شما.",
                "A conversation to help you move forward.",
              )}
            </p>
          </div>
          <a
            className="text-link"
            href={`${account}/support`}
            onClick={follow(`${account}/support`)}
          >
            <Glyph name="arrow" size={18} />
            {t("بازگشت به پشتیبانی", "Back to support")}
          </a>
        </header>
        <div className="support-demo">
          <bdi>Demo</bdi>
          <p>
            {t(
              "گفتگو، زمان‌ها، مجوزها و قواعد همگی نمونه‌اند. ارسال، خوانده‌شدن، آپلود و بازگشایی واقعی انجام نمی‌شود؛ سرویس پشتیبانی متصل نیست.",
              "Conversation, timestamps, permissions and rules are fixtures. No real send, read, upload or reopening occurs; no support service is connected.",
            )}
          </p>
        </div>
        <div
          className="conversation-live"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {live}
        </div>
        {restricted ? (
          <section className="support-empty dash-card">
            <Glyph name="shield" size={36} />
            <h2>
              {mode === "expired"
                ? t("نشست شما منقضی شده است.", "Your session has expired.")
                : t(
                    "این گفتگو در دسترس نیست.",
                    "This conversation is unavailable.",
                  )}
            </h2>
            <p>
              {t(
                "برای حفظ حریم خصوصی، اطلاعات تیکت نمایش داده نمی‌شود.",
                "To protect privacy, no ticket details are shown.",
              )}
            </p>
            {mode === "expired" && (
              <a
                className="button primary"
                href={`${prefix}/auth/session-expired`}
                onClick={follow(`${prefix}/auth/session-expired`)}
              >
                {t("ورود دوباره", "Sign in again")} · AUTH-09
              </a>
            )}
            <a
              className="button secondary"
              href={`${account}/support`}
              onClick={follow(`${account}/support`)}
            >
              {t("بازگشت به پشتیبانی", "Back to support")}
            </a>
          </section>
        ) : mode === "loading" ? (
          <div
            className="conversation-loading"
            aria-busy="true"
            aria-label={t(
              "دریافت مشخصات و گفتگو",
              "Loading ticket details and conversation",
            )}
          >
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : mode === "network" ? (
          <section className="support-empty dash-card" role="alert">
            <Glyph name="chat" size={32} />
            <h2>
              {t("دریافت گفتگو ممکن نشد.", "Unable to load the conversation.")}
            </h2>
            <p>
              {t(
                "این خطا مربوط به دریافت است؛ پاسخ ارسال‌شده‌ای تأیید نشده است.",
                "This is a loading error; no reply submission has been confirmed.",
              )}
            </p>
            <button
              className="button secondary"
              onClick={() => reset("normal")}
            >
              {t("تلاش دوباره · Demo", "Retry · Demo")}
            </button>
          </section>
        ) : (
          <div className="conversation-layout">
            <div className="conversation-primary">
              <section
                ref={history}
                className="conversation-history"
                aria-labelledby="conversation-title"
              >
                <div className="conversation-section-head">
                  <div className="conversation-section-name">
                    <Glyph name="chat" size={22} />
                    <h2 id="conversation-title">
                      {t("گفتگوی شما", "Your conversation")}
                    </h2>
                  </div>
                  <span className={`support-status ${record!.ticket.status}`}>
                    {ticketStatusText[record!.ticket.status][ix]}
                  </span>
                </div>
                {hasEarlier && (
                  <div className="conversation-earlier" aria-busy={earlierBusy}>
                    {earlierBusy ? (
                      <>
                        <span>
                          {t(
                            "در حال دریافت پیام‌های قبلی… · Demo",
                            "Loading earlier messages… · Demo",
                          )}
                        </span>
                        <button
                          className="button secondary"
                          onClick={loadEarlier}
                        >
                          {t(
                            "دریافت پاسخ تاریخچه · Demo",
                            "Receive history response · Demo",
                          )}
                        </button>
                      </>
                    ) : (
                      <button
                        className="button secondary"
                        onClick={() => setEarlierBusy(true)}
                      >
                        <Glyph name="clock" size={16} />
                        {t("نمایش پیام‌های قبلی", "Load earlier messages")}
                      </button>
                    )}
                  </div>
                )}
                {newMessageId && (
                  <button className="conversation-new-button" onClick={jumpNew}>
                    <Glyph name="chat" size={18} />
                    {t(
                      "پیام جدید · رفتن به پیام",
                      "New message · Go to message",
                    )}{" "}
                    · Demo
                  </button>
                )}
                {!messages.length && (
                  <div className="support-empty dash-card">
                    <Glyph name="chat" size={32} />
                    <h2>
                      {t(
                        "پیامی برای نمایش در دسترس نیست.",
                        "No messages are available to display.",
                      )}
                    </h2>
                    <p>
                      {t(
                        "تیکت معتبر است؛ نبود پیام به معنی نبود تیکت نیست.",
                        "The ticket is valid; an empty conversation does not mean a missing ticket.",
                      )}
                    </p>
                  </div>
                )}
                <ol className="conversation-messages">
                  {visibleMessages.map((message) => (
                    <li key={message.id}>
                      {message.unread && (
                        <div className="conversation-new-divider">
                          <span>
                            {t("پیام‌های جدید", "New messages")} · Demo
                          </span>
                        </div>
                      )}
                      <article
                        id={`conversation-${message.id}`}
                        data-message-id={message.id}
                        tabIndex={-1}
                        className={`conversation-message ${message.sender}`}
                        aria-label={`${
                          message.sender === "customer"
                            ? t("شما", "You")
                            : t("پشتیبانی نیل‌آرت", "Nilart support")
                        } · ${date(message.at)}`}
                      >
                        <header>
                          <span className="conversation-sender">
                            <span className="conversation-avatar">
                              <Glyph
                                name={
                                  message.sender === "customer"
                                    ? "user"
                                    : "paint"
                                }
                                size={18}
                              />
                            </span>
                            <strong>
                              {message.sender === "customer"
                                ? t("شما", "You")
                                : t("پشتیبانی نیل‌آرت", "Nilart support")}
                            </strong>
                          </span>
                          {timestamp(message.at)}
                        </header>
                        <p className="conversation-message-text" dir="auto">
                          {message.text[ix]}
                        </p>
                        {message.link === "downloads" && relatedOrder && (
                          <a
                            className="text-link"
                            href={`${account}/downloads`}
                            onClick={follow(`${account}/downloads`)}
                          >
                            {t(
                              "مشاهده دانلودهای مجاز",
                              "View authorized downloads",
                            )}
                            <Glyph name="arrow" size={16} />
                          </a>
                        )}
                        {attachment(message)}
                      </article>
                    </li>
                  ))}
                </ol>
                {pendingReply && (
                  <article
                    className="conversation-message customer conversation-pending"
                    aria-label={t(
                      "پاسخ در انتظار تأیید",
                      "Reply awaiting confirmation",
                    )}
                  >
                    <header>
                      <strong>{t("شما", "You")}</strong>
                      <span>
                        {sendState === "unknown"
                          ? t(
                              "ثبت تأیید نشده · Demo",
                              "Submission unconfirmed · Demo",
                            )
                          : t("در حال ارسال… · Demo", "Sending… · Demo")}
                      </span>
                    </header>
                    <p className="conversation-message-text" dir="auto">
                      {pendingReply.text}
                    </p>
                    {pendingReply.files.map((f) => (
                      <bdi className="conversation-pending-file" key={f.id}>
                        {f.name}
                      </bdi>
                    ))}
                  </article>
                )}
              </section>
              {record!.ticket.status === "closed" && (
                <section
                  className="conversation-closed dash-card"
                  aria-labelledby="closed-title"
                >
                  <Glyph name="shield" size={24} />
                  <div>
                    <h2 id="closed-title">
                      {t("این تیکت بسته شده است", "This ticket is closed")}
                    </h2>
                    <p>
                      {t(
                        "بسته‌شدن، تأیید رضایت، تکمیل بازپرداخت یا ارسال سفارش نیست. پاسخ تازه بدون مجوز ثبت نمی‌شود.",
                        "Closed does not confirm satisfaction, a completed refund or order delivery. New replies require permission.",
                      )}
                    </p>
                    {record!.canReopen ? (
                      <button
                        className="button secondary"
                        onClick={(event) => {
                          origin.current = event.currentTarget
                          setModal("reopen")
                        }}
                      >
                        {t(
                          "درخواست بازگشایی · Demo",
                          "Request reopening · Demo",
                        )}
                      </button>
                    ) : (
                      <a
                        className="button secondary"
                        href={`${account}/support?new=1`}
                        onClick={follow(`${account}/support?new=1`)}
                      >
                        {t("ثبت تیکت جدید", "Create a new ticket")}
                      </a>
                    )}
                  </div>
                </section>
              )}
              {(canReply || text || files.length > 0 || blocked) && (
                <form
                  className="conversation-composer dash-card"
                  onSubmit={submit}
                  noValidate
                  aria-busy={sendState === "sending"}
                >
                  <div className="conversation-section-name">
                    <Glyph name="paint" size={22} />
                    <h2>{t("پاسخ شما", "Your reply")}</h2>
                  </div>
                  <label htmlFor="conversation-reply">
                    {t("پاسخ شما", "Your reply")} *
                  </label>
                  <textarea
                    ref={reply}
                    id="conversation-reply"
                    dir="auto"
                    rows={5}
                    value={text}
                    maxLength={supportPolicy.descriptionMax}
                    readOnly={!canReply || blocked}
                    aria-invalid={!!errors.text}
                    aria-describedby={`reply-help reply-limit${
                      errors.text ? " reply-text-error" : ""
                    }`}
                    placeholder={t(
                      "توضیحات مرتبط را اینجا بنویسید…",
                      "Write the relevant details here…",
                    )}
                    onChange={(event) => {
                      setText(event.target.value)
                      setErrors((previous) => ({ ...previous, text: "" }))
                      if (sendState === "error" || sendState === "success")
                        setSendState("idle")
                    }}
                  />
                  {errors.text && (
                    <p
                      id="reply-text-error"
                      role="alert"
                      className="checkout-field-error"
                    >
                      {errorText("text")}
                    </p>
                  )}
                  <div className="conversation-reply-help">
                    <p id="reply-help">
                      {t(
                        "توضیحات مرتبط را بنویسید. رمز، کد تأیید یا اطلاعات کامل بانکی ارسال نکنید.",
                        "Write the relevant details. Do not send passwords, verification codes or full banking information.",
                      )}
                    </p>
                    <span id="reply-limit">
                      {text.length} / {supportPolicy.descriptionMax} · Demo
                    </span>
                  </div>
                  {record!.filesEnabled ? (
                    <ReplyAttachments
                      en={en}
                      files={files}
                      setFiles={setFiles}
                      error={!!errors.files}
                      setError={(value) =>
                        setErrors((previous) => ({
                          ...previous,
                          files: value ? "files" : "",
                        }))
                      }
                      disabled={!canReply || blocked}
                    />
                  ) : (
                    <p className="support-guidance">
                      {t(
                        "پیوست فعال نیست؛ اطلاعات حساس ارسال نکنید. مسیر خصوصی معتبر را از پشتیبانی درخواست کنید.",
                        "Attachments are unavailable. Do not send sensitive data; ask support for a verified private delivery method.",
                      )}
                    </p>
                  )}
                  {errors.status && (
                    <p className="checkout-field-error" role="alert">
                      {errorText("status")}
                    </p>
                  )}
                  {sendState === "error" && (
                    <p className="checkout-field-error" role="alert">
                      {t(
                        "ارسال پاسخ ممکن نشد. متن و فایل‌های شما حفظ شده‌اند.",
                        "Unable to send your reply. Your text and files are preserved.",
                      )}
                    </p>
                  )}
                  {sendState === "changed" && (
                    <p className="support-guidance" role="alert">
                      {t(
                        "وضعیت تیکت تغییر کرده است. اقدام‌های مجاز را بررسی کنید. متن شما حفظ شد و ارسال انجام نشد.",
                        "The ticket status has changed. Review the available actions. Your text is preserved; no reply was submitted.",
                      )}
                    </p>
                  )}
                  {sendState === "unknown" && (
                    <div className="support-guidance">
                      <strong>
                        {t(
                          "ثبت پاسخ هنوز تأیید نشده است.",
                          "Reply submission has not been confirmed yet.",
                        )}
                      </strong>
                      <p>
                        {t(
                          "ارسال مجدد مسدود است؛ همان عملیات بررسی می‌شود.",
                          "Resubmission is blocked; the same operation will be checked.",
                        )}
                      </p>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => {
                          if (resolveLock.current) return
                          resolveLock.current = true
                          handleResult(service.check(operationId.current))
                        }}
                      >
                        {t(
                          "بررسی وضعیت عملیات · Demo",
                          "Check operation status · Demo",
                        )}
                      </button>
                    </div>
                  )}
                  <div className="conversation-compose-actions">
                    <button
                      type="submit"
                      className="button primary"
                      disabled={!canReply || blocked}
                    >
                      <Glyph name="arrow" size={18} />
                      {sendState === "sending"
                        ? t("در حال ارسال…", "Sending…")
                        : sendState === "error"
                          ? t("تلاش مجدد · Demo", "Retry · Demo")
                          : t("ارسال پاسخ · Demo", "Send reply · Demo")}
                    </button>
                    <span>
                      {t(
                        "Enter فقط خط جدید ایجاد می‌کند.",
                        "Enter inserts a new line only.",
                      )}
                    </span>
                  </div>
                  <p className="support-caption">
                    {t(
                      "این مکاتبه جای پذیرش رسمی پیشنهاد، تأیید طرح یا نتیجه عملیات مالی را نمی‌گیرد.",
                      "This conversation does not replace formal quote acceptance, artwork approval or financial operation results.",
                    )}
                  </p>
                </form>
              )}
              {sendState === "sending" && (
                <section
                  className="conversation-response-controls"
                  aria-label={t("پاسخ عملیات نمونه", "Demo operation response")}
                >
                  <strong>
                    {t(
                      "انتخاب پاسخ سرویس نمونه",
                      "Choose the mock service response",
                    )}{" "}
                    · Demo
                  </strong>
                  <p>
                    {t(
                      "موفقیت با گذشت زمان اعلام نمی‌شود؛ پاسخ نمونه را صریحاً انتخاب کنید.",
                      "Success is not declared after a delay; explicitly choose a sample response.",
                    )}
                  </p>
                  <div>
                    <button
                      className="button secondary"
                      onClick={() => receiveResponse("success")}
                    >
                      {t("تأیید ثبت", "Confirm submission")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => receiveResponse("error")}
                    >
                      {t("خطای قطعی", "Definite failure")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => receiveResponse("unknown")}
                    >
                      {t("نتیجه نامشخص", "Unknown result")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => receiveResponse("changed")}
                    >
                      {t("تیکت هم‌زمان بسته شد", "Ticket closed concurrently")}
                    </button>
                  </div>
                </section>
              )}
            </div>
            <aside className="conversation-aside">
              <section className="dash-card conversation-details">
                <div className="conversation-section-name">
                  <Glyph name="book" size={20} />
                  <h2>{t("مشخصات تیکت", "Ticket details")}</h2>
                </div>
                <dl>
                  <div>
                    <dt>{t("شماره تیکت", "Ticket number")}</dt>
                    <dd>
                      <bdi>{record!.ticket.id}</bdi>
                      <button
                        className="icon-button"
                        onClick={copy}
                        aria-label={t("کپی شماره تیکت", "Copy ticket number")}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <rect x="8" y="8" width="12" height="13" rx="2" />
                          <path d="M16 8V3H3v13h5" />
                        </svg>
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("موضوع", "Topic")}</dt>
                    <dd>
                      {
                        topics.find(
                          (topic) => topic[0] === record!.ticket.topic,
                        )?.[en ? 2 : 1]
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>{t("تاریخ ایجاد", "Created")}</dt>
                    <dd>{timestamp(record!.created)}</dd>
                  </div>
                  <div>
                    <dt>{t("آخرین به‌روزرسانی", "Last updated")}</dt>
                    <dd>{timestamp(record!.ticket.updated)}</dd>
                  </div>
                  <div>
                    <dt>{t("وضعیت", "Status")}</dt>
                    <dd>
                      <span
                        className={`support-status ${record!.ticket.status}`}
                      >
                        {ticketStatusText[record!.ticket.status][ix]}
                      </span>
                    </dd>
                  </div>
                </dl>
                <small>
                  {t(
                    "همه زمان‌ها به وقت تهران · Demo",
                    "All times in Tehran time · Demo",
                  )}
                </small>
              </section>
              {relatedOrder && (
                <section className="dash-card conversation-related">
                  <span className="conversation-related-icon">
                    <Glyph name="box" size={24} />
                  </span>
                  <h2>{t("سفارش مرتبط", "Related order")}</h2>
                  <bdi>{relatedOrder.id}</bdi>
                  <p>
                    {t(
                      "ارتباط مجاز در حساب نمونه؛ شماره سفارش با شماره تیکت متفاوت است.",
                      "Authorized demo account link; order and ticket numbers are different.",
                    )}
                  </p>
                  <a
                    className="text-link"
                    href={`${account}/orders/${relatedOrder.id}`}
                    onClick={follow(`${account}/orders/${relatedOrder.id}`)}
                  >
                    {t("مشاهده سفارش", "View order")}
                    <Glyph name="arrow" size={16} />
                  </a>
                </section>
              )}
              <section className="conversation-safety">
                <Glyph name="shield" size={24} />
                <h2>{t("گفتگوی امن", "A safe conversation")}</h2>
                <p>
                  {t(
                    "پشتیبانی نیل‌آرت هرگز رمز یا کد تأیید شما را درخواست نمی‌کند.",
                    "Nilart support never asks for your password or verification code.",
                  )}
                </p>
                <p>
                  {t(
                    "وضعیت سفارش، بازپرداخت و تأیید هنری را در مسیر اختصاصی بررسی کنید.",
                    "Check order status, refunds and artwork approval in their dedicated workflows.",
                  )}
                </p>
                {relatedOrder && (
                  <>
                    {record!.ticket.topic === "digital" && (
                      <a
                        href={`${account}/downloads`}
                        onClick={follow(`${account}/downloads`)}
                      >
                        {t("دانلودهای مجاز", "Authorized downloads")}
                        <Glyph name="arrow" size={16} />
                      </a>
                    )}
                    <a
                      href={`${account}/orders/${relatedOrder.id}/cancel`}
                      onClick={follow(
                        `${account}/orders/${relatedOrder.id}/cancel`,
                      )}
                    >
                      {t("درخواست لغو", "Cancellation request")}
                      <Glyph name="arrow" size={16} />
                    </a>
                    <a
                      href={`${account}/orders/${relatedOrder.id}/return`}
                      onClick={follow(
                        `${account}/orders/${relatedOrder.id}/return`,
                      )}
                    >
                      {t("درخواست مرجوعی", "Return request")}
                      <Glyph name="arrow" size={16} />
                    </a>
                  </>
                )}
              </section>
            </aside>
          </div>
        )}
        <details className="dash-preview conversation-preview">
          <summary>
            {t("حالت‌های پروتوتایپ", "Prototype states")} · USER-16 · Demo
          </summary>
          <div>
            {modes.map(([value, fa, english]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => preview(value)}
              >
                {t(fa, english)}
              </button>
            ))}
            <button disabled={!ready || blocked} onClick={receiveNew}>
              {t("دریافت پیام جدید · Demo", "Receive new message · Demo")}
            </button>
          </div>
          <p>
            {t(
              "برای دیدن pending، پاسخ را ارسال کنید و نتیجه نمونه را انتخاب کنید. در حالت نامشخص، بررسی همان عملیات فقط یک پیام برمی‌گرداند.",
              "Send a reply to see pending and choose the sample response. For an unknown result, checking the same operation returns only one message.",
            )}
          </p>
        </details>
        <dialog
          ref={dialog}
          className="support-dialog conversation-dialog"
          aria-labelledby="conversation-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            closeModal()
          }}
        >
          <h2 id="conversation-dialog-title">
            {modal === "leave"
              ? t(
                  "پاسخ هنوز ثبت نشده است.",
                  "Your reply has not been submitted.",
                )
              : modal === "reopen"
                ? t("درخواست بازگشایی تیکت", "Request ticket reopening")
                : t("مقصد مستقل", "Independent destination")}
          </h2>
          <p>
            {modal === "leave"
              ? t(
                  "با خروج، متن و فایل‌های محلی پاک می‌شوند. اگر نتیجه نامشخص است، قبل از پاسخ تازه وضعیت همان عملیات را بررسی کنید.",
                  "Leaving clears your text and local files. If the result is unknown, check that operation before sending another reply.",
                )
              : modal === "reopen"
                ? t(
                    "بازگشایی نمونه فقط امکان پیگیری را فعال می‌کند؛ رفع مشکل یا تکمیل بازپرداخت را تأیید نمی‌کند.",
                    "Demo reopening only enables follow-up; it does not confirm issue resolution or a completed refund.",
                  )
                : t(
                    "صفحه مقصد مستقل است و در محدوده طراحی USER-16 تغییر نمی‌کند.",
                    "This destination is independent and is not redesigned as part of USER-16.",
                  )}
          </p>
          {modal === "destination" && <code dir="ltr">{destination}</code>}
          <div className="support-form-actions">
            <button className="button secondary" onClick={closeModal}>
              {modal === "leave" ? t("ماندن", "Stay") : t("بازگشت", "Back")}
            </button>
            {modal === "leave" && (
              <button className="button primary" onClick={leave}>
                {t("خروج بدون ثبت", "Leave without submitting")}
              </button>
            )}
            {modal === "reopen" && (
              <button
                className="button primary"
                onClick={() => {
                  const success = record && service.reopen(record.version)
                  if (success) {
                    setRecord(service.snapshot())
                    setSendState("idle")
                    setLive(
                      t(
                        "بازگشایی در مدل محلی تأیید شد · Demo؛ عملیات واقعی نیست.",
                        "Reopening confirmed in the local model · Demo; no real operation occurred.",
                      ),
                    )
                  } else
                    setLive(
                      t(
                        "بازگشایی تأیید نشد؛ وضعیت و مجوز باید دوباره بررسی شوند.",
                        "Reopening was not confirmed; status and permission need to be checked.",
                      ),
                    )
                  closeModal()
                }}
              >
                {t("تأیید درخواست · Demo", "Confirm request · Demo")}
              </button>
            )}
          </div>
        </dialog>
      </div>
    </DashboardPage>
  )
}
