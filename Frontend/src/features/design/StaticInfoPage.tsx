"use client";
const content = {
  "guides/buying": ["راهنمای خرید", "Buying guide", "محصولات را از فروشگاه و کالکشن‌ها مرور کنید. قیمت و موجودی تأییدنشده، پیشنهاد قابل خرید نیست. خرید و پرداخت هنوز فعال نشده‌اند.", "Browse products through the shop and collections. Unconfirmed prices or availability are not purchase offers. Checkout and payment are not yet enabled."],
  faq: ["سؤالات متداول", "FAQ", "برای مرور محصولات نیازی به ورود نیست. ثبت درخواست نقاشی به ورود نیاز دارد و تا بررسی هنرمند، سفارش خرید یا قیمت قطعی محسوب نمی‌شود.", "Browsing does not require sign-in. Commission requests require sign-in and are not purchase orders or confirmed quotes before artist review."],
  "track-order": ["پیگیری سفارش", "Track order", "پیگیری سفارش‌های خرید هنوز فعال نشده است. شناسه درخواست نقاشی، شناسه سفارش پرداخت‌شده نیست.", "Purchase-order tracking is not enabled yet. A commission request ID is not a paid order ID."],
  returns: ["لغو و مرجوعی", "Returns", "سیاست نهایی لغو و مرجوعی هنوز منتشر نشده است. درخواست مرجوعی یا بازپرداخت از این صفحه ثبت نمی‌شود.", "The final cancellation and returns policy has not been published. This page does not submit return or refund requests."],
  about: ["درباره ما", "About", "نیل‌آرت استودیو، فروشگاه کالکشن‌محور محصولات هنری، نقاشی و درخواست نقاشی سفارشی است.", "Nilart Studio brings art products, artworks and custom artwork requests together through collections."],
  contact: ["تماس", "Contact", "اطلاعات تماس تأییدشده هنوز منتشر نشده است. این صفحه پیام یا درخواست پشتیبانی ارسال نمی‌کند.", "Verified contact details have not been published yet. This page does not send messages or support requests."],
  terms: ["قوانین خرید", "Terms", "قوانین نهایی خرید هنوز منتشر نشده‌اند. مرور کاتالوگ یا ثبت درخواست بررسی، خرید یا قرارداد پرداخت ایجاد نمی‌کند.", "Final purchase terms have not been published. Browsing or submitting a review request does not create a purchase or payment agreement."],
  privacy: ["حریم خصوصی", "Privacy", "سیاست نهایی حریم خصوصی هنوز منتشر نشده است. برای درخواست نقاشی، فقط اطلاعات لازم برای شرح درخواست را وارد کنید.", "The final privacy policy has not been published. Include only information needed to describe your commission request."],
} as const;
export function staticInfoKey(path: string) { return path.replace(/^\/(fa|en)\//, "").replace(/^\//, "").replace(/\/$/, ""); }
export function isStaticInfoPage(path: string) { return Object.hasOwn(content, staticInfoKey(path)); }
export default function StaticInfoPage({ path, language }: { path: string; language: 0 | 1 }) {
  const entry = content[staticInfoKey(path) as keyof typeof content];
  return <main className="container section" dir={language === 0 ? "rtl" : "ltr"}><h1>{entry[language]}</h1><p>{entry[language + 2]}</p><a className="button secondary" href={`/${language === 0 ? "fa" : "en"}/shop`}>{language === 0 ? "مشاهده فروشگاه" : "Browse the shop"}</a></main>;
}
