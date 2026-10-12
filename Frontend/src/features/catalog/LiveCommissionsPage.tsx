"use client";
import { useEffect, useRef, useState } from "react";
import { sessionLifecycle } from "../identity/session-lifecycle";
import "../../design/commissions.css";
export default function LiveCommissionsPage({ language }: { language: 0 | 1 }) {
  const t = (fa: string, en: string) => language === 0 ? fa : en;
  const [fields, setFields] = useState({ idea: "", changes: "", style: "", size: "", execution: "handmade" });
  const [status, setStatus] = useState("");
  const [receipt, setReceipt] = useState("");
  const pending = useRef(false);
  const submission = useRef<{ id: string; body: typeof fields } | null>(null);
  useEffect(() => sessionLifecycle.subscribe(event => {
    if (event.type !== "changed") return;
    setFields({ idea: "", changes: "", style: "", size: "", execution: "handmade" });
    submission.current = null; setReceipt(""); setStatus("");
  }), []);
  const submit = async () => {
    if (pending.current) return;
    pending.current = true; setStatus("saving");
    const revision = sessionLifecycle.capture();
    if (!submission.current) submission.current = { id: crypto.randomUUID(), body: { ...fields } };
    const draft = submission.current;
    try {
      const bootstrap = await fetch("/api/v1/auth/session/csrf", { method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(10000) });
      if (!sessionLifecycle.current(revision)) return;
      if (bootstrap.status === 401) { sessionLifecycle.observe(null, revision); setStatus("login"); return; }
      if (!bootstrap.ok) throw new Error("Unavailable");
      const csrf = await bootstrap.json();
      if (typeof csrf.csrf_token !== "string") throw new Error("Invalid CSRF");
      if (!sessionLifecycle.current(revision)) return;
      const response = await fetch("/api/v1/account/commissions", { method: "POST", credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000), headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf.csrf_token }, body: JSON.stringify({ ...draft.body, submission_id: draft.id }) });
      if (!sessionLifecycle.current(revision)) return;
      if (response.status === 401) { sessionLifecycle.observe(null, revision); setStatus("login"); return; }
      if (!response.ok) { if (response.status === 422 || response.status === 403 || response.status === 409) { submission.current = null; setStatus("rejected"); return; } throw new Error("Unconfirmed"); }
      const result = await response.json();
      if (typeof result.id !== "string" || result.status !== "awaiting_review") throw new Error("Invalid receipt");
      setReceipt(result.id); setStatus("saved");
    } catch { if (sessionLifecycle.current(revision)) setStatus("unknown"); }
    finally { pending.current = false; }
  };
  return <main className="container commissions-page" dir={language === 0 ? "rtl" : "ltr"}>
    <header><h1>{t("سفارش نقاشی", "Commission artwork")}</h1><p>{t("ایده و خواسته‌های خود را برای بررسی ثبت کنید. ثبت درخواست تأیید قیمت یا سفارش خرید نیست.", "Submit your idea for review. A request does not confirm a quote or purchase.")}</p></header>
    {receipt ? <div role="status"><h2>{t("درخواست ثبت شد؛ در انتظار بررسی", "Request saved; awaiting review")}</h2><p>{receipt}</p></div>
      : <form onSubmit={event => { event.preventDefault(); void submit(); }}>
        <fieldset disabled={status === "saving" || status === "unknown"}>
          {(["idea", "changes", "style", "size"] as const).map(key => <label key={key}>
            {({ idea: t("ایده", "Idea"), changes: t("تغییرات", "Changes"), style: t("سبک", "Style"), size: t("سایز مورد نظر", "Requested size") })[key]}
            <textarea required={key !== "changes"} maxLength={key === "idea" ? 4000 : key === "changes" ? 2000 : 300} value={fields[key]} onChange={event => { submission.current = null; setFields({ ...fields, [key]: event.target.value }); }} />
          </label>)}
          <label>{t("نوع اجرا", "Execution")}<select value={fields.execution} onChange={event => { submission.current = null; setFields({ ...fields, execution: event.target.value }); }}><option value="handmade">{t("دستی", "Handmade")}</option><option value="digital">{t("دیجیتال", "Digital")}</option></select></label>
        </fieldset>
        <button className="button primary" disabled={status === "saving"} type="submit">{status === "unknown" ? t("بررسی دوباره همان درخواست", "Retry same request") : t("ثبت درخواست بررسی", "Submit for review")}</button>
      </form>}
    {status === "login" && <p role="alert"><a href={`/${language === 0 ? "fa" : "en"}/auth/login?returnTo=${encodeURIComponent(`/${language === 0 ? "fa" : "en"}/commissions`)}`}>{t("برای ثبت درخواست وارد شوید", "Sign in to submit your request")}</a></p>}
    {status === "unknown" && <p role="alert">{t("نتیجه ثبت مشخص نیست؛ بررسی دوباره درخواست تکراری نمی‌سازد.", "Submission is unconfirmed. Retrying uses the same request ID.")}</p>}
    {status === "rejected" && <p role="alert">{t("درخواست پذیرفته نشد؛ اطلاعات و نشست را بررسی کنید.", "Request rejected. Check your details and session.")}</p>}
  </main>;
}
