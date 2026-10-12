"use client";
import "./static-info.css";
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
type Section = [string, string, string, string];
const sections: Record<keyof typeof content, Section[]> = {
  "guides/buying": [
    ["۱. کشف محصولات", "1. Discover products", "کالکشن‌ها محصولات یک دنیای تصویری را کنار هم نشان می‌دهند. در فروشگاه از فیلتر دسته و کالکشن استفاده کنید.", "Collections bring products from one visual world together. Use category and collection filters in the shop."],
    ["۲. بررسی اطلاعات", "2. Review the details", "عنوان و شرح محصول را بخوانید. عبارت اطلاعات خرید تأیید نشده، به معنی نبود پیشنهاد خرید معتبر است.", "Read the title and description. Unconfirmed purchase details mean a verified purchase offer is not available."],
    ["۳. درخواست نقاشی", "3. Request custom artwork", "پس از ورود، ایده، تغییرات، سبک، سایز و نوع اجرا را در صفحه سفارش نقاشی ثبت کنید و شناسه درخواست را نگه دارید.", "After signing in, submit your idea, changes, style, size and execution type on the commissions page. Keep the request ID."],
  ],
  faq: [
    ["آیا برای مرور فروشگاه باید وارد شوم؟", "Do I need to sign in to browse?", "خیر. صفحات عمومی فروشگاه، کالکشن‌ها، نقاشی‌ها و پکیج‌ها بدون ورود قابل مشاهده‌اند.", "No. Public shop, collection, artwork and bundle pages can be viewed without signing in."],
    ["چرا بعضی قیمت‌ها یا تصاویر نمایش داده نمی‌شوند؟", "Why are some prices or images missing?", "داده یا رسانه تأییدشده هنوز برای آن مورد منتشر نشده است؛ مقدار فرضی جایگزین آن نمی‌شود.", "Verified data or media has not been published for that item. Assumed values are not substituted."],
    ["ثبت درخواست نقاشی چه معنایی دارد؟", "What does submitting a commission mean?", "شرح شما ذخیره و شناسه درخواست صادر می‌شود. درخواست در انتظار بررسی است و تأیید قیمت، پرداخت یا شروع اجرا نیست.", "Your brief is saved and a request ID is issued. It awaits review and does not confirm a price, payment or start of work."],
    ["اگر نتیجه ثبت درخواست مشخص نبود چه کنم؟", "What if submission is unconfirmed?", "از بررسی دوباره همان درخواست استفاده کنید. شناسه ثابت کمک می‌کند پاسخ گم‌شده درخواست تکراری نسازد.", "Use Retry same request. Reusing the submission ID prevents a lost response from creating a duplicate."],
  ],
  "track-order": [["شناسه‌ها را از هم جدا کنید", "Keep the IDs distinct", "شناسه درخواست نقاشی را برای پیگیری بررسی نگه دارید؛ این شناسه شماره خرید یا پرداخت نیست.", "Keep your commission request ID for review follow-up. It is not a purchase or payment number."], ["پیگیری خرید", "Purchase tracking", "تا راه‌اندازی سفارش و ارسال، وضعیت حمل یا زمان تحویل تأییدشده‌ای در این صفحه وجود ندارد.", "Until orders and fulfillment are enabled, this page has no verified shipping status or delivery date."]],
  returns: [["پیش از خرید", "Before purchasing", "شرایط نهایی لغو، مرجوعی و ارسال باید پیش از فعال‌شدن خرید منتشر شوند.", "Final cancellation, returns and shipping terms must be published before purchasing is enabled."], ["اثر آماده و سفارش سفارشی", "Ready artwork and custom requests", "شرایط این دو نوع سفارش ممکن است متفاوت باشد؛ سیاست تأییدنشده‌ای برای آن‌ها اعلام نمی‌شود.", "These order types may have different conditions. No unapproved policy is asserted for either."]],
  about: [["هنر در زندگی روزمره", "Art in everyday life", "محصولات هنری و نقاشی‌ها را از مسیر کالکشن‌ها کشف کنید؛ هر کالکشن یک دنیای تصویری مشترک دارد.", "Discover art products and artworks through collections, each bringing a shared visual world together."], ["ایده‌ای که متعلق به شماست", "An idea of your own", "صفحه سفارش نقاشی برای ثبت ایده و توضیح خواسته‌های شما ساخته شده است؛ اجرای کار به بررسی و تأیید بعدی نیاز دارد.", "The commissions page lets you describe your own idea. Execution requires later review and confirmation."]],
  contact: [["پیش از تماس", "Before contacting us", "پرسش‌های عمومی را در سؤالات متداول و راهنمای خرید بررسی کنید.", "Check FAQ and the buying guide for general questions."], ["شرح ایده نقاشی", "Describe an artwork idea", "برای ثبت ایده از صفحه سفارش نقاشی استفاده کنید؛ اطلاعات حساس یا غیرضروری را در شرح درخواست ننویسید.", "Use the commissions page to submit an idea. Avoid sensitive or unnecessary information in the brief."]],
  terms: [["اطلاعات کاتالوگ", "Catalog information", "شرح محصول یا پکیج، به تنهایی تأیید موجودی، قیمت یا امکان پرداخت نیست.", "A product or bundle description alone does not confirm stock, price or payment availability."], ["درخواست بررسی", "Review requests", "ثبت درخواست نقاشی تنها شرح خواسته شما را ذخیره می‌کند؛ پذیرش قیمت یا تعهد اجرای کار در این مرحله ثبت نمی‌شود.", "Submitting a commission saves your brief only. Quote acceptance or a commitment to execute is not recorded at this stage."]],
  privacy: [["اطلاعاتی که وارد می‌کنید", "Information you enter", "برای درخواست نقاشی، شرح ایده و ترجیحات خود را وارد کنید. جزئیات غیرضروری شخصی را حذف کنید.", "For commissions, provide your idea and preferences. Leave out unnecessary personal details."], ["درخواست‌های متنی", "Text requests", "درخواست ثبت‌شده به حساب واردشده متصل می‌شود. جزئیات و مدت نگهداری داده باید در سیاست نهایی مشخص شوند.", "A submitted request is associated with the signed-in account. Data handling and retention details must be specified in the final policy."]],
};
export function staticInfoKey(path: string) { return path.replace(/^\/(fa|en)\//, "").replace(/^\//, "").replace(/\/$/, ""); }
export function isStaticInfoPage(path: string) { return Object.hasOwn(content, staticInfoKey(path)); }
export default function StaticInfoPage({ path, language }: { path: string; language: 0 | 1 }) {
  const key = staticInfoKey(path) as keyof typeof content;
  const entry = content[key];
  const prefix = language === 0 ? "/fa" : "/en";
  return <main className="container section static-info-page" dir={language === 0 ? "rtl" : "ltr"}>
    <nav className="breadcrumb" aria-label={language === 0 ? "مسیر صفحه" : "Breadcrumb"}><a href={prefix}>{language === 0 ? "خانه" : "Home"}</a><span>/</span><span aria-current="page">{entry[language]}</span></nav>
    <header className="static-info-heading"><span className="eyebrow">NILART · STUDIO</span><h1>{entry[language]}</h1><p>{entry[language + 2]}</p></header>
    <div className="static-info-layout"><nav className="static-info-nav" aria-label={language === 0 ? "صفحات راهنما" : "Help pages"}>
      {Object.entries(content).map(([route, item]) => <a key={route} href={`${prefix}/${route}`} aria-current={route === key ? "page" : undefined}>{item[language]}</a>)}
    </nav><div className="static-info-content">{sections[key].map((section, index) => key === "faq" ? <details className="static-info-section" key={index}><summary>{section[language]}</summary><p>{section[language + 2]}</p></details> : <section className="static-info-section" key={index}><h2>{section[language]}</h2><p>{section[language + 2]}</p></section>)}
    <div className="static-info-actions"><a className="button secondary" href={`${prefix}/shop`}>{language === 0 ? "مشاهده فروشگاه" : "Browse the shop"}</a><a className="text-link" href={`${prefix}/commissions`}>{language === 0 ? "سفارش نقاشی" : "Commission artwork"}</a></div></div></div>
  </main>;
}
