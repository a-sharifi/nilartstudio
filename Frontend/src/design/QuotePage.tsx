import SelectDropdown from "../components/ui/SelectDropdown";
import { useEffect, useRef, useState } from "react"
import { referenceErrors, type ReferenceDraft } from "./references"
import { preferenceStyles, type PreferencesDraft } from "./preferences"
import { jobMatches, type AssessmentJob } from "./assessment"
import {
  acceptanceMatches,
  demoQuote,
  payableQuote,
  quoteAmount,
  quoteMatches,
  quoteSize,
  type CommissionQuote,
  type QuoteAcceptance,
  type QuoteStatus,
  type QuoteView,
} from "./quote"
import "./references.css"
import "./quote.css"

const statuses: Record<string, [string, string, string, string]> = {
  empty: [
    "پیشنهاد سفارش هنوز آماده نشده است.",
    "The order proposal is not ready yet.",
    "ارزیابی نسخه ذخیره‌شده را تکمیل کنید؛ مبلغ یا پذیرش فرضی تولید نمی‌شود.",
    "Complete assessment of the saved version; no amount or acceptance is assumed.",
  ],
  pending: [
    "در انتظار بررسی هنرمند",
    "Awaiting artist review",
    "ارزیابی اولیه و مشخصات درخواست در حال بررسی هستند. پس از آماده‌شدن پیشنهاد معتبر، می‌توانید مبلغ و شرایط را تأیید کنید. این وضعیت در Demo فقط نمونه است.",
    "Your initial assessment and request details are being reviewed. You can approve the amount and conditions once a valid proposal is ready. This Demo state is illustrative only.",
  ],
  "needs-info": [
    "برای ادامه بررسی، اطلاعات بیشتری لازم است.",
    "More information is needed to continue the review.",
    "گزارش نمونه Demo: کاربرد نهایی اثر و دامنه تغییرات پس‌زمینه را در توضیحات مشخص کنید.",
    "Demo report: clarify the intended use and the scope of background changes in your brief.",
  ],
  valid: [
    "پیشنهاد آماده بررسی و تأیید شماست",
    "Your proposal is ready for approval",
    "مشخصات، مبلغ و شرایط را مرور کنید. تأیید نقش مجاز در این نمونه شبیه‌سازی شده است؛ سرویس واقعی متصل نیست.",
    "Review specifications, the amount and conditions. Authorized review is simulated in this example; no live service is connected.",
  ],
  updated: [
    "پیشنهاد به‌روزرسانی شد",
    "Proposal updated",
    "Demo · ضریب تأییدشده ۲ و محدوده جزئیات بازبینی شده است. نسخه جدید نیازمند تأیید مجدد شماست.",
    "Demo · the reviewed factor is 2 and the detail scope was revised. The new version requires your approval again.",
  ],
  expired: [
    "اعتبار این پیشنهاد پایان یافته است.",
    "This proposal has expired.",
    "انقضای پیشنهاد در Demo شبیه‌سازی شده است؛ مهلت واقعی یا شمارش معکوس وجود ندارد. تأیید و افزودن مجاز نیست.",
    "Expiry is simulated in Demo; no real deadline or countdown exists. Approval and adding to cart are blocked.",
  ],
  stale: [
    "پیشنهاد برای این نسخه درخواست معتبر نیست",
    "The proposal is not valid for this request version",
    "اطلاعات درخواست تغییر کرده‌اند. ارزیابی و بررسی مجدد لازم است؛ مبلغ پیشین به مشخصات جدید تعمیم داده نمی‌شود.",
    "Request details have changed. Reassessment and review are required; the earlier amount does not apply to the new specifications.",
  ],
  rejected: [
    "این درخواست در حال حاضر قابل پذیرش نیست.",
    "This request cannot currently be accepted.",
    "علت عمومی نمونه Demo: دامنه اجرای درخواستی خارج از قابلیت تعریف‌شده نمونه است. پذیرش پس از اصلاح تضمین نمی‌شود.",
    "Demo public reason: the requested scope is outside the example’s defined capability. Acceptance after editing is not guaranteed.",
  ],
  accepted: [
    "پیشنهاد توسط شما پذیرفته شده است · Demo",
    "You have approved the proposal · Demo",
    "پذیرش ثبت‌شده در حافظه نشست، با پرداخت یا شروع اجرا متفاوت است.",
    "Acceptance stored in session memory is separate from payment or the start of artwork creation.",
  ],
  "pricing-incomplete": [
    "قیمت‌گذاری نیازمند تکمیل است",
    "Pricing needs completion",
    "یک هزینه ضروری هنوز مشخص نیست؛ پیشنهاد قابل پذیرش یا افزودن به سبد نیست.",
    "A required cost is still unknown; the proposal cannot be approved or added to cart.",
  ],
}
export default function QuotePage({
  language,
  signedIn,
  reference,
  preferences,
  job,
  quote,
  acceptance,
  inCart,
  onQuote,
  onApprove,
  onNavigate,
  onDemoSignIn,
  onDemoFixture,
  initialView = "normal",
}: {
  language: 0 | 1
  signedIn: boolean
  reference: ReferenceDraft | null
  preferences: PreferencesDraft | null
  job: AssessmentJob | null
  quote: CommissionQuote | null
  acceptance: QuoteAcceptance | null
  inCart: boolean
  onQuote: (q: CommissionQuote) => void
  onApprove: (
    q: CommissionQuote,
    mode: "normal" | "add-error" | "network",
  ) => Promise<"added" | "add-error" | "unknown" | "invalid">
  onNavigate: (name: string, route: string) => void
  onDemoSignIn: (value: boolean) => void
  onDemoFixture: () => void
  initialView?: QuoteView
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const prefix = `/${language === 0 ? "fa" : "en"}`
  const [view, setView] = useState<QuoteView>(initialView)
  const [consentKey, setConsentKey] = useState("")
  const [result, setResult] = useState("")
  const [url, setUrl] = useState("")
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const checkbox = useRef<HTMLInputElement>(null)
  const generation = useRef(0)
  const authorized = signedIn && !["denied", "expired-session"].includes(view)
  const ownedQuote =
    authorized && quote?.owner === "demo-session" ? quote : null
  const matched = quoteMatches(ownedQuote, job, reference, preferences)
  const assessed =
    authorized &&
    jobMatches(job, reference, preferences) &&
    !!job &&
    ["complete", "review", "insufficient"].includes(job.status)
  const approved = authorized && acceptanceMatches(acceptance, ownedQuote)
  const key = ownedQuote
    ? `${ownedQuote.id}:${ownedQuote.version}:${ownedQuote.termsVersion}:${ownedQuote.requestKey}`
    : ""
  const canApprove =
    authorized &&
    payableQuote(ownedQuote, job, reference, preferences) &&
    view !== "unknown-cost" &&
    view !== "changed" &&
    !["loading", "load-error"].includes(view)
  const state =
    ownedQuote && !matched
      ? "stale"
      : view === "unknown-cost"
        ? "pricing-incomplete"
        : view === "changed"
          ? "updated"
          : ownedQuote?.status || (assessed ? "pending" : "empty")
  const label = approved && canApprove ? "accepted" : state
  const texts = statuses[label]
  const amount = ownedQuote ? quoteAmount(ownedQuote) : undefined
  const money = (n: number) =>
    `${n.toLocaleString(language === 0 ? "fa-IR" : "en-US")} ${t("تومان", "toman")}`
  const edit = (step = "preferences") =>
    onNavigate(
      t("ویرایش درخواست", "Edit request"),
      `${prefix}/commissions/new/${step}`,
    )
  useEffect(() => {
    generation.current++
    setConsentKey("")
    setResult("")
  }, [key, authorized])
  useEffect(
    () => () => {
      generation.current++
    },
    [],
  )
  useEffect(() => {
    if (!authorized || reference?.owner !== "demo-session") {
      setUrl("")
      return
    }
    const file = reference.files.find(
      (f) => f.id === reference.primary && f.status === "accepted" && f.receipt,
    )
    if (!file) {
      setUrl("")
      return
    }
    const objectURL = URL.createObjectURL(file.file)
    setUrl(objectURL)
    return () => URL.revokeObjectURL(objectURL)
  }, [reference, authorized])
  const submit = async () => {
    if (locked.current || !canApprove || !ownedQuote) return
    if (!approved && consentKey !== key) {
      setResult("validation")
      checkbox.current?.focus()
      return
    }
    locked.current = true
    setBusy(true)
    setResult("")
    const epoch = generation.current
    try {
      const outcome = await onApprove(
        ownedQuote,
        view === "add-error"
          ? "add-error"
          : view === "network"
            ? "network"
            : "normal",
      )
      if (epoch === generation.current) setResult(outcome)
    } catch {
      if (epoch === generation.current) setResult("unknown")
    } finally {
      locked.current = false
      setBusy(false)
    }
  }
  const check = () => {
    setView("normal")
    setResult(inCart ? "added" : approved ? "add-error" : "checked")
  }
  const demoState = (status: QuoteStatus) => {
    if (!assessed || !job || !preferences) return
    onQuote(
      demoQuote(job, preferences.execution, status, (quote?.version || 0) + 1),
    )
    setView("normal")
    setResult("")
    setConsentKey("")
  }
  const refValid =
    authorized &&
    reference?.owner === "demo-session" &&
    reference.version > 0 &&
    !Object.keys(referenceErrors(reference)).length
  return (
    <div className="container references-page quote-page">
      <nav className="ref-breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>
        <button onClick={() => onNavigate(t("خانه", "Home"), "/")}>
          {t("خانه", "Home")}
        </button>
        <span>/</span>
        <button
          onClick={() =>
            onNavigate(t("سفارش نقاشی", "Commission"), `${prefix}/commissions`)
          }
        >
          {t("سفارش نقاشی", "Commission")}
        </button>
        <span>/</span>
        <span>{t("پیشنهاد سفارش", "Order proposal")}</span>
      </nav>
      <div className="ref-heading">
        <div>
          <span className="eyebrow">
            PAINT–07 /{" "}
            {t(
              "پیش از خلق اثر، یک توافق روشن",
              "A CLEAR AGREEMENT BEFORE CREATION",
            )}
          </span>
          <h1>{t("پیشنهاد سفارش شما", "Your commission proposal")}</h1>
          <p>
            {t(
              "مشخصات، مبلغ و شرایط درخواست را مرور کنید؛ سپس پیشنهاد معتبر را آگاهانه تأیید کنید.",
              "Review the specifications, amount and conditions, then explicitly approve a valid proposal.",
            )}
          </p>
        </div>
        <span className="ref-step-label">
          {t("مرحله ۴ از ۴", "Step 4 of 4")}
        </span>
      </div>
      <ol className="ref-stepper">
        {[
          t("تصویر و توضیحات", "References and brief"),
          t("سبک و اجرا", "Style and execution"),
          t("ارزیابی", "Assessment"),
          t("پیشنهاد و تأیید", "Proposal and approval"),
        ].map((name, i) => {
          const done = i === 0 ? !!refValid : i < 3 && assessed
          return (
            <li
              key={i}
              aria-current={i === 3 ? "step" : undefined}
              className={done ? "quote-step-done" : ""}
            >
              <span>
                {done
                  ? "✓"
                  : (i + 1).toLocaleString(language === 0 ? "fa" : "en")}
              </span>
              <div>
                {name}
                <small>
                  {done
                    ? t("تکمیل‌شده · Demo", "Complete · Demo")
                    : i === 3
                      ? t("مرحله جاری", "Current step")
                      : t("نیازمند تکمیل", "Incomplete")}
                </small>
              </div>
            </li>
          )
        })}
      </ol>
      <div className="ref-demo-banner">
        <span>DEMO</span>
        <p>
          {t(
            "قیمت، شرایط، تأیید هنرمند و پذیرش فقط نمونه‌اند. افزودن صرفاً به سبد محلی همین نشست است؛ سرویس واقعی متصل نیست و هیچ پرداخت یا اجرایی آغاز نمی‌شود.",
            "Pricing, terms, artist approval and acceptance are illustrative. Adding affects only this session’s local cart; no live service is connected and no payment or creation begins.",
          )}
        </p>
      </div>
      {!authorized ? (
        <section className="quote-status">
          <span className="quote-badge">
            {t("دسترسی خصوصی", "Private access")}
          </span>
          <h2>
            {view === "denied"
              ? t(
                  "اجازه دسترسی به پیشنهاد را ندارید",
                  "You cannot access this proposal",
                )
              : t(
                  "برای مشاهده پیشنهاد وارد شوید",
                  "Sign in to view your proposal",
                )}
          </h2>
          <p>
            {view === "expired-session"
              ? t(
                  "نشست منقضی شده است. تصویر، پیشنهاد و نتیجه خصوصی از صفحه حذف شده‌اند.",
                  "Your session has expired. Private references, the proposal and results have been removed from the page.",
                )
              : t(
                  "داشتن لینک یا شناسه کافی نیست؛ فقط نشست مالک مجاز Demo دسترسی دارد.",
                  "A link or ID is not sufficient; only the authorized Demo owner session has access.",
                )}
          </p>
          {view !== "denied" && (
            <button
              className="button primary"
              onClick={() => {
                onDemoSignIn(true)
                setView("normal")
              }}
            >
              {t(
                "ورود مجدد Demo · بازگشت به همین صفحه",
                "Demo sign-in · return to this page",
              )}
            </button>
          )}
        </section>
      ) : view === "loading" ? (
        <div
          className="quote-loading"
          aria-busy="true"
          aria-label={t("بارگذاری پیشنهاد", "Loading proposal")}
        >
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : view === "load-error" ? (
        <section className="quote-status">
          <h2>
            {t("دریافت پیشنهاد ممکن نشد.", "Unable to load the proposal.")}
          </h2>
          <p>
            {t(
              "درخواست و نسخه ذخیره‌شده حفظ شده‌اند.",
              "Your request and saved version are preserved.",
            )}
          </p>
          <button className="button primary" onClick={() => setView("normal")}>
            {t("تلاش دوباره", "Try again")}
          </button>
        </section>
      ) : (
        <>
          <section
            className={`quote-status quote-status-${label}`}
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <span className="quote-badge">
                {t(texts[0], texts[1])} · Demo
              </span>
              <h2>{t(texts[0], texts[1])}</h2>
              <p>{t(texts[2], texts[3])}</p>
            </div>
            <div className="quote-status-actions">
              {["pending", "empty"].includes(state) && (
                <button className="button secondary" onClick={check}>
                  {t("بررسی دوباره وضعیت", "Check status")}
                </button>
              )}
              {state === "empty" && (
                <button
                  className="button primary"
                  onClick={() => edit("assessment")}
                >
                  {t("بازگشت به ارزیابی", "Back to assessment")}
                </button>
              )}
              {state === "needs-info" && (
                <button
                  className="button primary"
                  onClick={() => edit("references")}
                >
                  {t("تکمیل توضیحات", "Complete your brief")}
                </button>
              )}
              {state === "stale" && (
                <button
                  className="button primary"
                  onClick={() => edit("assessment")}
                >
                  {t("بازگشت برای ارزیابی مجدد", "Return for reassessment")}
                </button>
              )}
              {state === "expired" && (
                <button
                  className="button secondary"
                  onClick={() => demoState("pending")}
                >
                  {t(
                    "درخواست پیشنهاد جدید · Demo",
                    "Request a new proposal · Demo",
                  )}
                </button>
              )}
              {view === "changed" && (
                <button
                  className="button primary"
                  onClick={() => demoState("updated")}
                >
                  {t("دریافت نسخه جدید · Demo", "Load new version · Demo")}
                </button>
              )}
              <button
                className="quote-text-button"
                onClick={() =>
                  onNavigate(
                    t("پرسش درباره درخواست", "Ask about this request"),
                    `${prefix}/contact`,
                  )
                }
              >
                {t("پرسش درباره درخواست", "Ask about this request")}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </section>
          <div className="quote-layout">
            <section className="quote-request quote-card">
              <div className="quote-section-heading">
                <span>01</span>
                <h2>{t("مشخصات درخواست", "Request details")}</h2>
                <button className="quote-text-button" onClick={() => edit()}>
                  {t("ویرایش درخواست", "Edit request")}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
              {refValid && (
                <div className="quote-brief">
                  {url && (
                    <img
                      src={url}
                      alt={t("مرجع اصلی خصوصی", "Private primary reference")}
                    />
                  )}
                  <div>
                    <span className="quote-muted">
                      {reference!.kind === "idea"
                        ? t(
                            "درخواست متنی · بدون تصویر",
                            "Text-based request · no image",
                          )
                        : t("مرجع خصوصی شما", "Your private reference")}
                    </span>
                    <details>
                      <summary>
                        {reference!.brief.slice(0, 100)}
                        {reference!.brief.length > 100 ? "…" : ""}
                      </summary>
                      <p>{reference!.brief}</p>
                    </details>
                  </div>
                </div>
              )}
              <dl className="quote-specs">
                {[
                  [
                    t("نوع اجرا", "Execution"),
                    preferences?.execution === "hand"
                      ? t("اجرای دستی", "Hand-painted artwork")
                      : preferences?.execution === "digital"
                        ? t("اجرای دیجیتال", "Digital artwork")
                        : "—",
                  ],
                  [
                    t("سبک", "Style"),
                    preferenceStyles.find((s) => s.id === preferences?.style)
                      ?.name[language] || "—",
                  ],
                  [
                    t("سایز و واحد", "Size and unit"),
                    preferences ? quoteSize(preferences) : "—",
                  ],
                  [
                    t("گزینه‌های تکمیلی", "Additional options"),
                    t(
                      "گزینه فعالی تعریف نشده · Demo",
                      "No active options defined · Demo",
                    ),
                  ],
                  [
                    t("نوع تحویل", "Delivery"),
                    preferences?.execution === "hand"
                      ? t("اثر فیزیکی", "Physical artwork")
                      : t("فایل دیجیتال", "Digital file"),
                  ],
                  [
                    t("نسخه درخواست فعلی", "Current request version"),
                    `${reference?.version || "—"} / ${preferences?.version || "—"}`,
                  ],
                ].map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>
                      <bdi>{value}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="quote-muted">
                {t(
                  "ویرایش مؤثر، پیشنهاد را نیازمند بازبینی می‌کند. تصاویر منتشر نمی‌شوند و اطلاعات سفارش پرداخت‌شده تغییر نمی‌کند.",
                  "Effective edits require proposal review. Images are not published and paid order records are not changed.",
                )}
              </p>
            </section>
            <section className="quote-review quote-card">
              <div className="quote-section-heading">
                <span>02</span>
                <h2>{t("ارزیابی و نتیجه بررسی", "Assessment and review")}</h2>
              </div>
              <div className="quote-review-panels">
                <div>
                  <span className="quote-kicker">
                    {t("ارزیابی اولیه", "Initial assessment")}
                  </span>
                  <h3>{t("با کمک AI · Demo", "AI-assisted · Demo")}</h3>
                  <strong className="quote-factor">
                    {jobMatches(job, reference, preferences) &&
                    Number.isFinite(job?.factor) &&
                    job!.factor! >= 1 &&
                    job!.factor! <= 3
                      ? job!.factor!.toLocaleString(
                          language === 0 ? "fa" : "en",
                        )
                      : t("نامشخص", "Unavailable")}
                  </strong>
                  <p>
                    {t(
                      "ضریب اولیه نمونه؛ نه تصمیم نهایی هنرمند.",
                      "Illustrative initial factor, not the artist’s final decision.",
                    )}
                  </p>
                </div>
                <div>
                  <span className="quote-kicker">
                    {t("نتیجه بررسی", "Review outcome")}
                  </span>
                  <h3>
                    {ownedQuote?.reviewed && matched
                      ? t("تأیید نقش مجاز · Demo", "Authorized approval · Demo")
                      : t("هنوز تأیید نشده", "Not approved yet")}
                  </h3>
                  <strong className="quote-factor">
                    {ownedQuote?.factor &&
                    matched &&
                    ownedQuote.factor >= 1 &&
                    ownedQuote.factor <= 3
                      ? ownedQuote.factor.toLocaleString(
                          language === 0 ? "fa" : "en",
                        )
                      : "—"}
                  </strong>
                  <p>
                    {ownedQuote?.reviewed && matched
                      ? t(
                          "ضریب تأییدشده ۲ · نمونه Demo؛ با ضریب اولیه، در صورت وجود، در کنار آن مقایسه کنید. علت عمومی: بازبینی دامنه جزئیات درخواستی، نه تشخیص واقعی تصویر.",
                          "Reviewed factor: 2 · Demo example; compare it with the initial factor alongside it, when available. Public reason: review of requested detail scope, not actual image recognition.",
                        )
                      : t(
                          "مبلغ قابل پذیرش فقط پس از بررسی لازم آماده می‌شود.",
                          "An approvable amount is prepared only after required review.",
                        )}
                  </p>
                </div>
              </div>
              <p className="quote-muted">
                {t(
                  "مقیاس نمونه ۱ تا ۳، از پیچیدگی کمتر تا بیشتر؛ ضریب نمره کیفیت، ارزش هنری یا قضاوت درباره افراد نیست. مشتری امکان تغییر ضریب یا قیمت را ندارد.",
                  "Example scale: 1–3, lower to higher complexity. This is not a quality score, artistic value or judgment about people. Customers cannot edit the factor or price.",
                )}
              </p>
            </section>
            <section
              className="quote-terms quote-card"
              id="commission-conditions"
            >
              <div className="quote-section-heading">
                <span>03</span>
                <h2>
                  {t("شرایط اجرا و تحویل", "Creation and delivery conditions")}
                </h2>
              </div>
              {ownedQuote?.reviewed && matched ? (
                <>
                  <p className="quote-terms-intro">
                    {t(
                      "شرایط همان پیشنهاد · Demo. این موارد تعهد واقعی نیل‌آرت نیستند.",
                      "Conditions for this proposal · Demo. These are not actual NilArt commitments.",
                    )}
                  </p>
                  <dl className="quote-terms-list">
                    {[
                      [
                        t("خروجی توافق‌شده", "Agreed output"),
                        preferences?.execution === "digital"
                          ? t(
                              `فایل نهایی PNG با ابعاد ${quoteSize(preferences!)}؛ فایل لایه‌باز یا چاپ شامل نیست.`,
                              `Final PNG at ${quoteSize(preferences!)}; source file and print not included.`,
                            )
                          : t(
                              `اثر فیزیکی ${quoteSize(preferences!)}؛ تکنیک اکریلیک روی بوم در این نمونه Demo، بدون قاب.`,
                              `Physical artwork at ${quoteSize(preferences!)}; Demo acrylic on canvas, without a frame.`,
                            ),
                      ],
                      [
                        t("آماده‌سازی · تخمینی", "Preparation · Estimated"),
                        t(
                          "Demo: ۱۰ تا ۱۴ روز کاری پس از پرداخت تأییدشده و تکمیل اطلاعات؛ زمان حمل جداست.",
                          "Demo: 10–14 working days after confirmed payment and complete information; transit time is separate.",
                        ),
                      ],
                      [
                        t(
                          "نسخه اولیه و اصلاحات",
                          "Initial version and revisions",
                        ),
                        t(
                          "Demo: نمایش نسخه اولیه برای بازبینی؛ ۲ نوبت اصلاح جزئی رنگ و جزئیات در محدوده توافق. تغییر سوژه، سبک یا سایز شامل نیست.",
                          "Demo: an initial version for review; 2 rounds of minor colour and detail revisions within the agreed scope. Subject, style or size changes are not included.",
                        ),
                      ],
                      [
                        t("تغییر درخواست", "Request changes"),
                        t(
                          "تغییر مؤثر نیازمند پیشنهاد و تأیید جدید است؛ مبلغ یا زمان خودکار معتبر نمی‌ماند.",
                          "Effective changes require a new proposal and approval; the amount or schedule does not automatically remain valid.",
                        ),
                      ],
                      [
                        t(
                          "روش تحویل و اقلام همراه",
                          "Delivery and included items",
                        ),
                        preferences?.execution === "digital"
                          ? t(
                              "Demo: تحویل فایل نهایی در مسیر خصوصی سفارش؛ ارسال فیزیکی ندارد.",
                              "Demo: final file through a private order channel; no physical shipping.",
                            )
                          : t(
                              "Demo: ارسال اثر پس از انتخاب روش و آدرس در checkout؛ بسته‌بندی استاندارد در مبلغ اجرای نمونه لحاظ شده، قاب و هدیه شامل نیست.",
                              "Demo: artwork shipping after address and method selection at checkout; standard packaging is included in the sample execution fee, framing and gifts are not included.",
                            ),
                      ],
                      [
                        t("حقوق استفاده", "Usage rights"),
                        t(
                          "Demo: استفاده شخصی؛ حق تکثیر تجاری یا انتشار تصویر مرجع واگذار نمی‌شود. مالکیت فیزیکی با حقوق تکثیر یکسان نیست.",
                          "Demo: personal use; commercial reproduction rights and permission to publish the reference are not granted. Physical ownership is not reproduction rights.",
                        ),
                      ],
                    ].map(([title, text]) => (
                      <div key={title}>
                        <dt>{title}</dt>
                        <dd>{text}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="quote-terms-version">
                    {t("نسخه شرایط", "Conditions version")}{" "}
                    {ownedQuote.termsVersion.toLocaleString(
                      language === 0 ? "fa" : "en",
                    )}{" "}
                    · Demo
                  </p>
                </>
              ) : (
                <p className="quote-muted">
                  {t(
                    "شرایط معتبر سفارش هنوز آماده نیستند. زمان، اصلاحات، خروجی و حقوق استفاده تا تهیه پیشنهاد وعده داده نمی‌شوند.",
                    "Valid order conditions are not ready. Schedule, revisions, output and usage rights are not promised before proposal preparation.",
                  )}
                </p>
              )}
            </section>
            <section className="quote-price quote-card">
              <div className="quote-section-heading">
                <span>04</span>
                <h2>{t("جزئیات مبلغ", "Price details")}</h2>
                <span className="quote-demo">Demo</span>
              </div>
              {amount && matched && ownedQuote ? (
                <>
                  <p className="quote-price-version">
                    {t("پیشنهاد", "Proposal")} #
                    {ownedQuote.version.toLocaleString(
                      language === 0 ? "fa" : "en",
                    )}{" "}
                    · {t("تومان، در هر دو زبان", "Toman, in both languages")}
                  </p>
                  {ownedQuote.status === "updated" &&
                    ownedQuote.previousAmount && (
                      <p className="quote-warning">
                        {t("مبلغ قبلی نمونه", "Previous sample amount")}:{" "}
                        <s>{money(ownedQuote.previousAmount)}</s>
                        <br />
                        {t(
                          "ضریب و شرایط بازبینی شده‌اند؛ تأیید مجدد لازم است.",
                          "The factor and conditions were revised; approval is required again.",
                        )}
                      </p>
                    )}
                  <dl className="quote-money-lines">
                    <div>
                      <dt>{t("قیمت پایه سایز", "Size base price")}</dt>
                      <dd>{money(ownedQuote.base)}</dd>
                    </div>
                    <div>
                      <dt>
                        {t("ضریب سختی تأییدشده", "Reviewed complexity factor")}
                      </dt>
                      <dd>
                        <bdi>
                          ×{" "}
                          {ownedQuote.factor!.toLocaleString(
                            language === 0 ? "fa" : "en",
                          )}
                        </bdi>
                      </dd>
                    </div>
                    <div className="quote-adjusted">
                      <dt>
                        {t(
                          "مبلغ پایه پس از اعمال سختی",
                          "Complexity-adjusted base",
                        )}
                      </dt>
                      <dd>{money(amount.adjusted)}</dd>
                    </div>
                    <div>
                      <dt>{t("هزینه نوع اجرا", "Execution fee")}</dt>
                      <dd>{money(ownedQuote.executionFee)}</dd>
                    </div>
                  </dl>
                  <p className="quote-muted">
                    {t(
                      "Demo: گزینه اضافه، تخفیف یا مالیات تعریف نشده است. جمع فقط پایه تعدیل‌شده + هزینه اجراست؛ قیمت پایه دوباره جمع نمی‌شود.",
                      "Demo: no extra options, discount or tax are defined. The total is the adjusted base plus the execution fee; the base is not counted twice.",
                    )}
                  </p>
                  <div className="quote-total">
                    <span>
                      {view === "unknown-cost"
                        ? t(
                            "جمع مبالغ مشخص؛ نه پیشنهاد کامل",
                            "Known-cost subtotal; not a complete proposal",
                          )
                        : t("مبلغ پیشنهادی", "Proposed amount")}
                    </span>
                    <strong>{money(amount.total)}</strong>
                    <small>
                      {canApprove
                        ? t(
                            "قابل تأیید در پروتوتایپ Demo",
                            "Approvable in the Demo prototype",
                          )
                        : t(
                            "در این وضعیت قابل تأیید نیست",
                            "Not approvable in this state",
                          )}
                    </small>
                  </div>
                  <p className="quote-shipping">
                    {preferences?.execution === "hand"
                      ? t(
                          "هزینه ارسال پس از انتخاب آدرس و روش ارسال مشخص می‌شود؛ مبلغ بالا شامل ارسال نیست.",
                          "Shipping is calculated after you select your address and delivery method; the amount above excludes shipping.",
                        )
                      : t(
                          "تحویل دیجیتال · ارسال فیزیکی جزو این سفارش نیست.",
                          "Digital delivery · physical shipping is not part of this order.",
                        )}
                  </p>
                </>
              ) : (
                <div className="quote-price-empty">
                  <span>—</span>
                  <p>
                    {t(
                      "مبلغ قابل تأیید هنوز در دسترس نیست؛ برآورد یا ضریب پیش‌فرض ساخته نمی‌شود.",
                      "An approvable amount is not available yet; no estimate or default factor is invented.",
                    )}
                  </p>
                </div>
              )}
              {view === "unknown-cost" && (
                <p className="quote-warning" role="alert">
                  {t(
                    "یک هزینه ضروری پیشنهاد در این حالت Demo نامشخص است؛ صفر یا رایگان فرض نشده و افزودن مسدود است.",
                    "A required proposal cost is unknown in this Demo state; it is not treated as zero or free, and adding is blocked.",
                  )}
                </p>
              )}
            </section>
            <section className="quote-consent quote-card">
              <div className="quote-section-heading">
                <span>05</span>
                <h2>{t("تأیید شما", "Your approval")}</h2>
              </div>
              {canApprove ? (
                <>
                  <p className="quote-muted">
                    {t(
                      `پذیرش مربوط به نسخه ${ownedQuote!.version} پیشنهاد و نسخه ${ownedQuote!.termsVersion} شرایط است.`,
                      `Acceptance applies to proposal version ${ownedQuote!.version} and conditions version ${ownedQuote!.termsVersion}.`,
                    )}
                  </p>
                  {!approved && (
                    <label className="quote-checkbox">
                      <input
                        ref={checkbox}
                        type="checkbox"
                        checked={consentKey === key}
                        disabled={busy || result === "unknown"}
                        aria-invalid={result === "validation"}
                        aria-describedby="quote-consent-error"
                        onChange={(e) =>
                          setConsentKey(e.target.checked ? key : "")
                        }
                      />
                      <span>
                        {t(
                          "مشخصات، مبلغ پیشنهادی و شرایط این سفارش را بررسی کرده‌ام و تأیید می‌کنم.",
                          "I have reviewed and approve this order’s specifications, proposed amount and conditions.",
                        )}
                      </span>
                    </label>
                  )}
                  <p className="quote-approval-note">
                    {t(
                      "این پذیرش، رضایت انتشار تصویر، عضویت بازاریابی، تأیید نسخه نهایی اثر یا پرداخت موفق نیست.",
                      "This approval is not permission to publish an image, marketing consent, approval of the final artwork or successful payment.",
                    )}
                  </p>
                  {result === "validation" && (
                    <p
                      id="quote-consent-error"
                      className="ref-field-error"
                      role="alert"
                    >
                      {t(
                        "ابتدا مشخصات و شرایط را بررسی و تأیید کنید.",
                        "Review and approve the specifications and conditions first.",
                      )}
                    </p>
                  )}
                  <div
                    role="status"
                    aria-live="polite"
                    className="quote-operation-state"
                  >
                    {result === "unknown"
                      ? t(
                          "نتیجه اقدام مشخص نیست؛ پیش از تلاش دوباره، وضعیت پذیرش و سبد را بررسی کنید.",
                          "The action outcome is unknown; check acceptance and cart status before retrying.",
                        )
                      : result === "add-error" || (approved && !inCart)
                        ? t(
                            "پیشنهاد تأیید شده است، اما افزودن به سبد تکمیل نشد. · Demo",
                            "The proposal is approved, but adding it to the cart was not completed. · Demo",
                          )
                        : inCart
                          ? t(
                              "این سفارش در سبد شماست. پیشنهاد پذیرفته و به سبد محلی اضافه شده است · Demo.",
                              "This commission is already in your cart. The proposal was approved and added to the local cart · Demo.",
                            )
                          : result === "invalid"
                            ? t(
                                "نسخه یا دسترسی معتبر نیست؛ پیشنهاد را دوباره بررسی کنید.",
                                "The version or access is invalid; review the proposal again.",
                              )
                            : result === "checked"
                              ? t(
                                  "وضعیت محلی بررسی شد؛ تغییری ایجاد نشد.",
                                  "Local status checked; no changes were made.",
                                )
                              : ""}
                  </div>
                  {result === "unknown" ? (
                    <button className="button primary" onClick={check}>
                      {t(
                        "بررسی وضعیت پذیرش و سبد",
                        "Check acceptance and cart status",
                      )}
                    </button>
                  ) : inCart ? (
                    <button
                      className="button primary"
                      onClick={() => onNavigate(t("سبد خرید", "Cart"), "/cart")}
                    >
                      {t("ادامه به سبد", "Continue to cart")}
                    </button>
                  ) : (
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={() => void submit()}
                    >
                      {busy
                        ? t(
                            "در حال بررسی و ثبت Demo…",
                            "Checking and recording Demo…",
                          )
                        : approved
                          ? t(
                              "تلاش مجدد افزودن به سبد · Demo",
                              "Retry adding to cart · Demo",
                            )
                          : t(
                              "تأیید پیشنهاد و افزودن به سبد",
                              "Approve proposal and add to cart",
                            )}
                    </button>
                  )}
                </>
              ) : (
                <p className="quote-muted">
                  {t(
                    "تأیید و افزودن به سبد فقط برای پیشنهاد معتبر، بررسی‌شده و متعلق به همین نسخه درخواست مجاز است.",
                    "Approval and adding to cart are available only for a valid, reviewed proposal for this request version.",
                  )}
                </p>
              )}
              <div className="quote-policy-links">
                <a href="#commission-conditions">
                  {t("شرایط سفارش", "Order conditions")}
                </a>
                <button
                  onClick={() =>
                    onNavigate(
                      t("لغو و مرجوعی", "Cancellation and returns"),
                      `${prefix}/returns`,
                    )
                  }
                >
                  {t("لغو و مرجوعی", "Cancellation and returns")}
                </button>
              </div>
              <p className="quote-muted">
                {t(
                  "سبد، پرداخت و شروع اجرا مراحل جدا هستند. ذخیره این Demo فقط در حافظه نشست است و با بارگذاری مجدد از بین می‌رود.",
                  "Cart, payment and creation are separate steps. This Demo is stored only in session memory and is lost on reload.",
                )}
              </p>
            </section>
          </div>
        </>
      )}
      <details className="references-demo-controls quote-controls">
        <summary>
          {t("کنترل حالت‌های نمایشی · Demo", "Prototype state controls · Demo")}
        </summary>
        <p>
          {t(
            "برای مشاهده پیشنهاد نمونه، مراحل قبل را تکمیل کنید یا نمونه متنی را با اقدام صریح بارگیری کنید. هیچ تأیید هنرمندی خودکار انجام نمی‌شود.",
            "Complete previous steps or explicitly load the text sample. No artist approval happens automatically.",
          )}
        </p>
        <div>
          <label>
            <input
              type="checkbox"
              checked={signedIn}
              disabled={busy}
              onChange={(e) => onDemoSignIn(e.target.checked)}
            />
            {t("نشست مجاز Demo", "Authorized Demo session")}
          </label>
          <button
            className="button secondary"
            disabled={!authorized || busy}
            onClick={() => {
              if (
                window.confirm(
                  t(
                    "پیش‌نویس و پیشنهاد نمونه جایگزین داده فعلی شوند؟ اقلام دیگر سبد حفظ می‌شوند.",
                    "Replace the current draft and proposal with sample data? Other cart items will be preserved.",
                  ),
                )
              ) {
                onDemoFixture()
                setView("normal")
              }
            }}
          >
            {t("بارگیری پیشنهاد متنی Demo", "Load text-only Demo proposal")}
          </button>
        </div>
        <div>
          <label>
            {t("حالت پیشنهاد", "Proposal state")}
            <SelectDropdown
              value={ownedQuote?.status || ""}
              disabled={!assessed || busy}
              onChange={(e) => demoState(e.target.value as QuoteStatus)}
            >
              <option value="" disabled>
                {t("انتخاب حالت", "Select state")}
              </option>
              {[
                "pending",
                "needs-info",
                "valid",
                "updated",
                "expired",
                "rejected",
              ].map((status) => (
                <option value={status} key={status}>
                  {t(statuses[status][0], statuses[status][1])}
                </option>
              ))}
            </SelectDropdown>
          </label>
          <label>
            {t("حالت نمایش / عملیات", "View / operation state")}
            <SelectDropdown
              value={view}
              disabled={busy}
              onChange={(e) => {
                setView(e.target.value as QuoteView)
                setResult("")
                setConsentKey("")
              }}
            >
              {[
                ["normal", "عادی", "Normal"],
                ["loading", "بارگذاری", "Loading"],
                ["load-error", "خطای دریافت", "Load error"],
                ["denied", "عدم دسترسی", "Permission denied"],
                ["expired-session", "نشست منقضی", "Session expired"],
                [
                  "add-error",
                  "شکست افزودن پس از پذیرش",
                  "Add failure after acceptance",
                ],
                ["network", "نتیجه تأیید نامشخص", "Unknown approval outcome"],
                [
                  "changed",
                  "تغییر پیشنهاد حین مشاهده",
                  "Proposal changed while viewing",
                ],
                ["unknown-cost", "هزینه ضروری نامشخص", "Unknown required cost"],
              ].map(([value, fa, en]) => (
                <option value={value} key={value}>
                  {t(fa, en)}
                </option>
              ))}
            </SelectDropdown>
          </label>
        </div>
        {view === "changed" && (
          <button
            className="button secondary"
            onClick={() => demoState("updated")}
          >
            {t("دریافت نسخه جدید · Demo", "Load new version · Demo")}
          </button>
        )}
      </details>
    </div>
  )
}
