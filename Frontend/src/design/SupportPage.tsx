import type {supportApi} from "../features/customer/api"
import {sessionLifecycle} from "../features/identity/session-lifecycle"
import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import type { ReferenceNavigationGuard } from "./ReferencesPage"
import { topics, supportOrders, supportTickets, supportPolicy, blankSupportDraft, validateSupport, acceptedSupportFile, type Ticket, type SupportDraft } from "./support"
import "./support.css"
import { handoffDemoTicket } from "./support-conversation"

type FileEntry = { id: string; file: File; state: "selected" | "uploading" | "checking" | "accepted" | "failed" }
const modes = [
  ["normal", "عادی", "Normal"], ["empty", "بدون تیکت", "Empty"], ["loading", "بارگذاری", "Loading"], ["network", "خطای فهرست", "List error"],
  ["no-files", "بدون پیوست", "Attachments off"], ["upload-error", "خطای فایل", "File error"], ["active", "درخواست فعال", "Active request"],
  ["submit-error", "خطای ثبت", "Submit error"], ["unknown", "نتیجه نامشخص", "Unknown result"], ["limited", "محدودیت", "Rate limited"],
  ["denied", "عدم مجوز", "Permission denied"], ["expired", "نشست منقضی", "Session expired"],
]
export default function SupportPage({ page, search = "", navigate, registerGuard, liveApi }: { liveApi?: typeof supportApi; page: string; search?: string; navigate: (route: string) => void; registerGuard: (guard: ReferenceNavigationGuard | null) => void }) {
  const en = page.startsWith("/en/"), ix = en ? 1 : 0, t = (fa: string, english: string) => en ? english : fa
  const prefix = en ? "/en" : "/fa", account = `${prefix}/account`
  const [mode, setMode] = useState(liveApi?"loading":"normal"), [query, setQuery] = useState(""), [filter, setFilter] = useState("all"), [position, setPosition] = useState(1)
  const [tickets, setTickets] = useState<Ticket[]>(liveApi?[]:supportTickets)
  const [draft, setDraft] = useState<SupportDraft>(blankSupportDraft), [files, setFiles] = useState<FileEntry[]>([]), [errors, setErrors] = useState<Record<string, string>>({})
  const [open, setOpen] = useState(() => new URLSearchParams(search).get("new") === "1"), [state, setState] = useState("idle"), [result, setResult] = useState<Ticket | null>(null), [notice, setNotice] = useState("")
  const [modal, setModal] = useState<"leave" | "destination" | null>(null), [destination, setDestination] = useState("")
  const form = useRef<HTMLFormElement>(null), dialog = useRef<HTMLDialogElement>(null), origin = useRef<HTMLElement | null>(null), pending = useRef<(() => void) | null>(null)
  const dirty = useRef(false), lock = useRef(false), timers = useRef(new Set<ReturnType<typeof setTimeout>>()), operation = useRef("")
  const [liveOwner,setLiveOwner]=useState("")
  const liveGeneration=useRef(0)
  const loadLive=async()=>{if(!liveApi)return;const stamp=++liveGeneration.current;setMode("loading");try{const result=await liveApi.load();if(stamp!==liveGeneration.current)return;setLiveOwner(result.owner);setTickets(result.tickets);setMode("normal")}catch{if(stamp===liveGeneration.current)setMode("network")}}
  useEffect(()=>{if(!liveApi)return;void loadLive();const clear=sessionLifecycle.registerPrivateCache(()=>{liveGeneration.current++;setTickets([]);setLiveOwner("");setDraft(blankSupportDraft());setFiles([]);setResult(null);setMode("denied");pending.current=null;setModal(null);dirty.current=false});return()=>{liveGeneration.current++;clear()}},[liveApi])
  const sendLive=async()=>{if(!liveApi)return;lock.current=true;operation.current ||= crypto.randomUUID();setState("sending");const stamp=liveGeneration.current;try{const ticket=await liveApi.submit(draft,operation.current,liveOwner);if(stamp!==liveGeneration.current)return;setResult(ticket);setTickets(previous=>[ticket,...previous.filter(item=>item.id!==ticket.id)]);setDraft(blankSupportDraft());setOpen(false);dirty.current=false;operation.current="";setState("success")}catch{if(stamp!==liveGeneration.current)return;setState("unknown");setNotice(t("ثبت تأیید نشد؛ متن حفظ شده است. پیش از تکرار، تیکت‌های ثبت‌شده را بررسی کنید.","Submission unconfirmed; text retained. Check submitted tickets before retrying."))}finally{lock.current=false}}
  const restricted = mode === "denied" || mode === "expired", blocked = state === "sending" || state === "unknown"
  dirty.current = !restricted && (Object.values(draft).some(Boolean) || files.length > 0 || blocked)
  const later = (fn: () => void, ms = 650) => { const id = setTimeout(() => { timers.current.delete(id); fn() }, ms); timers.current.add(id) }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    registerGuard(proceed => {
      if (!dirty.current) { proceed(); return true }
      if (lock.current && state === "sending") return false
      pending.current = proceed; origin.current = document.activeElement as HTMLElement; setModal("leave"); return false
    })
    return () => registerGuard(null)
  }, [registerGuard, state])
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = "" } }
    window.addEventListener("beforeunload", unload)
    return () => window.removeEventListener("beforeunload", unload)
  }, [])
  useEffect(() => {
    if (modal) { dialog.current?.showModal(); requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>("button")?.focus()) }
    else if (dialog.current?.open) dialog.current.close()
  }, [modal])
  const close = () => { setModal(null); pending.current = null; requestAnimationFrame(() => origin.current?.focus()) }
  const guard = (proceed: () => void) => {
    if (state === "sending") return
    if (dirty.current) { pending.current = proceed; origin.current = document.activeElement as HTMLElement; setModal("leave") } else proceed()
  }
  const route = (target: string) => {
    if (!liveApi && target === `${account}/orders`) { setDestination(target); setModal("destination") }
    else navigate(target)
  }
  const follow = (target: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
    e.preventDefault(); origin.current = e.currentTarget; guard(() => route(target))
  }
  const showForm = () => { setOpen(true); setResult(null); requestAnimationFrame(() => { form.current?.scrollIntoView({ behavior: "smooth", block: "start" }); form.current?.querySelector<HTMLElement>("select")?.focus() }) }
  const update = (key: keyof SupportDraft, value: string) => { setDraft(d => ({ ...d, [key]: value, ...(key === "order" ? { item: "" } : {}) })); setErrors(e => ({ ...e, [key]: "" })); setNotice("") }
  const upload = (id: string) => {
    setFiles(f => f.map(x => x.id === id ? { ...x, state: "uploading" } : x))
    later(() => { setFiles(f => f.map(x => x.id === id ? { ...x, state: "checking" } : x)); later(() => setFiles(f => f.map(x => x.id === id ? { ...x, state: mode === "upload-error" ? "failed" : "accepted" } : x))) })
  }
  const errorText = (key: string) => ({
    topic: t("موضوع را انتخاب کنید.", "Choose a topic."),
    order: t("یک سفارش مجاز از همین حساب انتخاب کنید.", "Choose an authorized order from this account."),
    item: t("قلم معتبر سفارش را انتخاب کنید.", "Choose a valid order item."),
    subject: t("عنوان پیام را وارد کنید.", "Enter a subject."),
    description: t("مسئله را توضیح دهید.", "Describe the issue."),
    files: t("فایل انتخاب‌شده قابل قبول نیست؛ فایل ناموفق را حذف یا دوباره بررسی کنید.", "The selected file is not accepted; remove or retry failed files."),
  }[key])
  const complete = () => {
    const ticket: Ticket = { id: `SP-DEMO-${operation.current.slice(0, 8)}`, owner: "demo-customer", title: [draft.subject.trim(), draft.subject.trim()], topic: draft.topic, order: draft.order, status: "submitted", updated: new Date().toISOString(), unread: 0 }
    handoffDemoTicket(ticket, draft.description.trim())
    setResult(ticket); setTickets(list => list.some(x => x.id === ticket.id) ? list : [ticket, ...list]); setDraft(blankSupportDraft()); setFiles([]); dirty.current = false; lock.current = false; operation.current = ""; setState("success"); setOpen(false); setPosition(1)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (lock.current || restricted) return
    const validation = validateSupport(draft, "demo-customer")
    if (files.some(f => f.state !== "accepted")) validation.files = "files"
    setErrors(validation)
    if (Object.keys(validation).length) { requestAnimationFrame(() => document.getElementById(`support-${Object.keys(validation)[0]}`)?.focus()); return }
    if(liveApi){void sendLive();return}
    lock.current = true; operation.current ||= crypto.randomUUID(); setState("sending"); setNotice("")
    later(() => {
      if (mode === "unknown") { setState("unknown"); return }
      if (mode === "submit-error" || mode === "limited") { lock.current = false; setState("error"); setNotice(mode === "limited" ? t("ثبت فعلاً محدود شده است. زمان مجاز تلاش بعدی از سرویس دریافت نشده؛ بعداً دوباره بررسی کنید.", "Submission is currently limited. No retry time was supplied; check again later.") : t("ثبت تأیید نشد؛ متن و انتخاب‌های شما حفظ شدند.", "Submission failed; your text and choices are preserved.")); return }
      complete()
    })
  }
  const preview = (value: string) => guard(() => {
    timers.current.forEach(clearTimeout); timers.current.clear(); setMode(value); setState("idle"); lock.current = false; operation.current = ""; setNotice(""); setErrors({}); setResult(null)
    if (value === "denied" || value === "expired") { setDraft(blankSupportDraft()); setFiles([]); setTickets([]); setOpen(false) }
    else setTickets(value === "empty" ? [] : supportTickets)
  })
  const statusLabel = (value: string) => ({ submitted: t("ثبت‌شده", "Submitted"), review: t("در حال بررسی", "Under review"), waiting: t("منتظر پاسخ شما", "Awaiting your reply"), answered: t("پاسخ داده‌شده", "Answered"), closed: t("بسته‌شده", "Closed") }[value])
  const date = (value: string) => new Intl.DateTimeFormat(en ? "en-GB" : "fa-IR", { dateStyle: "medium" }).format(new Date(value))
  const matches = tickets.filter(x => x.owner === (liveApi?liveOwner:"demo-customer") && (filter === "all" || x.status === filter) && `${x.id} ${x.title[ix]}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => b.updated.localeCompare(a.updated))
  const pages = Math.ceil(matches.length / 3), selectedOrder = supportOrders.find(o => o.id === draft.order)
  const link = (label: string, target: string, icon = "arrow") => <a href={target} onClick={follow(target)}><Glyph name={icon} /><span>{label}</span><Glyph name="arrow" size={16} /></a>
  const fieldError = (key: string) => errors[key] ? <p id={`support-error-${key}`} className="checkout-field-error" role="alert">{errorText(key)}</p> : null
  return <DashboardPage liveMode={!!liveApi} page={page} navigate={navigate} renderMedia={() => null} activeSection="support" panelTitle={t("پشتیبانی شما", "Your support")} onBeforeNavigate={(target) => guard(() => route(target))}>
    <div className="support-page">
      <nav className="support-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}><a href={account} onClick={follow(account)}>{t("حساب", "Account")}</a><span>/</span><span aria-current="page">{t("پشتیبانی", "Support")}</span></nav>
      <header className="support-heading"><div><span className="eyebrow">NILART · CUSTOMER CARE</span><h1>{t("پشتیبانی شما", "Your support")}</h1><p>{t("درخواست‌های قبلی را دنبال کنید یا موضوع جدیدی مطرح کنید.", "Follow existing requests or submit a new question.")}</p></div><button className="button primary" onClick={showForm} disabled={restricted}><span aria-hidden="true">+</span>{t("ثبت تیکت جدید", "Create a new ticket")}</button></header>
      {!liveApi && <div className="support-demo"><bdi>Demo</bdi><p>{t("پنل خصوصی نمونه · سفارش‌ها، پاسخ‌های جدید و قواعد نمونه‌اند. سرویس واقعی متصل نیست؛ هیچ تیکت یا فایل واقعی ارسال نمی‌شود.", "Private account demo · Orders, unread replies and rules are fixtures. No real service is connected; no actual ticket or file is sent.")}</p></div>}
      {restricted ? <section className="support-empty dash-card"><Glyph name="shield" size={32}/><h2>{mode === "expired" ? t("نشست شما منقضی شده است.", "Your session has expired.") : t("دسترسی مجاز نیست.", "Access denied.")}</h2><p>{t("داده‌های خصوصی نمونه از این صفحه حذف شدند.", "Private demo data has been cleared from this page.")}</p>{mode === "expired" && <a className="button primary" href={`${prefix}/auth/session-expired`} onClick={follow(`${prefix}/auth/session-expired`)}>{t("ورود دوباره", "Sign in again")} · AUTH-09</a>}</section> : <>
      <section className="support-shortcuts" aria-label={t("میان‌برهای کمک", "Help shortcuts")}>
        {link(t("پیگیری سفارش", "Track an order"), `${prefix}/track-order`, "box")}
        {link(t("درخواست لغو یا مرجوعی", "Cancellation or return request"), `${account}/orders`, "bag")}
        {link(t("مشکل دریافت فایل", "Download help"), `${account}/downloads`, "download")}
        {link(t("سؤالات متداول", "Frequently asked questions"), "/faq", "book")}
      </section>
      <section className="support-list" aria-labelledby="support-list-title">
        <div className="support-section-heading"><h2 id="support-list-title">{t("درخواست‌های شما", "Your requests")}</h2><span>{!["loading", "network"].includes(mode) && `${matches.length} ${liveApi?t("تیکت","tickets"):t("تیکت · Demo", "tickets · Demo")}`}</span></div>
        <div className="support-toolbar"><label>{t("عنوان یا شماره تیکت", "Ticket title or number")}<input value={query} type="search" onChange={e => { setQuery(e.target.value); setPosition(1) }} placeholder={t("جست‌وجو در تیکت‌های شما…", "Search your tickets…")}/></label><label>{t("وضعیت", "Status")}<SelectDropdown value={filter} onChange={e => { setFilter(e.target.value); setPosition(1) }}><option value="all">{t("همه", "All")}</option><option value="waiting">{t("نیازمند پاسخ شما", "Awaiting your reply")}</option><option value="review">{t("در حال بررسی", "Under review")}</option><option value="closed">{t("بسته‌شده", "Closed")}</option></SelectDropdown></label><span className="support-sort"><Glyph name="clock" size={16}/>{t("آخرین به‌روزرسانی", "Last updated")}</span></div>
        {mode === "loading" ? <div aria-busy="true" aria-label={t("در حال دریافت تیکت‌ها", "Loading tickets")} className="support-skeletons">{[1,2,3].map(n => <div key={n} className="skeleton"/>)}</div> : mode === "network" ? <div className="support-empty dash-card" role="alert"><h2>{t("دریافت فهرست ناموفق بود.", "Could not load your tickets.")}</h2><p>{liveApi?t("اطلاعات دریافت نشد؛ دوباره تلاش کنید.","Information was not loaded; try again."):t("فرم مستقل نمونه همچنان قابل استفاده است.", "The independent demo form is still available.")}</p><button className="button secondary" onClick={() => liveApi?void loadLive():setMode("normal")}>{liveApi?t("تلاش دوباره","Retry"):t("تلاش دوباره · Demo", "Retry · Demo")}</button></div> : !matches.length ? <div className="support-empty dash-card"><Glyph name="chat" size={36}/><h2>{tickets.length ? t("تیکتی با این انتخاب‌ها پیدا نشد.", "No tickets match your selection.") : t("هنوز تیکتی ثبت نکرده‌اید.", "You haven’t submitted a ticket yet.")}</h2><button className="button secondary" onClick={() => tickets.length ? (setQuery(""), setFilter("all")) : showForm()}>{tickets.length ? t("پاک‌کردن فیلترها", "Clear filters") : t("ثبت تیکت جدید", "Create a new ticket")}</button></div> : <div className="dash-card">{matches.slice((position - 1)*3, position*3).map(ticket => <article className="support-ticket" key={ticket.id}><div className="support-ticket-icon"><Glyph name="chat" size={24}/></div><div className="support-ticket-info"><div className="support-ticket-meta"><bdi>{ticket.id}</bdi><span>·</span><span>{topics.find(x => x[0] === ticket.topic)?.[en ? 2 : 1]}</span>{ticket.unread > 0 && <strong className="support-unread">{ticket.unread} {t("پاسخ جدید · Demo", "new reply · Demo")}</strong>}</div><h3>{ticket.title[ix]}</h3><p>{ticket.order ? <>{t("سفارش", "Order")} <bdi>{ticket.order}</bdi> · </> : t("پرسش عمومی · ", "General question · ")}<time dateTime={ticket.updated}>{date(ticket.updated)}</time></p></div><div className="support-ticket-action"><span className={`support-status ${ticket.status}`}>{statusLabel(ticket.status)}</span><a className="text-link" href={`${account}/support/${ticket.id}`} onClick={follow(`${account}/support/${ticket.id}`)} aria-label={`${t("مشاهده گفتگو", "View conversation")} ${ticket.id}`}>{t("مشاهده گفتگو", "View conversation")}<Glyph name="arrow" size={16}/></a></div></article>)}</div>}
        {pages > 1 && !["loading", "network"].includes(mode) && <nav className="support-pagination" aria-label={t("صفحه‌بندی تیکت‌ها", "Ticket pagination")}><button className="button secondary" disabled={position === 1} onClick={() => setPosition(p => p-1)}>{t("قبلی", "Previous")}</button><span>{position} / {pages}</span><button className="button secondary" disabled={position >= pages} onClick={() => setPosition(p => p+1)}>{t("بعدی", "Next")}</button></nav>}
        <p className="support-caption">{t("وضعیت تیکت مستقل از سفارش است. بسته‌شدن تیکت، تأیید رضایت یا تکمیل بازپرداخت نیست.", "Ticket status is independent of your order. Closed does not mean satisfaction or a completed refund.")}</p>
      </section>
      {result && <section className="support-success dash-card" role="status"><Glyph name="check" size={28}/><h2>{liveApi?t("تیکت شما ثبت شد","Your ticket has been submitted"):t("تیکت شما ثبت شد · Demo", "Your ticket has been submitted · Demo")}</h2>{!liveApi && <p>{t("فقط نتیجه محلی شبیه‌سازی‌شده؛ ثبت واقعی انجام نشده است.", "Local simulation only; no real submission occurred.")}</p>}<p><bdi>{result.id}</bdi> · {date(result.updated)} · {statusLabel(result.status)}</p><a className="button primary" href={`${account}/support/${result.id}`} onClick={follow(`${account}/support/${result.id}`)}>{t("مشاهده گفتگو", "View conversation")}</a></section>}
      {open ? <div className="support-form-layout"><form ref={form} className="support-form dash-card" onSubmit={submit} noValidate aria-busy={state === "sending"}>
        <div className="support-section-heading"><div><span className="eyebrow">A NEW CONVERSATION</span><h2>{t("تیکت جدید", "New ticket")}</h2></div><Glyph name="chat" size={28}/></div>
        <p className="support-caption">{t("برای سؤال عمومی، انتخاب سفارش لازم نیست.", "An order is not required for a general question.")}</p>
        <fieldset disabled={blocked} className="support-fields">
        <label htmlFor="support-topic">{t("موضوع", "Topic")} *</label><SelectDropdown id="support-topic" value={draft.topic} onChange={e => update("topic", e.target.value)} aria-invalid={!!errors.topic} aria-describedby={errors.topic ? "support-error-topic" : undefined}><option value="">{t("موضوع را انتخاب کنید", "Choose a topic")}</option>{topics.filter(x=>!liveApi || !x[3]).map(x => <option value={x[0]} key={x[0]}>{x[en ? 2 : 1]}</option>)}</SelectDropdown>{fieldError("topic")}
        <label htmlFor="support-order">{t("سفارش مرتبط", "Related order")} {topics.find(x => x[0] === draft.topic)?.[3] ? "*" : t("(اختیاری)", "(optional)")}</label><SelectDropdown id="support-order" value={draft.order} onChange={e => update("order", e.target.value)} aria-invalid={!!errors.order} aria-describedby={errors.order ? "support-error-order" : undefined}><option value="">{t("بدون سفارش مرتبط", "No related order")}</option>{supportOrders.filter(o => !liveApi && o.owner === "demo-customer").map(o => <option key={o.id} value={o.id}>{o.id} · Demo</option>)}</SelectDropdown>{fieldError("order")}
        <small>{t("فقط سفارش‌های مجاز همین حساب نمونه. سفارش را پیدا نمی‌کنید؟ موضوع «سایر» را انتخاب کنید و مسئله را توضیح دهید.", "Only authorized demo account orders. Cannot find an order? Choose “Other” and describe the issue.")}</small>
        {selectedOrder && <><label htmlFor="support-item">{t("قلم مرتبط (اختیاری) · اطلاعات تاریخی Demo", "Related item (optional) · Demo historical data")}</label><SelectDropdown id="support-item" value={draft.item} onChange={e => update("item", e.target.value)} aria-invalid={!!errors.item}><option value="">{t("کل سفارش", "Entire order")}</option>{selectedOrder.items.map(i => <option key={i[0]} value={i[0]}>{i[en ? 2 : 1]}</option>)}</SelectDropdown>{fieldError("item")}</>}
        {mode === "active" && draft.topic === "digital" && draft.order === "NA-23976" && <div className="support-guidance"><strong>{t("برای این موضوع درخواست فعالی دارید. · Demo", "You have an active request for this issue. · Demo")}</strong><a className="text-link" href={`${account}/support/SP-208`} onClick={follow(`${account}/support/SP-208`)}>{t("ادامه گفتگوی قبلی", "Continue the existing conversation")}</a><p>{t("موضوع واقعاً جدید را همچنان می‌توانید ثبت کنید.", "You can still submit a genuinely new issue.")}</p></div>}
        <label htmlFor="support-subject">{t("عنوان", "Subject")} *</label><input id="support-subject" value={draft.subject} maxLength={supportPolicy.subjectMax} onChange={e => update("subject", e.target.value)} aria-invalid={!!errors.subject} aria-describedby={`support-subject-limit${errors.subject ? " support-error-subject" : ""}`}/><small id="support-subject-limit">{draft.subject.length} / {supportPolicy.subjectMax} · Demo</small>{fieldError("subject")}
        <label htmlFor="support-description">{t("شرح مسئله", "Describe the issue")} *</label><textarea id="support-description" value={draft.description} maxLength={supportPolicy.descriptionMax} rows={6} onChange={e => update("description", e.target.value)} aria-invalid={!!errors.description} aria-describedby={`support-description-help${errors.description ? " support-error-description" : ""}`}/>{fieldError("description")}<small id="support-description-help">{t("موضوع و نتیجه موردانتظار را روشن توضیح دهید. رمز، کد تأیید یا اطلاعات کامل بانکی ارسال نکنید.", "Explain the issue and the outcome you need. Do not send passwords, verification codes or full banking details.")}<br/>{draft.description.length} / {supportPolicy.descriptionMax} · Demo</small>
        {mode !== "no-files" ? <><label htmlFor="support-files">{t("فایل‌های مرتبط", "Supporting files")}</label><small id="support-file-rules">{t("قواعد Demo: JPEG، PNG یا PDF؛ حداکثر ۳ فایل، هر فایل ۵ مگابایت. فقط شبیه‌سازی در حافظه؛ آپلود واقعی و لینک عمومی ایجاد نمی‌شود.", "Demo rules: JPEG, PNG or PDF; up to 3 files, 5 MB each. In-memory simulation only; no real upload or public link.")}</small><input id="support-files" type="file" multiple accept=".jpg,.jpeg,.png,.pdf" aria-describedby="support-file-rules" onChange={e => {
          const incoming = Array.from(e.target.files || [])
          if (incoming.length + files.length > supportPolicy.fileCount || incoming.some(f => !acceptedSupportFile(f))) setErrors(x => ({ ...x, files: "files" }))
          else { setFiles(x => [...x, ...incoming.map(file => ({ id: crypto.randomUUID(), file, state: "selected" as const }))]); setErrors(x => ({ ...x, files: "" })) }
          e.target.value = ""
        }}/>{fieldError("files")}<div className="support-files" aria-live="polite">{files.map(f => <div key={f.id}><div><bdi>{f.file.name}</bdi><small>{({ selected: t("انتخاب‌شده؛ هنوز ارسال نشده", "Selected; not sent"), uploading: t("شبیه‌سازی آپلود", "Simulating upload"), checking: t("شبیه‌سازی بررسی فایل", "Simulating file check"), accepted: t("پذیرفته‌شده · Demo", "Accepted · Demo"), failed: t("ناموفق · Demo", "Failed · Demo") })[f.state]}</small></div>{["selected", "failed"].includes(f.state) && <button type="button" className="button secondary" onClick={() => acceptedSupportFile(f.file) && upload(f.id)}>{f.state === "failed" ? t("تلاش مجدد", "Retry") : t("بررسی نمونه", "Demo check")}</button>}<button type="button" className="icon-button" aria-label={`${t("حذف", "Remove")} ${f.file.name}`} onClick={() => setFiles(x => x.filter(y => y.id !== f.id))}><Glyph name="close"/></button></div>)}</div></> : <p className="support-guidance">{t("پیوست فعال نیست. مسئله را بدون مدارک حساس ثبت کنید؛ برای ارسال مدرک، مسیر خصوصی معتبر را از پشتیبانی درخواست کنید.", "Attachments are unavailable. Submit without sensitive evidence and ask support for a verified private delivery method.")}</p>}
        </fieldset>
        {state === "unknown" && <div className="support-guidance" role="status"><strong>{t("نتیجه ثبت تیکت هنوز تأیید نشده است.", "Ticket submission has not been confirmed yet.")}</strong><p>{t("ارسال مجدد مسدود است؛ عملیات قبلی بررسی می‌شود.", "Resubmission is blocked; check the existing operation.")}</p><button type="button" className="button secondary" onClick={() => {if(liveApi){const stamp=liveGeneration.current;void liveApi.load().then(response=>{if(stamp!==liveGeneration.current)return;const ticket=response.tickets.find(item=>item.id===operation.current);setTickets(response.tickets);if(ticket){setResult(ticket);setDraft(blankSupportDraft());setOpen(false);dirty.current=false;operation.current="";setState("success")}else{setState("error");setNotice(t("تیکت این درخواست هنوز ثبت نشده است؛ ارسال با همان شناسه انجام می‌شود.","This request is not recorded yet; retry uses the same identifier."))}}).catch(()=>setNotice(t("بررسی نتیجه ممکن نشد.","Unable to check the result.")))}else setNotice(t("سرویس متصل نیست؛ نتیجه عملیات تأیید نشد و تیکت دوم ساخته نشد.", "No service is connected; the operation remains unconfirmed and no second ticket was created."))}}>{t("بررسی وضعیت عملیات", "Check operation status")}</button>{!liveApi && <button type="button" className="text-link" onClick={complete}>{t("نمایش پاسخ موفق همین عملیات · Demo", "Simulate success for this operation · Demo")}</button>}</div>}
        {notice && <p role="alert" className="checkout-field-error">{notice}</p>}
        <div className="support-form-actions"><button type="submit" className="button primary" disabled={blocked}>{state === "sending" ? t("در حال ثبت تیکت…", "Submitting ticket…") : liveApi?t("ثبت تیکت","Submit ticket"):t("ثبت تیکت · Demo", "Submit ticket · Demo")}</button><button type="button" className="button secondary" disabled={blocked} onClick={() => guard(() => { setDraft(blankSupportDraft()); setFiles([]); setOpen(false) })}>{t("انصراف", "Cancel")}</button></div>
        <p className="support-caption">{t("ثبت تیکت به معنی پذیرش لغو، بازپرداخت یا تغییر سفارش نیست.", "Submitting a ticket does not approve a cancellation, refund or order change.")}</p>
      </form><aside className="support-aside"><Glyph name="paint" size={32}/><h2>{t("مسیر درست، پیگیری روشن", "The right path, a clear follow-up")}</h2><p>{t("برای فرایندهای سفارش از مسیر اختصاصی استفاده کنید. اگر مسئله حل نشده، همین‌جا پیام بگذارید.", "Use dedicated order workflows. If your issue is unresolved, you can still leave a message here.")}</p>{draft.order ? <>{link(t("درخواست لغو", "Cancellation request"), `${account}/orders/${draft.order}/cancel`)}{link(t("درخواست مرجوعی", "Return request"), `${account}/orders/${draft.order}/return`)}</> : link(t("انتخاب سفارش برای لغو یا مرجوعی", "Choose an order for cancellation or return"), `${account}/orders`)}{link(t("اصلاح طرح · USER-09", "Artwork revisions · USER-09"), `${account}/orders/NA-24018/artwork-review`, "paint")}{link(t("راهنمای دانلود", "Download help"), `${account}/downloads`, "download")}<div className="support-private"><Glyph name="shield"/><p>{t("پشتیبانی هرگز رمز یا کد تأیید شما را درخواست نمی‌کند. تصویر کارت بانکی ارسال نکنید.", "Support never asks for your password or verification code. Do not send a bank card image.")}</p></div></aside></div> : !result && <section className="support-invitation"><Glyph name="chat" size={30}/><div><h2>{t("موضوع دیگری در ذهن دارید؟", "Something else on your mind?")}</h2><p>{t("درخواست تازه شما، شروع یک گفتگوی روشن است.", "A new request is the start of a clear conversation.")}</p></div><button className="button secondary" onClick={showForm}>{t("ثبت تیکت جدید", "Create a new ticket")}</button></section>}
      </>}
      {!liveApi && <details className="dash-preview"><summary>{t("حالت‌های پروتوتایپ", "Prototype states")} · Demo</summary><div>{modes.map(([value, fa, english]) => <button key={value} aria-pressed={mode === value} onClick={() => preview(value)}>{t(fa, english)}</button>)}</div><p>{t("در حالت درخواست فعال: موضوع فایل دیجیتال و سفارش NA-23976 را انتخاب کنید. فایل‌ها خصوصی در حافظه همین صفحه می‌مانند.", "For the active-request fixture, select Digital file and NA-23976. Files stay in this page’s memory only.")}</p></details>}
      <dialog ref={dialog} className="support-dialog" aria-labelledby="support-dialog-title" onCancel={e => { e.preventDefault(); close() }}><h2 id="support-dialog-title">{modal === "leave" ? t("پیام هنوز ثبت نشده است.", "Your message has not been submitted.") : t("مقصد مستقل", "Independent destination")}</h2><p>{modal === "leave" ? t("با خروج، متن و فایل‌های محلی این فرم حذف می‌شوند.", "Leaving discards the text and local files in this form.") : t("این صفحه در محدوده USER-15 نیست؛ گفتگو USER-16 در درخواست بعدی طراحی می‌شود.", "This destination is outside USER-15; conversation USER-16 will be designed separately.")}</p>{modal === "destination" && <code dir="ltr">{destination}</code>}<div className="support-form-actions"><button className="button secondary" onClick={close}>{modal === "leave" ? t("ماندن", "Stay") : t("بازگشت", "Back")}</button>{modal === "leave" && <button className="button primary" onClick={() => { const action = pending.current; pending.current = null; setDraft(blankSupportDraft()); setFiles([]); setOpen(false); dirty.current = false; setModal(null); action?.() }}>{t("خروج بدون ثبت", "Leave without submitting")}</button>}</div></dialog>
    </div>
  </DashboardPage>
}
