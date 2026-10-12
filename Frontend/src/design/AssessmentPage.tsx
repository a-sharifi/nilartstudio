import { useEffect, useState } from "react"
import { referenceErrors, type ReferenceDraft } from "./references"
import {
  normalizeDimension,
  preferenceSizes,
  preferenceStyles,
  type PreferencesDraft,
} from "./preferences"
import {
  assessmentPrerequisites,
  canContinueAssessment,
  createDemoJob,
  demoJobStatus,
  jobMatches,
  type AssessmentJob,
  type AssessmentStatus,
  type AssessmentView,
} from "./assessment"
import "./references.css"
import "./assessment.css"

const stateText: Record<string, [string, string, string, string]> = {
  ready: [
    "آماده ارزیابی درخواست",
    "Ready to assess your request",
    "اطلاعات ذخیره‌شده آماده بررسی‌اند. ارزیابی Demo را با اقدام زیر آغاز کنید.",
    "Your saved information is ready. Start the Demo assessment using the action below.",
  ],
  queued: [
    "در انتظار شروع ارزیابی",
    "Waiting for assessment",
    "در پروتوتایپ Demo، ثبت درخواست شبیه‌سازی شده و وضعیت صف نمایش داده می‌شود؛ ثبت واقعی تأیید نشده است.",
    "In this Demo prototype, submission is simulated and a queued state is shown; no real submission is confirmed.",
  ],
  processing: [
    "ارزیابی در حال انجام است",
    "Assessment in progress",
    "نمایش نمونه بررسی تصویر و مشخصات ثبت‌شده؛ هیچ تصویر یا متنی به سرویس AI ارسال نمی‌شود.",
    "A sample view of reference and preference assessment; no image or text is sent to an AI service.",
  ],
  complete: [
    "ارزیابی اولیه آماده است",
    "Initial assessment is ready",
    "نتیجه Demo زیر به همین نسخه درخواست مربوط است و ممکن است به بررسی هنرمند نیاز داشته باشد.",
    "The Demo result below is bound to this request version and may require artist review.",
  ],
  review: [
    "این درخواست به بررسی هنرمند نیاز دارد",
    "This request needs artist review",
    "برای آماده‌کردن پیشنهاد معتبر، نتیجه اولیه و اطلاعات سفارش باید توسط هنرمند بررسی شوند.",
    "An artist needs to review the initial assessment and order details before a valid proposal can be prepared.",
  ],
  insufficient: [
    "برای این درخواست، ارزیابی خودکار کافی نیست.",
    "Automated assessment is not sufficient for this request.",
    "ضریب قابل اتکا در این حالت Demo وجود ندارد؛ این وضعیت به معنی سختی کم نیست.",
    "This Demo state has no reliable complexity factor; this does not mean low complexity.",
  ],
  "needs-details": [
    "برای بررسی دقیق‌تر، اطلاعات بیشتری لازم است.",
    "More information is needed for a clearer assessment.",
    "گزارش نمونه Demo: کاربرد موردنظر اثر را در توضیحات روشن کنید. این پیام از تحلیل واقعی درخواست شما به دست نیامده است.",
    "Demo report: clarify the intended use in your brief. This message is not derived from an actual analysis of your request.",
  ],
  failed: [
    "ارزیابی خودکار تکمیل نشد.",
    "Automated assessment could not be completed.",
    "شکست پردازش در Demo شبیه‌سازی شده است. فایل‌های معتبر و انتخاب‌ها حفظ شده‌اند؛ نیازی به آپلود مجدد نیست.",
    "A processing failure is simulated in Demo. Accepted files and choices remain intact; re-uploading is not required.",
  ],
  network: [
    "ارتباط برای دریافت وضعیت قطع شده است",
    "The status connection was interrupted",
    "ممکن است ارزیابی همچنان ادامه داشته باشد. قطع اتصال به معنی شکست پردازش نیست؛ بررسی وضعیت، تحلیل جدیدی ایجاد نمی‌کند.",
    "Assessment may still be running. A lost connection is not a processing failure; checking status does not create another assessment.",
  ],
  unknown: [
    "نتیجه ارزیابی هنوز مشخص نشده است.",
    "The assessment result is not available yet.",
    "این وضعیت به معنی شکست نیست. فقط وضعیت کار موجود را دوباره بررسی کنید؛ پردازش مجدد خودکار انجام نمی‌شود.",
    "This is not a failure. Check the existing job status again; processing is not automatically restarted.",
  ],
  limited: [
    "تلاش مجدد در حال حاضر مجاز نیست",
    "Retry is currently unavailable",
    "محدودیت نمونه Demo؛ زمان مجاز از سرویس دریافت نشده و شمارنده یا تعداد تلاش فرضی نمایش داده نمی‌شود.",
    "Demo restriction; no permitted retry time has been received, so no countdown or invented attempt limit is shown.",
  ],
  stale: [
    "این نتیجه به نسخه قبلی درخواست مربوط است",
    "This result belongs to an earlier request version",
    "اطلاعات تغییر کرده‌اند. نتیجه و پیشنهاد قبلی برای این نسخه معتبر نیستند؛ سفارش پرداخت‌شده یا اطلاعات تاریخی بازنویسی نمی‌شوند.",
    "Details have changed. The previous result and proposal are not valid for this version; paid orders and historical data are not overwritten.",
  ],
  empty: [
    "اطلاعات لازم برای ارزیابی کامل نیست.",
    "The required assessment information is incomplete.",
    "تصویر و توضیحات، ترجیحات و نسخه ذخیره‌شده مرتبط را در مراحل قبلی بررسی کنید.",
    "Check references, the brief, preferences and their corresponding saved version in the previous steps.",
  ],
}
function StatusIcon({ kind }: { kind: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {kind === "complete" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m7 12 3 3 7-7" />
        </>
      ) : ["queued", "processing", "ready"].includes(kind) ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v6l4 2" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6m0 3v1" />
        </>
      )}
    </svg>
  )
}
export default function AssessmentPage({
  language,
  signedIn,
  reference,
  preferences,
  job,
  onJob,
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
  onJob: (job: AssessmentJob | null) => void
  onNavigate: (name: string, route: string) => void
  onDemoSignIn: (value: boolean) => void
  onDemoFixture: () => void
  initialView?: AssessmentView
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const prefix = `/${language === 0 ? "fa" : "en"}`
  const [view, setView] = useState<AssessmentView>(initialView)
  const [url, setUrl] = useState("")
  const [message, setMessage] = useState("")
  const authorized = signedIn && view !== "expired" && view !== "denied"
  const ownedJob = authorized && job?.owner === "demo-session" ? job : null
  const valid = authorized && assessmentPrerequisites(reference, preferences)
  const stale = !!ownedJob && !jobMatches(ownedJob, reference, preferences)
  const state =
    view === "empty"
      ? "empty"
      : stale || view === "stale"
        ? "stale"
        : !valid
          ? "empty"
          : ["network", "unknown", "limited"].includes(view)
            ? view
            : ownedJob?.status || "ready"
  const texts = stateText[state]
  const canContinue =
    authorized &&
    view === "normal" &&
    canContinueAssessment(ownedJob, reference, preferences)
  const validReferences =
    authorized &&
    reference?.owner === "demo-session" &&
    reference.version > 0 &&
    !Object.keys(referenceErrors(reference)).length
  const edit = (step: "references" | "preferences") =>
    onNavigate(
      t("ویرایش اطلاعات", "Edit details"),
      `${prefix}/commissions/new/${step}`,
    )
  useEffect(() => {
    if (!authorized || !reference || reference.owner !== "demo-session") {
      setUrl("")
      return
    }
    const primary = reference.files.find(
      (f) => f.id === reference.primary && f.status === "accepted" && f.receipt,
    )
    if (!primary) {
      setUrl("")
      return
    }
    const objectURL = URL.createObjectURL(primary.file)
    setUrl(objectURL)
    return () => URL.revokeObjectURL(objectURL)
  }, [authorized, reference])
  const start = () => {
    if (!valid || !reference || !preferences || view === "limited") return
    // No automatic submission on mount, reconnect or language change.
    if (ownedJob && !stale && ownedJob.status !== "failed") return
    onJob(createDemoJob(reference, preferences))
    setView("normal")
    setMessage("")
  }
  const checkStatus = () => {
    if (!ownedJob || stale) return
    onJob({ ...ownedJob, checkedAt: Date.now() })
    setView("normal")
    setMessage(
      t(
        "وضعیت موجود Demo دوباره خوانده شد؛ کار جدیدی ایجاد نشد.",
        "The existing Demo status was read again; no new job was created.",
      ),
    )
  }
  const setDemoStatus = (status: AssessmentStatus) => {
    if (!valid || !reference || !preferences) return
    const current =
      ownedJob && !stale ? ownedJob : createDemoJob(reference, preferences)
    onJob(demoJobStatus(current, status))
    setView("normal")
    setMessage("")
  }
  const continueProposal = () => {
    if (!canContinue) return
    const review = ownedJob?.status !== "complete"
    onNavigate(
      review
        ? t("وضعیت بررسی هنرمند · Demo", "Artist review status · Demo")
        : t("پیشنهاد سفارش · Demo", "Order proposal · Demo"),
      `${prefix}/commissions/new/quote`,
    )
  }
  const size = preferenceSizes.find((s) => s.id === preferences?.size)
  const sizeLabel =
    preferences?.size === "custom"
      ? `${normalizeDimension(preferences.width)} × ${normalizeDimension(preferences.height)} ${t("سانتی‌متر", "cm")}`
      : size
        ? `${size.width} × ${size.height} ${
            size.unit === "cm" ? t("سانتی‌متر", "cm") : t("پیکسل", "px")
          }`
        : t("ثبت نشده", "Not saved")
  return (
    <div className="container references-page assessment-page">
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
        <span>{t("ارزیابی", "Assessment")}</span>
      </nav>
      <div className="ref-heading">
        <div>
          <span className="eyebrow">
            PAINT–06 /{" "}
            {t(
              "از ایده تا یک پیشنهاد روشن",
              "FROM AN IDEA TO A CLEAR PROPOSAL",
            )}
          </span>
          <h1>{t("ارزیابی درخواست شما", "Assessing your request")}</h1>
          <p>
            {t(
              "اطلاعات ثبت‌شده برای بررسی سختی و آماده‌سازی پیشنهاد سفارش ارزیابی می‌شوند.",
              "Your submitted information is assessed for complexity and preparation of the order proposal.",
            )}
          </p>
        </div>
        <span className="ref-step-label">
          {t("مرحله ۳ از ۴", "Step 3 of 4")}
        </span>
      </div>
      <ol className="ref-stepper">
        {[
          t("تصویر و توضیحات", "References and brief"),
          t("سبک و اجرا", "Style and execution"),
          t("ارزیابی", "Assessment"),
          t("پیشنهاد و تأیید", "Proposal and approval"),
        ].map((name, i) => {
          const done = i === 0 ? !!validReferences : i === 1 && valid
          return (
            <li
              key={i}
              aria-current={i === 2 ? "step" : undefined}
              className={done ? "assessment-step-done" : ""}
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
                    ? t("ذخیره معتبر · Demo", "Valid save · Demo")
                    : i === 2
                      ? t("مرحله جاری", "Current step")
                      : i === 3
                        ? t("در انتظار", "Upcoming")
                        : t("نیازمند تکمیل", "Completion required")}
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
            "سرویس AI متصل نیست. ثبت، وضعیت، ضریب و دلایل این صفحه فقط نمونه‌اند؛ تحلیل تصویر، خلق نقاشی یا پذیرش سفارش انجام نمی‌شود.",
            "No AI service is connected. Submission, status, factors and reasons are examples only; no image analysis, painting creation or order acceptance takes place.",
          )}
        </p>
      </div>
      {!authorized ? (
        <section className="assessment-status assessment-access">
          <div className="assessment-symbol">
            <StatusIcon kind="denied" />
          </div>
          <h2>
            {view === "denied"
              ? t(
                  "اجازه دسترسی به این درخواست را ندارید",
                  "You cannot access this request",
                )
              : view === "expired"
                ? t("نشست شما منقضی شده است", "Your session has expired")
                : t(
                    "برای مشاهده درخواست وارد شوید",
                    "Sign in to view your request",
                  )}
          </h2>
          <p>
            {t(
              "تصویر، توضیحات و نتیجه خصوصی از صفحه حذف شده‌اند. شناسه درخواست به‌تنهایی مجوز دسترسی نیست.",
              "Private references, the brief and results are removed from the page. A request ID alone does not grant access.",
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
                "ورود مجدد Demo · بازگشت به همین مرحله",
                "Demo sign-in · return to this step",
              )}
            </button>
          )}
        </section>
      ) : view === "loading" ? (
        <div
          className="assessment-loading"
          aria-busy="true"
          aria-label={t("بارگذاری درخواست ذخیره‌شده", "Loading saved request")}
        >
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : (
        <div className="assessment-layout">
          <div className="assessment-main">
            <section
              className={`assessment-status assessment-${state}`}
              aria-labelledby="assessment-status-title"
            >
              <div className="assessment-status-top">
                <span className="assessment-label">
                  {t("وضعیت درخواست", "REQUEST STATUS")}
                </span>
                <span className="assessment-demo-pill">Demo</span>
              </div>
              <div className="assessment-symbol">
                <StatusIcon kind={state} />
              </div>
              <div aria-live="polite" aria-atomic="true">
                <h2 id="assessment-status-title">{t(texts[0], texts[1])}</h2>
                <p>{t(texts[2], texts[3])}</p>
              </div>
              {state === "processing" && (
                <div className="assessment-processing">
                  {view === "progress" ? (
                    <>
                      <label htmlFor="assessment-progress">
                        {t(
                          "نمونه Demo پاسخ دارای پیشرفت: ۴۲٪",
                          "Demo example of a response with progress: 42%",
                        )}
                      </label>
                      <progress id="assessment-progress" value={42} max={100} />
                      <small>
                        {t(
                          "عدد نمونه است، نه پیشرفت واقعی. در محصول فقط مقدار گزارش‌شده سرویس نمایش داده می‌شود.",
                          "Illustrative value, not actual progress. Production must display only service-reported progress.",
                        )}
                      </small>
                    </>
                  ) : (
                    <>
                      <span className="ref-spinner" aria-hidden="true" />
                      <span>
                        {t(
                          "در حال بررسی · پیشرفت نامعین، Demo",
                          "Reviewing · indeterminate progress, Demo",
                        )}
                      </span>
                    </>
                  )}
                </div>
              )}
              {ownedJob && (
                <div className="assessment-version">
                  <span>
                    {t(
                      "نسخه مربوط به این ارزیابی",
                      "Version associated with this assessment",
                    )}
                  </span>
                  <bdi>
                    {t("مرجع", "References")}{" "}
                    {ownedJob.referenceVersion.toLocaleString(
                      language === 0 ? "fa" : "en",
                    )}{" "}
                    / {t("ترجیحات", "Preferences")}{" "}
                    {ownedJob.preferenceVersion.toLocaleString(
                      language === 0 ? "fa" : "en",
                    )}
                  </bdi>
                </div>
              )}
              {ownedJob && (
                <p className="assessment-last-check">
                  {t(
                    "آخرین خواندن وضعیت محلی Demo:",
                    "Last local Demo status read:",
                  )}{" "}
                  <bdi>
                    {new Date(ownedJob.checkedAt).toLocaleTimeString(
                      language === 0 ? "fa-IR" : "en-US",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </bdi>
                </p>
              )}
              <div className="assessment-cta">
                {state === "ready" && (
                  <button className="button primary" onClick={start}>
                    {t("شروع ارزیابی · Demo", "Start assessment · Demo")}
                  </button>
                )}
                {state === "empty" && (
                  <button
                    className="button primary"
                    onClick={() => edit("preferences")}
                  >
                    {t(
                      "بازگشت برای تکمیل اطلاعات",
                      "Return to complete details",
                    )}
                  </button>
                )}
                {state === "stale" && (
                  <>
                    <button
                      className="button primary"
                      disabled={!valid}
                      onClick={() => {
                        if (reference && preferences && valid) {
                          onJob(createDemoJob(reference, preferences))
                          setView("normal")
                        }
                      }}
                    >
                      {t(
                        "ارزیابی نسخه جدید · Demo",
                        "Assess new version · Demo",
                      )}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => edit("preferences")}
                    >
                      {t("بررسی اطلاعات", "Review details")}
                    </button>
                  </>
                )}
                {["network", "unknown", "limited"].includes(state) && (
                  <button
                    className="button primary"
                    disabled={!ownedJob}
                    onClick={checkStatus}
                  >
                    {t("بررسی دوباره وضعیت", "Check status again")}
                  </button>
                )}
                {state === "failed" && (
                  <>
                    <button className="button primary" onClick={start}>
                      {t("تلاش دوباره · Demo", "Try again · Demo")}
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => setDemoStatus("review")}
                    >
                      {t(
                        "درخواست بررسی هنرمند · Demo",
                        "Request artist review · Demo",
                      )}
                    </button>
                  </>
                )}
                {state === "needs-details" && (
                  <button
                    className="button primary"
                    onClick={() => edit("references")}
                  >
                    {t("ویرایش اطلاعات", "Edit details")}
                  </button>
                )}
                {["queued", "processing"].includes(state) && (
                  <button className="button secondary" onClick={checkStatus}>
                    {t("بررسی دوباره وضعیت", "Check status again")}
                  </button>
                )}
                {canContinue && (
                  <button className="button primary" onClick={continueProposal}>
                    {state === "complete"
                      ? t(
                          "ادامه به پیشنهاد سفارش",
                          "Continue to order proposal",
                        )
                      : state === "review"
                        ? t(
                            "مشاهده وضعیت بررسی · Demo",
                            "View review status · Demo",
                          )
                        : t(
                            "ادامه برای بررسی هنرمند · Demo",
                            "Continue to artist review · Demo",
                          )}
                    <span aria-hidden="true">{language === 0 ? "←" : "→"}</span>
                  </button>
                )}
              </div>
              {canContinue && (
                <p className="assessment-next-note">
                  {state === "complete"
                    ? t(
                        "مبلغ و شرایط پیشنهادی را در مرحله بعد بررسی می‌کنید. مقصد بعدی فعلاً پروتوتایپ است.",
                        "You will review the proposed amount and conditions in the next step. The destination is currently a prototype.",
                      )
                    : t(
                        "مسیر نمایشی بعدی برای انتظار بررسی هنرمند است؛ پیشنهاد معتبر و پرداخت پیش از تأیید هنرمند در دسترس نیست.",
                        "The next Demo destination is for pending artist review; a valid proposal and payment are not available before artist approval.",
                      )}
                </p>
              )}
              <p className="assessment-message" role="status">
                {message}
              </p>
            </section>
            {!stale &&
              view === "normal" &&
              ownedJob &&
              ["complete", "review"].includes(state) && (
                <section
                  className="assessment-result"
                  aria-labelledby="assessment-result-title"
                >
                  <div className="assessment-result-heading">
                    <h2 id="assessment-result-title">
                      {t("نتیجه اولیه", "Initial result")}
                    </h2>
                    <span className="assessment-demo-pill">Demo</span>
                  </div>
                  {Number.isFinite(ownedJob.factor) &&
                  ownedJob.factor! >= 1 &&
                  ownedJob.factor! <= 3 ? (
                    <>
                      <div className="assessment-factor">
                        <div>
                          <span>
                            {t("ضریب سختی اولیه", "Initial complexity factor")}
                          </span>
                          <strong>
                            <bdi>
                              {ownedJob.factor!.toLocaleString(
                                language === 0 ? "fa" : "en",
                              )}
                            </bdi>
                            <small>{t("از ۳ · Demo", "out of 3 · Demo")}</small>
                          </strong>
                        </div>
                        <p>
                          {t(
                            "مقیاس نمونه ۱ تا ۳: از پیچیدگی کمتر تا بیشتر. قرارداد واقعی محصول هنوز متصل نیست.",
                            "Example scale of 1–3: lower to higher complexity. The actual product contract is not connected.",
                          )}
                        </p>
                      </div>
                      <p className="assessment-disclaimer">
                        {t(
                          "این ضریب نمونه، نمره کیفیت تصویر، ارزش هنری یا قضاوت درباره ظاهر افراد نیست.",
                          "This illustrative factor is not an image-quality score, artistic value or judgment about anyone’s appearance.",
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="assessment-warning">
                      {t(
                        "ضریب معتبر در دسترس نیست؛ ارزیابی خودکار کافی نیست و امکان ادامه به پیشنهاد وجود ندارد.",
                        "No valid factor is available; automated assessment is insufficient and proposal continuation is unavailable.",
                      )}
                    </p>
                  )}
                  <h3>
                    {t(
                      "چه عواملی در ارزیابی مؤثر بوده‌اند؟",
                      "What contributed to this assessment?",
                    )}
                  </h3>
                  <ul className="assessment-reasons">
                    {ownedJob.reasons.map((reason, i) => (
                      <li key={i}>
                        <span aria-hidden="true">—</span>
                        {reason[language]}
                      </li>
                    ))}
                  </ul>
                  <div className="assessment-human">
                    <StatusIcon kind={state} />
                    <div>
                      <strong>
                        {state === "review"
                          ? t(
                              "بررسی هنرمند لازم است · Demo",
                              "Artist review required · Demo",
                            )
                          : t(
                              "در نمونه، بررسی اجباری گزارش نشده است",
                              "No mandatory review reported in this example",
                            )}
                      </strong>
                      <p>
                        {t(
                          "ارزیابی اولیه به معنی پذیرش درخواست یا شروع خلق اثر نیست.",
                          "Initial assessment is not acceptance of the request or the start of artwork creation.",
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            <section className="assessment-explainer">
              <span className="assessment-label">
                {t("نقش AI در این مرحله", "AI’S ROLE IN THIS STEP")}
              </span>
              <h2>
                {t(
                  "بررسی اطلاعات، نه خلق نقاشی",
                  "Assessment, not artwork creation",
                )}
              </h2>
              <p>
                {t(
                  "AI در مسیر واقعی به بررسی سختی و آماده‌سازی اطلاعات پیشنهاد کمک می‌کند. نتیجه ممکن است به بازبینی هنرمند نیاز داشته باشد؛ در این صفحه نه پیش‌نمایش اثر تولید می‌شود و نه قیمت نهایی تعیین می‌شود.",
                  "In the live workflow, AI helps assess complexity and prepare proposal information. Artist review may be needed; this page neither generates an artwork preview nor determines a final price.",
                )}
              </p>
              <div className="assessment-exit-note">
                {t(
                  "این Demo فقط در حافظه نشست مرورگر است. خروج از صفحه کار واقعی را لغو نمی‌کند، چون پردازش سروری وجود ندارد. بازگشت در همین نشست، وضعیت نمونه را بازیابی می‌کند؛ بارگذاری مجدد آن را از بین می‌برد. اعلان یا پردازش پس‌زمینه وعده داده نمی‌شود.",
                  "This Demo exists only in browser session memory. Leaving does not cancel a real job, as no server processing exists. Returning within the session restores the sample state; reloading loses it. No notifications or background processing are promised.",
                )}
              </div>
            </section>
          </div>
          <aside className="assessment-sidebar">
            <section className="assessment-summary">
              <div className="assessment-summary-title">
                <h2>{t("خلاصه درخواست شما", "Your request summary")}</h2>
                <span>{t("خصوصی", "Private")}</span>
              </div>
              {validReferences ? (
                <>
                  {url && (
                    <img
                      src={url}
                      alt={t(
                        "مرجع اصلی خصوصی شما",
                        "Your private primary reference",
                      )}
                    />
                  )}
                  <details className="assessment-brief">
                    <summary>
                      {t("تصویر و توضیحات", "References and brief")}
                    </summary>
                    <p>{reference!.brief}</p>
                    <small>
                      {reference!.kind === "idea"
                        ? t(
                            "بر اساس ایده · بدون تصویر",
                            "Idea-based · no image",
                          )
                        : `${reference!.files.length.toLocaleString(language === 0 ? "fa" : "en")} ${t("تصویر ذخیره‌شده · Demo", "saved images · Demo")}`}
                    </small>
                  </details>
                </>
              ) : (
                <p>
                  {t(
                    "مرجع معتبر ذخیره نشده است.",
                    "No valid reference has been saved.",
                  )}
                </p>
              )}
              <dl>
                {[
                  [
                    t("نوع اجرا", "Execution"),
                    preferences?.execution === "digital"
                      ? t("اجرای دیجیتال", "Digital artwork")
                      : preferences?.execution === "hand"
                        ? t("اجرای دستی", "Hand-painted artwork")
                        : t("ثبت نشده", "Not saved"),
                  ],
                  [
                    t("سبک", "Style"),
                    preferenceStyles.find((s) => s.id === preferences?.style)
                      ?.name[language] || t("ثبت نشده", "Not saved"),
                  ],
                  [t("سایز اثر", "Artwork size"), sizeLabel],
                  [
                    t("گزینه‌های تکمیلی", "Additional options"),
                    t(
                      "گزینه فعالی تعریف نشده · Demo",
                      "No active options defined · Demo",
                    ),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <bdi>{value}</bdi>
                    </dd>
                  </div>
                ))}
              </dl>
              {valid && (
                <p className="assessment-summary-version">
                  {t("نسخه فعلی ذخیره‌شده", "Current saved version")}:{" "}
                  <bdi>
                    {reference!.version} / {preferences!.version}
                  </bdi>
                </p>
              )}
              <div className="assessment-edit-links">
                <button onClick={() => edit("references")}>
                  {t("ویرایش تصویر و توضیحات", "Edit references and brief")}
                  <span aria-hidden="true">↗</span>
                </button>
                <button onClick={() => edit("preferences")}>
                  {t("ویرایش سبک و اجرا", "Edit style and execution")}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
              <p className="assessment-summary-note">
                {t(
                  "تغییر اطلاعات، نتیجه نسخه قبلی را برای درخواست جدید نامعتبر می‌کند.",
                  "Changing details invalidates an earlier result for the new request.",
                )}
              </p>
            </section>
            <section className="assessment-privacy">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3m4 4v3" />
              </svg>
              <h3>
                {t("اطلاعات شما، خصوصی", "Your information stays private")}
              </h3>
              <p>
                {t(
                  "نحوه استفاده از تصاویر و اطلاعات را در حریم خصوصی بخوانید. سیاست تأییدشده به این Demo متصل نیست و لینک فعلاً مقصد پروتوتایپ است.",
                  "Read how images and information are used in the privacy policy. An approved policy is not connected to this Demo; the link is currently a prototype destination.",
                )}
              </p>
              <button
                className="text-link"
                onClick={() =>
                  onNavigate(t("حریم خصوصی", "Privacy policy"), "/privacy")
                }
              >
                {t("حریم خصوصی", "Privacy policy")}
                <span aria-hidden="true">↗</span>
              </button>
            </section>
            <section className="assessment-support">
              <h3>
                {t("برای ادامه کمک می‌خواهید؟", "Need help moving forward?")}
              </h3>
              <p>
                {t(
                  "بدون ارسال دوباره تصویر خصوصی، از مسیر تماس راهنمایی بگیرید.",
                  "Use the contact route for guidance without re-sending your private image.",
                )}
              </p>
              <button
                className="text-link"
                onClick={() =>
                  onNavigate(
                    t("تماس با نیل‌آرت", "Contact NilArt"),
                    `${prefix}/contact`,
                  )
                }
              >
                {t("تماس با نیل‌آرت", "Contact NilArt")}
                <span aria-hidden="true">↗</span>
              </button>
            </section>
          </aside>
        </div>
      )}
      <details className="references-demo-controls assessment-controls">
        <summary>
          {t("کنترل حالت‌های نمایشی · Demo", "Prototype state controls · Demo")}
        </summary>
        <p>
          {t(
            "هیچ نتیجه‌ای خودکار تولید نمی‌شود. ابتدا مراحل قبل را تکمیل کنید یا پیش‌نویس نمونه متنی را با اقدام صریح بارگیری کنید.",
            "No result is produced automatically. Complete previous steps or explicitly load a text-only sample draft.",
          )}
        </p>
        <div>
          <label>
            <input
              type="checkbox"
              checked={signedIn}
              onChange={(e) => onDemoSignIn(e.target.checked)}
            />
            {t("نشست مجاز Demo", "Authorized Demo session")}
          </label>
          <button
            className="button secondary"
            disabled={!authorized}
            onClick={() => {
              if (
                window.confirm(
                  t(
                    "پیش‌نویس نمونه جایگزین داده‌های نشست شود؟ داده قبلی و نتیجه Demo پاک می‌شوند.",
                    "Replace session data with a sample draft? Existing draft data and the Demo result will be cleared.",
                  ),
                )
              ) {
                onDemoFixture()
                setView("normal")
              }
            }}
          >
            {t("بارگیری پیش‌نویس متنی Demo", "Load text-only Demo draft")}
          </button>
        </div>
        <div>
          <label>
            {t("حالت نمایش", "View state")}
            <select
              value={view}
              onChange={(e) => {
                setView(e.target.value as AssessmentView)
                setMessage("")
              }}
            >
              {[
                ["normal", "عادی", "Normal"],
                ["loading", "بارگذاری", "Loading"],
                ["empty", "اطلاعات ناقص", "Incomplete"],
                ["network", "خطای دریافت وضعیت", "Status connection error"],
                ["unknown", "نتیجه نامشخص", "Unknown result"],
                ["limited", "محدودیت تلاش", "Retry restricted"],
                ["stale", "نسخه قبلی", "Earlier version"],
                ["denied", "عدم دسترسی", "Permission denied"],
                ["expired", "نشست منقضی", "Session expired"],
                [
                  "progress",
                  "پاسخ درصددار نمونه",
                  "Sample percentage response",
                ],
              ].map(([value, fa, en]) => (
                <option key={value} value={value}>
                  {t(fa, en)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("وضعیت کار · Demo", "Job status · Demo")}
            <select
              value={ownedJob?.status || ""}
              disabled={!valid || !authorized || view === "loading"}
              onChange={(e) =>
                setDemoStatus(e.target.value as AssessmentStatus)
              }
            >
              <option value="" disabled>
                {t("انتخاب حالت", "Choose state")}
              </option>
              {[
                "queued",
                "processing",
                "complete",
                "review",
                "insufficient",
                "needs-details",
                "failed",
              ].map((value) => (
                <option key={value} value={value}>
                  {t(stateText[value][0], stateText[value][1])}
                </option>
              ))}
            </select>
          </label>
        </div>
        {valid &&
          authorized &&
          ["queued", "processing"].includes(ownedJob?.status || "") && (
            <div>
              <button
                className="button secondary"
                onClick={() =>
                  setDemoStatus(
                    ownedJob?.status === "queued" ? "processing" : "complete",
                  )
                }
              >
                {ownedJob?.status === "queued"
                  ? t("نمایش پردازش · Demo", "Show processing · Demo")
                  : t("نمایش نتیجه نمونه · Demo", "Show sample result · Demo")}
              </button>
            </div>
          )}
        <p>
          {t(
            "کنترل درصد فقط هنگام وضعیت پردازش قابل مشاهده است و مقدار آن صریحاً نمونه Demo است. هیچ فایل خصوصی از مرورگر خارج نمی‌شود.",
            "The percentage example is visible only during processing and is explicitly Demo data. No private file leaves the browser.",
          )}
        </p>
      </details>
    </div>
  )
}
