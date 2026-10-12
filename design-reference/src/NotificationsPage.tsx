import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import {
  acceptNoticeSnapshot,
  clearNotificationsDemo,
  filterNotices,
  noticeActionText,
  noticeCategories,
  noticeDestination,
  notificationsService,
  notificationsView,
  resetNotificationsDemo,
  saveNotificationsView,
  sortNotices,
  type Notice,
  type NoticeCategory,
  type NoticeMode,
  type NoticeSnapshot,
  type ReadFilter,
} from "./notifications"
import "./notifications.css"

const previews: [NoticeMode, string, string][] = [
  ["normal", "فهرست نمونه", "Sample list"],
  ["loading", "بارگذاری", "Loading"],
  ["empty", "بدون اعلان", "Empty"],
  ["all-read", "همه خوانده‌شده", "All read"],
  ["unknown-count", "تعداد نامشخص", "Unknown count"],
  ["network", "خطای دریافت", "Load error"],
  ["partial-error", "خطای تازه‌سازی", "Refresh error"],
  ["read-error", "خطای خوانده‌شدن", "Read error"],
  ["pending", "تأیید دستی عملیات", "Manual confirmation"],
  ["new-event", "پاسخ تازه‌سازی با رویداد جدید", "Refresh with a new event"],
  ["page-only", "دامنه صفحه جاری", "Current-page scope"],
  ["no-bulk", "بدون عملیات گروهی", "Bulk disabled"],
  ["denied", "عدم دسترسی", "Access denied"],
  ["expired", "نشست منقضی", "Session expired"],
]
type Operation = {
  id: string
  noticeId?: string
  destination?: string
}
export default function NotificationsPage({
  page,
  navigate,
  sessionKey = "demo",
}: {
  page: string
  navigate: (route: string) => void
  sessionKey?: string
}) {
  const en = page.startsWith("/en/"),
    ix = en ? 1 : 0,
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [service, setService] = useState(() => notificationsService(sessionKey))
  const [snapshot, setSnapshot] = useState<NoticeSnapshot | null>(() =>
    service.snapshot(),
  )
  const [incoming, setIncoming] = useState<NoticeSnapshot | null>(null),
    [mode, setMode] = useState<NoticeMode>("normal")
  const [readFilter, setReadFilter] = useState<ReadFilter>(
    () => notificationsView().read,
  )
  const [category, setCategory] = useState<NoticeCategory | "all">(
    () => notificationsView().category,
  )
  const [number, setNumber] = useState(() => notificationsView().page)
  const [pending, setPending] = useState<Operation | null>(null),
    [pinned, setPinned] = useState<string | null>(null)
  const [live, setLive] = useState(""),
    [readError, setReadError] = useState<string | null>(null),
    [refreshError, setRefreshError] = useState(false)
  const [modal, setModal] = useState<"bulk" | "unavailable" | "order" | null>(
      null,
    ),
    [selected, setSelected] = useState<Notice | null>(null)
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null),
    mounted = useRef(true)
  const operation = useRef<Operation | null>(null),
    list = useRef<HTMLElement>(null)
  const scrollAnchor = useRef<{
    id: string
    top: number
  } | null>(null)
  const viewRef = useRef({
    read: readFilter,
    category,
    page: number,
    scroll: 0,
  })
  const restricted = !snapshot || mode === "denied" || mode === "expired"
  const loaded = !restricted && mode !== "loading" && mode !== "network"
  const countSource = incoming || snapshot
  const unread = loaded ? countSource!.unread : null
  const matching = snapshot
    ? filterNotices(snapshot.items, "demo-customer", readFilter, category)
    : []
  const pages = Math.max(1, Math.ceil(matching.length / 5)),
    current = Math.min(number, pages)
  const pageItems = matching.slice((current - 1) * 5, current * 5)
  const pinnedNotice = snapshot?.items.find(
    (n) =>
      n.id === pinned &&
      n.owner === "demo-customer" &&
      (category === "all" || n.category === category),
  )
  const items =
    pinnedNotice && !pageItems.some((n) => n.id === pinnedNotice.id)
      ? sortNotices([...pageItems, pinnedNotice])
      : pageItems
  viewRef.current = { read: readFilter, category, page: current, scroll: 0 }
  const count = (value: number) => value.toLocaleString(en ? "en" : "fa")
  const date = (value: string) =>
    new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value))
  useEffect(() => {
    mounted.current = true
    const saved = notificationsView()
    if (saved.scroll)
      requestAnimationFrame(() => window.scrollTo(0, saved.scroll))
    const remember = () =>
      saveNotificationsView({ ...viewRef.current, scroll: window.scrollY })
    window.addEventListener("scroll", remember, { passive: true })
    return () => {
      remember()
      mounted.current = false
      window.removeEventListener("scroll", remember)
    }
  }, [])
  useEffect(() => {
    saveNotificationsView({ ...viewRef.current, scroll: window.scrollY })
  }, [readFilter, category, current])
  useLayoutEffect(() => {
    const anchor = scrollAnchor.current
    if (!anchor) return
    const node = list.current?.querySelector<HTMLElement>(
      `[data-notice-id="${anchor.id}"]`,
    )
    if (node) window.scrollBy(0, node.getBoundingClientRect().top - anchor.top)
    scrollAnchor.current = null
  }, [snapshot, incoming, live, refreshError])
  useEffect(() => {
    if (modal) {
      if (!dialog.current?.open) dialog.current?.showModal()
      requestAnimationFrame(() =>
        dialog.current?.querySelector<HTMLElement>("button")?.focus(),
      )
    } else if (dialog.current?.open) dialog.current.close()
  }, [modal])
  const close = () => {
    setModal(null)
    requestAnimationFrame(
      () =>
        origin.current?.isConnected &&
        origin.current.focus({ preventScroll: true }),
    )
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    event.preventDefault()
    saveNotificationsView({ ...viewRef.current, scroll: window.scrollY })
    navigate(route)
  }
  const applyReadResult = (result: NoticeSnapshot) => {
    if (incoming && snapshot) {
      const knownIds = new Set(snapshot.items.map((n) => n.id))
      setIncoming(acceptNoticeSnapshot(incoming, result, "demo-customer"))
      setSnapshot((previous) =>
        acceptNoticeSnapshot(
          previous,
          { ...result, items: result.items.filter((n) => knownIds.has(n.id)) },
          "demo-customer",
        ),
      )
    } else
      setSnapshot((previous) =>
        acceptNoticeSnapshot(previous, result, "demo-customer"),
      )
  }
  const goDestination = (route: string) => {
    if (/\/account\/orders\/[^/]+$/.test(route)) setModal("order")
    else {
      saveNotificationsView({ ...viewRef.current, scroll: window.scrollY })
      navigate(route)
    }
  }
  const finishRead = (fail = false) => {
    const request = operation.current
    if (!request || !mounted.current) return
    const result = service.confirmRead(request.id, fail)
    operation.current = null
    setPending(null)
    if (!result) {
      if (!service.snapshot()) {
        setSnapshot(null)
        setIncoming(null)
        setSelected(null)
        setModal(null)
        return
      }
      setReadError(request.noticeId || "bulk")
      setLive(
        t(
          "ثبت خوانده‌شدن ممکن نشد؛ وضعیت قبلی حفظ شد. هیچ اقدام مالی یا هنری انجام نشد.",
          "Unable to update read status; previous state is preserved. No financial or artwork action occurred.",
        ),
      )
    } else {
      applyReadResult(result)
      setReadError(null)
      if (readFilter === "unread" && request.noticeId && !request.destination)
        setPinned(request.noticeId)
      setLive(
        t(
          "وضعیت خوانده‌شدن در مدل محلی تأیید شد · Demo؛ ثبت واقعی نیست.",
          "Read status confirmed in the local model · Demo; no real update occurred.",
        ),
      )
    }
    // Reading is independent of destination access; a failed read update does not block help.
    if (request.destination) goDestination(request.destination)
  }
  const beginRead = (notice?: Notice, destination?: string) => {
    if (operation.current || !loaded || !snapshot) return
    const id = crypto.randomUUID()
    const ids = notice
      ? [notice.id]
      : snapshot.bulk === "page"
        ? pageItems.map((n) => n.id)
        : undefined
    if (!service.beginRead(id, ids)) {
      setLive(t("این عملیات مجاز نیست.", "This operation is not authorized."))
      return
    }
    const request = { id, noticeId: notice?.id, destination }
    operation.current = request
    setPending(request)
    setReadError(null)
    if (mode !== "pending")
      queueMicrotask(() => {
        if (operation.current?.id === id) finishRead()
      })
  }
  const openNotice = (
    notice: Notice,
    event: MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
  ) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
    event.preventDefault()
    origin.current = event.currentTarget
    if (operation.current) return
    setSelected(notice)
    const destination = noticeDestination(
      notice,
      "demo-customer",
      en ? "en" : "fa",
    )
    if (!destination) {
      setModal("unavailable")
      return
    }
    if (notice.read) goDestination(destination)
    else beginRead(notice, destination)
  }
  const refresh = () => {
    if (!loaded) return
    const anchor = Array.from(
      list.current?.querySelectorAll<HTMLElement>("[data-notice-id]") || [],
    ).find(
      (node) =>
        node.getBoundingClientRect().bottom > 0 &&
        node.getBoundingClientRect().top < window.innerHeight,
    )
    if (anchor)
      scrollAnchor.current = {
        id: anchor.dataset.noticeId!,
        top: anchor.getBoundingClientRect().top,
      }
    const response = service.refresh(mode === "new-event" || mode === "pending")
    if (!response) {
      setRefreshError(true)
      setLive(
        t(
          "تازه‌سازی کامل نشد؛ فهرست قبلی با زمان دریافت آن حفظ شد.",
          "Refresh failed; the previous list is retained with its fetch time.",
        ),
      )
      return
    }
    setRefreshError(false)
    setPinned(null)
    const newIds = response.items.filter(
      (n) =>
        !snapshot!.items.some((previous) => previous.eventId === n.eventId),
    )
    if (newIds.length) {
      setIncoming((previous) =>
        acceptNoticeSnapshot(previous || snapshot, response, "demo-customer"),
      )
      setLive(
        t(
          "اعلان جدید در پاسخ تازه‌سازی نمونه دریافت شد؛ برای نمایش آن اقدام کنید.",
          "A new notification arrived in the demo refresh response; choose to display it.",
        ),
      )
    } else {
      setSnapshot((previous) =>
        acceptNoticeSnapshot(previous, response, "demo-customer"),
      )
      setLive(
        t(
          "تازه‌سازی نمونه بررسی شد؛ رویداد تکراری اضافه نشد.",
          "Demo refresh checked; no duplicate event was added.",
        ),
      )
    }
  }
  const preview = (value: NoticeMode) => {
    operation.current = null
    setPending(null)
    setPinned(null)
    setIncoming(null)
    setReadError(null)
    setRefreshError(false)
    setLive("")
    setModal(null)
    setSelected(null)
    if (value === "expired" || value === "denied") clearNotificationsDemo()
    const next = resetNotificationsDemo(value)
    setService(next)
    setSnapshot(next.snapshot())
    setMode(value)
    setReadFilter("all")
    setCategory("all")
    setNumber(1)
  }
  const action = (notice: Notice) => {
    const destination = noticeDestination(
      notice,
      "demo-customer",
      en ? "en" : "fa",
    )
    const label = noticeActionText[notice.target][ix]
    return destination ? (
      <a
        className="text-link notifications-destination"
        href={destination}
        onClick={(event) => openNotice(notice, event)}
        aria-label={`${label} · ${notice.reference || notice.title[ix]}`}
      >
        {label}
        <Glyph name="arrow" size={16} />
      </a>
    ) : (
      <button
        className="text-link notifications-destination notifications-text-button"
        onClick={(event) => openNotice(notice, event)}
      >
        {label}
        <Glyph name="arrow" size={16} />
      </button>
    )
  }
  return (
    <DashboardPage
      page={page}
      navigate={navigate}
      renderMedia={() => null}
      activeSection="notifications"
      panelTitle={t("اعلان‌های شما", "Your notifications")}
      notificationUnreadCount={unread}
    >
      <div className="notifications-page">
        <nav
          className="notifications-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">{t("اعلان‌ها", "Notifications")}</span>
        </nav>
        <header className="notifications-heading">
          <div>
            <span className="eyebrow">YOUR ACCOUNT · UPDATES</span>
            <h1>{t("اعلان‌های شما", "Your notifications")}</h1>
            <p>
              {t(
                "پیام‌های مرتبط با حساب و سفارش‌های خود را اینجا دنبال کنید.",
                "Follow updates about your account and orders here.",
              )}
            </p>
          </div>
          <a
            className="button secondary"
            href={`${account}/preferences`}
            onClick={follow(`${account}/preferences`)}
          >
            <Glyph name="sliders" size={18} />
            {t("تنظیمات زبان و اعلان‌ها", "Language and notification settings")}
          </a>
        </header>
        <div className="notifications-demo">
          <bdi>Demo</bdi>
          <p>
            {t(
              "اعلان‌ها، زمان‌ها، مجوزها و نتیجه خوانده‌شدن نمونه‌اند؛ سرویس واقعی متصل نیست. هیچ نتیجه مالی از این صفحه تأیید نمی‌شود.",
              "Notifications, times, permissions and read updates are fixtures; no real service is connected. This page confirms no financial result.",
            )}
          </p>
        </div>
        <div
          className="notifications-live"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {live}
        </div>
        {restricted ? (
          <section className="notifications-state dash-card">
            <Glyph name="shield" size={36} />
            <h2>
              {mode === "expired"
                ? t("نشست شما منقضی شده است.", "Your session has expired.")
                : t(
                    "اعلان‌ها در دسترس نیستند.",
                    "Notifications are unavailable.",
                  )}
            </h2>
            <p>
              {t(
                "برای حفظ حریم خصوصی، اطلاعات حساب نمایش داده نمی‌شود.",
                "To protect privacy, no account information is shown.",
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
          </section>
        ) : (
          <>
            <section
              className="notifications-summary"
              aria-label={t("خلاصه اعلان‌ها", "Notification summary")}
            >
              <div className="notifications-summary-icon">
                <Glyph name="bell" size={26} />
              </div>
              <div>
                <strong>
                  {unread === null
                    ? t(
                        "تعداد خوانده‌نشده دریافت نشده است",
                        "Unread count is unavailable",
                      )
                    : `${count(unread)} ${t("اعلان خوانده‌نشده", "unread notifications")}`}
                </strong>
                <p>
                  {t(
                    "بازکردن این فهرست، اعلان‌ها را خودکار خوانده‌شده نمی‌کند.",
                    "Opening this list does not automatically mark notifications as read.",
                  )}
                </p>
              </div>
              <button
                className="notifications-text-button text-link"
                onClick={refresh}
                disabled={!loaded}
              >
                <Glyph name="clock" size={16} />
                {t("تازه‌سازی", "Refresh")}
              </button>
            </section>
            <section
              className="notifications-filters"
              aria-label={t("فیلتر اعلان‌ها", "Notification filters")}
            >
              <fieldset disabled={!loaded}>
                <legend>{t("وضعیت خوانده‌شدن", "Read status")}</legend>
                <div className="notifications-tabs">
                  {(["all", "unread", "read"] as ReadFilter[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={readFilter === value}
                      onClick={() => {
                        setReadFilter(value)
                        setNumber(1)
                        setPinned(null)
                      }}
                    >
                      {value === "all"
                        ? t("همه", "All")
                        : value === "unread"
                          ? t("خوانده‌نشده", "Unread")
                          : t("خوانده‌شده", "Read")}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>
                {t("موضوع", "Topic")}
                <select
                  value={category}
                  disabled={!loaded}
                  onChange={(event) => {
                    setCategory(event.target.value as NoticeCategory | "all")
                    setNumber(1)
                    setPinned(null)
                  }}
                >
                  <option value="all">{t("همه موضوع‌ها", "All topics")}</option>
                  {noticeCategories.map(([value, fa, english]) => (
                    <option value={value} key={value}>
                      {t(fa, english)}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <div className="notifications-list-heading">
              <h2>{t("پیام‌های حساب شما", "Your account updates")}</h2>
              {loaded && (
                <span>
                  {count(matching.length)}{" "}
                  {t("نتیجه · جدیدترین رویداد", "results · Newest event first")}
                </span>
              )}
              {loaded && snapshot!.bulk !== "none" && (
                <button
                  className="notifications-text-button text-link"
                  aria-disabled={!!pending || (snapshot!.bulk === "page" ? pageItems : snapshot!.items).every((n) => n.read)}
                  onClick={(event) => {
                    if (operation.current || (snapshot!.bulk === "page" ? pageItems : snapshot!.items).every((n) => n.read)) return
                    origin.current = event.currentTarget
                    setModal("bulk")
                  }}
                >
                  <Glyph name="check" size={17} />
                  {snapshot!.bulk === "page"
                    ? t("خوانده‌شدن موارد این صفحه", "Mark this page as read")
                    : t("همه را خوانده‌شده کن", "Mark all as read")}
                </button>
              )}
            </div>
            {loaded && snapshot!.bulk !== "none" && (
              <p className="notifications-scope">
                {snapshot!.bulk === "account"
                  ? t(
                      "دامنه «همه»: همه اعلان‌های موجود حساب تا زمان تأیید عملیات، نه فقط این فیلتر یا صفحه.",
                      "“All” means all account notifications existing when you confirm, not only this filter or page.",
                    )
                  : t(
                      "دامنه عملیات: فقط موارد نمایش‌داده‌شده در این صفحه، نه همه حساب.",
                      "Scope: only items displayed on this page, not the entire account.",
                    )}
              </p>
            )}
            {mode === "loading" ? (
              <div
                className="notifications-loading"
                aria-busy="true"
                aria-label={t("در حال دریافت اعلان‌ها", "Loading notifications")}
              >
                {[1, 2, 3].map((n) => (
                  <div className="skeleton" key={n} />
                ))}
              </div>
            ) : mode === "network" ? (
              <section className="notifications-state dash-card" role="alert">
                <Glyph name="bell" size={32} />
                <h2>
                  {t(
                    "دریافت اعلان‌ها ممکن نشد.",
                    "Unable to load notifications.",
                  )}
                </h2>
                <button
                  className="button secondary"
                  onClick={() => preview("normal")}
                >
                  {t("تلاش دوباره · Demo", "Retry · Demo")}
                </button>
              </section>
            ) : (
              <>
                {refreshError && (
                  <div className="notifications-warning" role="alert">
                    <strong>
                      {t(
                        "دریافت تازه کامل نشد.",
                        "Refresh could not be completed.",
                      )}
                    </strong>
                    <p>
                      {t(
                        "داده قبلی حفظ شده؛ آخرین دریافت معتبر نمونه:",
                        "Previous data retained; last valid demo fetch:",
                      )}{" "}
                      <time dateTime={snapshot!.fetchedAt}>
                        {date(snapshot!.fetchedAt)}
                      </time>
                    </p>
                    <button
                      className="text-link notifications-text-button"
                      onClick={refresh}
                    >
                      {t("تلاش دوباره", "Retry")}
                    </button>
                  </div>
                )}
                {incoming && (
                  <div
                    className="notifications-new"
                    role="region"
                    aria-label={t("اعلان تازه", "New notification")}
                  >
                    <Glyph name="bell" size={20} />
                    <div>
                      <strong>
                        {t("اعلان جدید دارید", "You have new notifications")} ·
                        Demo
                      </strong>
                      <p>
                        {t(
                          "تعداد از پاسخ تازه‌سازی نمونه است؛ فهرست قبلی برای حفظ موقعیت مطالعه، تا انتخاب شما باقی می‌ماند.",
                          "Count comes from the demo refresh response; the previous list stays in place until you choose to display updates.",
                        )}
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setSnapshot((previous) =>
                          acceptNoticeSnapshot(
                            previous,
                            incoming,
                            "demo-customer",
                          ),
                        )
                        setIncoming(null)
                        setNumber(1)
                        setPinned(null)
                        setLive(
                          t(
                            "رویدادهای تازه نمونه نمایش داده شدند.",
                            "New demo events are now displayed.",
                          ),
                        )
                      }}
                    >
                      {t("نمایش اعلان تازه", "Show new notifications")}
                    </button>
                  </div>
                )}
                {pending && (
                  <section
                    className="notifications-operation"
                    aria-label={t(
                      "عملیات خوانده‌شدن نمونه",
                      "Demo read operation",
                    )}
                  >
                    <strong>
                      {t(
                        "در انتظار تأیید خوانده‌شدن · Demo",
                        "Awaiting read confirmation · Demo",
                      )}
                    </strong>
                    <p>
                      {t(
                        "وضعیت قبلی تا تأیید حفظ می‌شود. در حالت دستی، پاسخ نمونه را انتخاب کنید.",
                        "Previous status is retained until confirmation. In manual mode, choose a sample response.",
                      )}
                    </p>
                    {mode === "pending" && (
                      <div>
                        <button
                          className="button secondary"
                          onClick={() => finishRead()}
                        >
                          {t("تأیید پاسخ نمونه", "Confirm sample response")}
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => finishRead(true)}
                        >
                          {t("خطای پاسخ نمونه", "Fail sample response")}
                        </button>
                      </div>
                    )}
                  </section>
                )}
                {readError === "bulk" && (
                  <p className="notifications-error" role="alert">
                    {t(
                      "ثبت خوانده‌شدن گروهی ممکن نشد؛ وضعیت قبلی حفظ شده است.",
                      "Bulk read update failed; previous status is preserved.",
                    )}
                  </p>
                )}
                {!items.length ? (
                  <section className="notifications-state dash-card">
                    <Glyph name="bell" size={36} />
                    <h2>
                      {!snapshot!.items.length
                        ? t(
                            "هنوز اعلانی برای حساب شما ثبت نشده است.",
                            "No notifications have been recorded for your account yet.",
                          )
                        : readFilter === "unread" && category === "all"
                          ? t(
                              "اعلان خوانده‌نشده‌ای ندارید.",
                              "You have no unread notifications.",
                            )
                          : t(
                              "اعلانی با این فیلترها پیدا نشد.",
                              "No notifications match these filters.",
                            )}
                    </h2>
                    {snapshot!.items.length > 0 && (
                      <button
                        className="button secondary"
                        onClick={() => {
                          setReadFilter("all")
                          setCategory("all")
                          setNumber(1)
                          setPinned(null)
                        }}
                      >
                        {t("نمایش همه اعلان‌ها", "Show all notifications")}
                      </button>
                    )}
                  </section>
                ) : (
                  <section
                    ref={list}
                    aria-label={t("فهرست اعلان‌ها", "Notification list")}
                  >
                    <ul className="notifications-list">
                      {items.map((notice) => {
                        const categoryInfo = noticeCategories.find(
                          (c) => c[0] === notice.category,
                        )!
                        return (
                          <li
                            key={notice.id}
                            className={`notifications-card ${
                              notice.read ? "read" : "unread"
                            } ${
                              notice.target === "payment"
                                ? "payment-notice"
                                : ""
                            }`}
                            data-notice-id={notice.id}
                          >
                            <span className="notifications-category-icon">
                              <Glyph name={categoryInfo[3]} size={22} />
                            </span>
                            <article>
                              <div className="notifications-card-meta">
                                <span>{categoryInfo[en ? 2 : 1]}</span>
                                <span
                                  className={`notifications-read-label ${
                                    notice.read ? "read" : ""
                                  }`}
                                >
                                  <Glyph
                                    name={notice.read ? "check" : "bell"}
                                    size={13}
                                  />
                                  {notice.read
                                    ? t("خوانده‌شده", "Read")
                                    : t("خوانده‌نشده", "Unread")}
                                </span>
                                {notice.actionable &&
                                  notice.target !== "proposal" && (
                                    <span className="notifications-action-hint">
                                      {t(
                                        "نیازمند بررسی مقصد",
                                        "Review at destination",
                                      )}
                                    </span>
                                  )}
                              </div>
                              <h3>{notice.title[ix]}</h3>
                              <p>{notice.description[ix]}</p>
                              <div className="notifications-card-detail">
                                <time dateTime={notice.at}>
                                  {date(notice.at)}
                                </time>
                                {notice.reference && (
                                  <span>
                                    {notice.target === "ticket"
                                      ? t("تیکت", "Ticket")
                                      : notice.target === "proposal"
                                        ? t("پیشنهاد", "Proposal")
                                        : notice.target === "refund"
                                          ? t("درخواست", "Request")
                                          : t("سفارش", "Order")}{" "}
                                    <bdi>{notice.reference}</bdi>
                                  </span>
                                )}
                              </div>
                              <div className="notifications-card-actions">
                                {action(notice)}
                                <button
                                  type="button"
                                  className="notifications-text-button notifications-mark"
                                  aria-disabled={notice.read || !!pending}
                                  aria-busy={pending?.noticeId === notice.id}
                                  onClick={() => {
                                    if (!notice.read) beginRead(notice)
                                  }}
                                  aria-label={`${
                                    notice.read
                                      ? t("خوانده‌شده", "Read")
                                      : t(
                                          "علامت‌گذاری به‌عنوان خوانده‌شده",
                                          "Mark as read",
                                        )
                                  } · ${notice.title[ix]}`}
                                >
                                  <Glyph name="check" size={16} />
                                  {notice.read
                                    ? t("خوانده‌شده", "Read")
                                    : t(
                                        "علامت‌گذاری به‌عنوان خوانده‌شده",
                                        "Mark as read",
                                      )}
                                </button>
                              </div>
                              {readError === notice.id && (
                                <p className="notifications-error" role="alert">
                                  {t(
                                    "ثبت خوانده‌شدن ممکن نشد؛ وضعیت قبلی حفظ شد.",
                                    "Read update failed; previous status is preserved.",
                                  )}
                                </p>
                              )}
                              {notice.id === pinned &&
                                notice.read &&
                                readFilter === "unread" && (
                                  <p className="notifications-retained">
                                    {t(
                                      "این مورد همین حالا خوانده شد؛ برای حفظ focus در نمایش باقی مانده و با تازه‌سازی یا تغییر فیلتر حذف می‌شود.",
                                      "Just marked read; retained to preserve focus and removed on refresh or filter change.",
                                    )}
                                  </p>
                                )}
                            </article>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}
                {pages > 1 && (
                  <nav
                    className="notifications-pagination"
                    aria-label={t(
                      "صفحه‌بندی اعلان‌ها",
                      "Notification pagination",
                    )}
                  >
                    <span>
                      {t("صفحه", "Page")} {count(current)} / {count(pages)}
                    </span>
                    <div>
                      <button
                        className="button secondary"
                        disabled={current === 1}
                        onClick={() => {
                          setNumber(current - 1)
                          setPinned(null)
                        }}
                      >
                        {t("قبلی", "Previous")}
                      </button>
                      <button
                        className="button secondary"
                        disabled={current >= pages}
                        onClick={() => {
                          setNumber(current + 1)
                          setPinned(null)
                        }}
                      >
                        {t("بعدی", "Next")}
                      </button>
                    </div>
                  </nav>
                )}
                <p className="notifications-fetch-time">
                  {t("آخرین نمایش معتبر نمونه:", "Last valid demo list fetch:")}{" "}
                  <time dateTime={snapshot!.fetchedAt}>
                    {date(snapshot!.fetchedAt)}
                  </time>{" "}
                  · {t("وقت تهران", "Tehran time")}
                </p>
              </>
            )}
            <footer className="notifications-footer">
              <Glyph name="shield" size={20} />
              <div>
                <strong>
                  {t(
                    "اعلان، رویداد گذشته است؛ مقصد، وضعیت جاری را نشان می‌دهد.",
                    "A notification records the past; its destination shows the current status.",
                  )}
                </strong>
                <p>
                  {t(
                    "خواندن اعلان، تأیید پیشنهاد یا طرح، دریافت کالا، پرداخت یا بازپرداخت نیست. تنظیمات دریافت نیز تاریخچه را حذف نمی‌کند.",
                    "Reading does not approve proposals or artwork, confirm delivery, make payments or issue refunds. Delivery settings do not delete notification history.",
                  )}
                </p>
              </div>
            </footer>
          </>
        )}
        <details className="dash-preview notifications-preview">
          <summary>
            {t("حالت‌های پروتوتایپ", "Prototype states")} · USER-17 · Demo
          </summary>
          <div>
            {previews.map(([value, fa, english]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => preview(value)}
              >
                {t(fa, english)}
              </button>
            ))}
          </div>
          <p>
            {t(
              "به‌روزرسانی زنده یا polling فعال نیست. رویداد جدید تنها در پاسخ صریح تازه‌سازیِ حالت Demo دریافت می‌شود.",
              "Live updates and polling are unavailable. A new event is received only in the explicit Demo refresh scenario.",
            )}
          </p>
        </details>
        <dialog
          ref={dialog}
          className="notifications-dialog"
          aria-labelledby="notifications-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            close()
          }}
        >
          <h2 id="notifications-dialog-title">
            {modal === "bulk"
              ? snapshot?.bulk === "page"
                ? t("خوانده‌شدن موارد این صفحه؟", "Mark this page as read?")
                : t(
                    "همه اعلان‌های حساب خوانده شوند؟",
                    "Mark all account notifications as read?",
                  )
              : modal === "order"
                ? t("مقصد مستقل سفارش", "Independent order destination")
                : t(
                    "این مورد در حال حاضر قابل مشاهده نیست.",
                    "This item is currently unavailable to view.",
                  )}
          </h2>
          <p>
            {modal === "bulk"
              ? snapshot?.bulk === "page"
                ? t(
                    "فقط موارد نمایش‌داده‌شده در همین صفحه انتخاب می‌شوند. این عملیات هیچ سفارش یا درخواست مالی را تغییر نمی‌دهد.",
                    "Only items displayed on this page are selected. This operation changes no order or financial request.",
                  )
                : t(
                    "همه اعلان‌های موجود حساب تا لحظه تأیید، حتی خارج از فیلتر جاری. اعلان جدید بعد از تأیید خودکار خوانده‌شده نمی‌شود.",
                    "All account notifications existing at confirmation, including those outside this filter. Notifications arriving afterwards are not automatically marked read.",
                  )
              : modal === "order"
                ? t(
                    "سفارش مرتبط در قرارداد نمونه مجاز است؛ سرویس وضعیت جاری سفارش متصل نیست. صفحه مستقل سفارش در این طراحی تغییر نمی‌کند و نتیجه‌ای از متن اعلان تأیید نمی‌شود.",
                    "The related order is authorized in the demo contract; its current-state service is not connected. The independent order page is unchanged and no result is confirmed from notification text.",
                  )
                : t(
                    "رویداد تاریخی حفظ شده است، اما نسخه فعلی یا دسترسی مقصد تأیید نشد. هیچ پذیرش، تأیید یا نتیجه مالی ثبت نشده است.",
                    "The historical event is preserved, but current version or destination access was not confirmed. No acceptance, approval or financial result was recorded.",
                  )}
          </p>
          {modal === "order" && selected && (
            <code dir="ltr">
              {noticeDestination(selected, "demo-customer", en ? "en" : "fa")}
            </code>
          )}
          <div className="notifications-dialog-actions">
            <button className="button secondary" onClick={close}>
              {modal === "bulk"
                ? t("انصراف", "Cancel")
                : t("بازگشت به اعلان‌ها", "Back to notifications")}
            </button>
            {modal === "bulk" && (
              <button
                className="button primary"
                disabled={!!pending}
                onClick={() => {
                  close()
                  beginRead()
                }}
              >
                {t("تأیید خوانده‌شدن · Demo", "Confirm read update · Demo")}
              </button>
            )}
            {modal === "unavailable" && selected?.target === "proposal" && (
              <a
                className="button secondary"
                href={`${prefix}/commissions`}
                onClick={follow(`${prefix}/commissions`)}
              >
                {t("مسیر نقاشی سفارشی", "Commission guidance")}
              </a>
            )}
          </div>
        </dialog>
      </div>
    </DashboardPage>
  )
}
