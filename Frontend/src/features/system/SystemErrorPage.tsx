"use client";

import { useSyncExternalStore } from "react";

export type ErrorKind = "404" | "403" | "500" | "offline";
const subscribe = () => () => {};
const englishPath = () => /^\/en(?:\/|$)/.test(window.location.pathname);
const serverLanguage = () => false;
const subscribeNetwork = (listener: () => void) => {
  window.addEventListener("online", listener); window.addEventListener("offline", listener);
  return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); };
};
const isOnline = () => navigator.onLine;
const serverOnline = () => true;
const copy = {
  "404": ["صفحه پیدا نشد", "Page not found", "شاید نشانی تغییر کرده یا این صفحه دیگر در دسترس نباشد. از اینجا مسیر تازه‌ای پیدا کنید.", "This page may have moved or is no longer available. Let’s find your way back."],
  "403": ["دسترسی مجاز نیست", "Access denied", "برای ادامه با حساب دارای مجوز وارد شوید.", "Sign in with an authorized account to continue."],
  "500": ["در نمایش صفحه مشکلی پیش آمد", "Something went wrong", "کمی بعد دوباره تلاش کنید. تلاش مجدد، پرداخت یا ثبت سفارش را تکرار نمی‌کند.", "Please try again shortly. Retrying this page does not repeat a payment or order submission."],
  offline: ["اتصال برقرار نیست", "You’re offline", "اتصال اینترنت را بررسی کنید و دوباره تلاش کنید. پیش از تکرار پرداخت، وضعیت سفارش را بررسی کنید.", "Check your internet connection and try again. Check your order status before attempting another payment."],
} as const;

export default function SystemErrorPage({ kind: requestedKind = "404", english, onRetry, signInHref, reference }: {
  kind?: ErrorKind; english?: boolean; onRetry?: () => void; signInHref?: string; reference?: string;
}) {
  const online = useSyncExternalStore(subscribeNetwork, isOnline, serverOnline);
  const kind = requestedKind === "500" && !online ? "offline" : requestedKind;
  const detectedEnglish = useSyncExternalStore(subscribe, englishPath, serverLanguage);
  const en = english ?? detectedEnglish;
  const prefix = en ? "/en" : "/fa";
  const text = copy[kind];
  const safeReference = reference && /^[a-zA-Z0-9_-]{1,80}$/.test(reference) ? reference : null;
  return <div className="system-error" dir={en ? "ltr" : "rtl"} lang={en ? "en" : "fa"}>
    <a className="system-error-skip" href="#error-content">{en ? "Skip to content" : "رفتن به محتوای اصلی"}</a>
    <header className="system-error-header">
      <a href={prefix} aria-label={en ? "NilArt — Home" : "نیل‌آرت — خانه"}><img src="/brand/nilart-logo.webp" width="138" height="76" alt="NilArt Studio" /></a>
      <nav aria-label={en ? "Main navigation" : "ناوبری اصلی"}><a href={`${prefix}/collections`}>{en ? "Collections" : "کالکشن‌ها"}</a><a href={`${prefix}/shop`}>{en ? "Shop" : "فروشگاه"}</a><a href={`${prefix}/contact`}>{en ? "Contact" : "تماس"}</a></nav>
    </header>
    <main id="error-content" className="system-error-content">
      <div className="system-error-art" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none"><path d="M29 99V48a31 31 0 0 1 62 0v51M41 99V49a19 19 0 0 1 38 0v50M23 99h74M60 6v7M15 28l8 8M105 28l-8 8" stroke="currentColor" strokeWidth="1.5"/><path d="m57 62 5 8 10-17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></div>
      <span className="system-error-code">{kind === "offline" ? "OFFLINE" : kind}</span>
      <h1>{text[en ? 1 : 0]}</h1><p>{text[en ? 3 : 2]}</p>
      <div className="system-error-actions">
        {(onRetry || kind === "500" || kind === "offline") && <button className="button primary" onClick={onRetry ?? (() => window.location.reload())}>{en ? "Try again" : "دوباره تلاش کنید"}</button>}
        {kind === "403" && <a className="button primary" href={signInHref ?? `${prefix}/auth/login`}>{en ? "Sign in" : "ورود به حساب"}</a>}
        <a className={`button ${onRetry || kind === "403" ? "secondary" : "primary"}`} href={prefix}>{en ? "Back to home" : "بازگشت به خانه"}</a>
        <a className="button secondary" href={`${prefix}/shop`}>{en ? "Browse the shop" : "مشاهده فروشگاه"}</a>
      </div>
      {kind === "404" && <form action={`${prefix}/shop`} method="get" className="system-error-search"><label htmlFor="error-search">{en ? "Search the shop" : "جست‌وجو در فروشگاه"}</label><div><input id="error-search" name="q" type="search" maxLength={150} placeholder={en ? "Product or collection name" : "نام محصول یا کالکشن"} /><button className="button secondary" type="submit">{en ? "Search" : "جست‌وجو"}</button></div></form>}
      {safeReference && <small>{en ? "Reference: " : "کد پیگیری: "}<bdi>{safeReference}</bdi></small>}
    </main>
    <footer className="system-error-footer"><span>{en ? "Art for everyday life." : "هنر برای لحظه‌های روزمره."}</span><a href={`${prefix}/contact`}>{en ? "Need help? Contact us" : "نیاز به راهنمایی دارید؟ تماس با ما"}</a></footer>
  </div>;
}
