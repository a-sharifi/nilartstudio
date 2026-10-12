import { useEffect, useRef, useState, type ReactNode } from "react"
import BundleStillLife from "./BundleStillLife"

const topics = [
  ["collections", "کالکشن یا دسته؟", "Collections or categories?"],
  ["notebooks", "انتخاب دفتر", "Choosing a notebook"],
  ["bundles", "خرید پکیج", "Buying a bundle"],
  ["ordering", "مراحل خرید", "How to order"],
  ["artworks", "نقاشی آماده و سفارشی", "Artworks and commissions"],
  ["delivery", "ارسال، پیگیری و مرجوعی", "Delivery, tracking and returns"],
]

export default function BuyingGuide({ language, mode, onMode, onNavigate, renderMedia, arrow }: {
  language: 0 | 1
  mode: string
  onMode: (mode: string) => void
  onNavigate: (name: string, route: string) => void
  renderMedia: (color: string, kind: string) => ReactNode
  arrow: ReactNode
}) {
  const t = (fa: string, en: string) => language === 0 ? fa : en
  const [active, setActive] = useState("collections")
  const accordion = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (mode !== "normal") return
    const sections = topics.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    const update = () => {
      const passed = sections.filter(section => section.getBoundingClientRect().top <= 180)
      const current = passed[passed.length - 1]
      setActive(current?.id || "collections")
    }
    const restoreAnchor = () => {
      const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)))
      target?.scrollIntoView({ behavior: "instant", block: "start" })
    }
    update()
    restoreAnchor()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("hashchange", restoreAnchor)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("hashchange", restoreAnchor)
    }
  }, [mode])
  const link = (fa: string, en: string, route: string, className = "text-link") => (
    <a href={route} className={className} onClick={event => { if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) { event.preventDefault(); onNavigate(t(fa, en), route) } }}>
      {t(fa, en)}{arrow}
    </a>
  )
  const navigation = <nav aria-label={t("موضوعات راهنما", "Guide topics")}>{topics.map(([id, fa, en], index) => (
    <a key={id} href={`#${id}`} aria-current={active === id ? "location" : undefined} onClick={event => {
      event.preventDefault()
      if (accordion.current) accordion.current.open = false
      window.history.pushState({ ...window.history.state, scroll: window.scrollY }, "", `#${id}`)
      document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })
      document.getElementById(id)?.focus({ preventScroll: true })
      setActive(id)
    }}><span className="guide-nav-number">{String(index + 1).padStart(2, "0")}</span>{t(fa, en)}</a>
  ))}</nav>
  const heading = (index: number, fa: string, en: string, labelFa: string, labelEn: string) => <div className="guide-section-heading"><span className="guide-kicker">{String(index).padStart(2, "0")} / {t(labelFa, labelEn)}</span><h2>{t(fa, en)}</h2></div>
  const card = (fa: string, en: string, bodyFa: string, bodyEn: string, children?: ReactNode) => <div className="guide-card"><h3>{t(fa, en)}</h3><p>{t(bodyFa, bodyEn)}</p>{children}</div>
  const retry = () => { onMode("loading"); window.setTimeout(() => onMode("normal"), 650) }
  return <div className="container buying-guide">
    <nav className="breadcrumb" aria-label={t("مسیر صفحه", "Breadcrumb")}>{link("خانه", "Home", "/", "")}<span>/</span><span aria-current="page">{t("راهنمای خرید", "Buying guide")}</span></nav>
    {mode === "loading" ? <div className="guide-loading" aria-busy="true"><h1 className="sr-only">{t("در حال بارگذاری راهنما", "Loading guide")}</h1><div className="skeleton guide-title-skeleton" />{[1,2,3].map(i => <div key={i} className="skeleton guide-block-skeleton" />)}</div> :
      mode !== "normal" ? <div className="guide-state" role={mode === "error" ? "alert" : undefined}><span className="guide-kicker">PUB–21 / {t("راهنمای خرید", "BUYING GUIDE")}</span><h1>{mode === "error" ? t("راهنما بارگذاری نشد.", "We couldn't load the guide.") : mode === "translation" ? t("این راهنما هنوز به زبان انتخاب‌شده منتشر نشده است.", "This guide hasn't been published in the selected language yet.") : t("راهنمای خرید فعلاً در دسترس نیست.", "The buying guide isn't available yet.")}</h1><div className="guide-actions">{mode === "error" ? <button className="button primary" onClick={retry}>{t("دوباره تلاش کنید", "Try again")}</button> : mode === "translation" ? link("مشاهده نسخه فارسی", "View Persian version", "/guides/buying?language=fa", "button primary") : link("سؤالات متداول", "FAQ", "/faq", "button primary")}{link("تماس", "Contact", "/contact", "button secondary")}</div></div> :
      <>
        <div className="guide-intro">
          <div><span className="guide-kicker"><span className="tiny-line" />{t("همراه انتخاب‌های هنری تو", "A LITTLE GUIDANCE, A LOVELY CHOICE")}</span><h1>{t("راهنمای خرید از نیل‌آرت", "Your guide to shopping at NilArt")}</h1><p>{t("از انتخاب کالکشن و محصول تا پرداخت و پیگیری؛ اینجا مسیر خرید و نکات انتخاب را بشناس.", "From choosing a collection and product to payment and tracking, find the steps and tips you need here.")}</p><div className="guide-intro-meta"><span>PUB–21</span><span>{t("انتخاب آگاهانه، خرید آسان‌تر", "Thoughtful choices. Simpler shopping.")}</span></div></div>
          <div className="guide-intro-art" role="img" aria-label={t("ماکت نمایشی دفتر، استیکر و نشانک؛ نه تصویر محصول واقعی", "Illustrative notebook, stickers and bookmark; not actual products")}><BundleStillLife renderMedia={renderMedia} /><span className="handwritten">a little help to find your art.</span></div>
        </div>
        <details className="guide-mobile-topics" ref={accordion}><summary>{t("موضوعات راهنما", "Guide topics")}<span>⌄</span></summary>{navigation}</details>
        <div className="guide-layout">
          <aside className="guide-sidebar"><span className="guide-kicker">{t("در این راهنما", "IN THIS GUIDE")}</span>{navigation}<div className="guide-sidebar-help"><span>{t("برای یک انتخاب بهتر", "Here to help you choose")}</span><p>{t("سؤالی داری؟ ما کنارت هستیم.", "Have a question? We're here for you.")}</p>{link("تماس با نیل‌آرت", "Get in touch", "/contact")}</div></aside>
          <div className="guide-content">
            <section id="collections" className="guide-section" tabIndex={-1}>
              {heading(1, "دو راه برای پیدا‌کردن انتخابت", "Two ways to find what you love", "کالکشن یا دسته؟", "COLLECTION OR CATEGORY?")}
              <p className="guide-lead">{t("از طرحی که دوست داری شروع کن، یا از محصولی که نیاز داری.", "Start with a theme you love, or a product you need.")}</p>
              <div className="guide-two">
                <div className="guide-card guide-discovery"><div className="guide-collection-art"><span className="guide-cat"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M22 42 20 15l24 16h13l23-16-2 28c16 39-12 47-29 47S7 77 22 42Z" fill="currentColor"/><path d="M36 56h2m24 0h2M47 66l4 4 4-4M27 68 8 63m19 12L8 79m66-11 18-5m-18 12 18 4" stroke="var(--canvas)" strokeWidth="3" strokeLinecap="round"/></svg></span><span className="handwritten">a world of cats</span></div><div className="guide-card-copy"><h3>{t("خرید بر اساس کالکشن", "Shop by collection")}</h3><p>{t("اگر طرح گربه، روح یا گاو را دوست داری، وارد کالکشن شو و همه محصولات مرتبط را ببین.", "If you love a theme such as cats, ghosts or cows, open its collection to explore matching products.")}</p>{link("کشف کالکشن‌ها", "Explore collections", "/collections")}</div></div>
                <div className="guide-card guide-discovery"><div className="guide-product-art">{renderMedia("sand", "book")}{renderMedia("rose", "sticker")}{renderMedia("sage", "bookmark")}</div><div className="guide-card-copy"><h3>{t("خرید بر اساس نوع محصول", "Shop by product type")}</h3><p>{t("اگر دنبال دفتر طراحی یا استیکر هستی، از دسته محصول شروع کن و کالکشن را فیلتر کن.", "If you're looking for a sketchbook or stickers, start with the product category and filter by collection.")}</p>{link("مشاهده فروشگاه", "Browse the shop", "/shop")}</div></div>
              </div>
              <div className="guide-discovery-example"><strong>{t("مثلاً کالکشن گربه", "For example, the cats collection")}</strong><span>{arrow}</span><span>{t("دفتر طراحی · دفتر خط‌دار · استیکر · پکیج", "Sketchbook · Lined notebook · Stickers · Bundle")}</span></div><p className="guide-caption">{t("این مثال مسیر کشف را نشان می‌دهد؛ وجود یا موجودی واقعی این اقلام را تضمین نمی‌کند.", "This example illustrates discovery, not guaranteed product availability or stock.")}</p>
            </section>
            <section id="notebooks" className="guide-section" tabIndex={-1}>
              {heading(2, "برای انتخاب دفتر، این چهار مورد را بررسی کن", "Check these four things when choosing a notebook", "انتخاب دفتر", "CHOOSING A NOTEBOOK")}
              <div className="guide-size-card"><div className="guide-card-title"><span className="guide-letter">۱</span><h3>{t("سایز", "Size")}</h3><span className="guide-caption">{t("یک نگاه به اندازه‌ها", "A sense of scale")}</span></div><div className="guide-size-comparison" dir="ltr" role="img" aria-label="A4: 210 × 297 mm; A5: 148 × 210 mm; A6: 105 × 148 mm"><div className="guide-paper a4"><strong>A4</strong><span>210 × 297 mm</span><small>{t("فضای بیشتر برای طراحی", "More drawing space")}</small></div><div className="guide-paper a5"><strong>A5</strong><span>148 × 210 mm</span><small>{t("اندازه میانی برای همراه‌داشتن", "A balanced size to carry")}</small></div><div className="guide-paper a6"><strong>A6</strong><span>105 × 148 mm</span><small>{t("جمع‌وجور", "Compact")}</small></div></div><p className="guide-caption">{t("ابعاد اسمی و کاربردها عمومی‌اند. ابعاد نهایی ممکن است با برش و تولید متفاوت باشد؛ مشخصات تأییدشده صفحه محصول مرجع خرید است.", "These are nominal sizes and general uses. Final dimensions may vary with trimming and production. Use the confirmed product specifications when buying.")}</p></div>
              <div className="guide-three guide-notebook-details">
                {card("گرماژ", "Paper weight", "گرماژ، وزن کاغذ در هر مترمربع است. عدد ۱۲۷ گرم مشخصه کاغذ است، نه تعداد برگ.", "Paper weight is measured in grams per square metre. 127 gsm describes the paper, not the sheet count.", <div className="guide-gsm" dir="ltr">127 <small>gsm</small></div>)}
                {card("تعداد برگ", "Sheet count", "۵۰ برگ فیزیکی، ۱۰۰ صفحه یا روی کاغذ دارد. تعداد روی چاپ‌شده به مشخصات محصول بستگی دارد.", "50 physical sheets have 100 pages or sides. The number of printed sides depends on the product.", <div className="guide-sheet-diagram" role="img" aria-label={t("یک برگ، دو روی کاغذ", "One physical sheet, two sides")}><span>{t("رو", "Front")}</span><span>{t("پشت", "Back")}</span></div>)}
                {card("جلد و صحافی", "Cover and binding", "نوع جلد، ضخامت و روش صحافی را در مشخصات همان محصول بررسی کن. گزینه‌ها ممکن است بین محصولات متفاوت باشند.", "Check the cover, thickness and binding in each product's specifications. Available options may differ between products.", <div className="guide-binding" aria-hidden="true"><span/><span/><span/><span/><span/></div>)}
              </div>
              {link("راهنمای تخصصی دفتر: به‌زودی؛ فعلاً سؤالات متداول را ببین", "Full notebook guide: coming soon; see the FAQ for now", "/faq")}
              <div className="guide-quantity-example"><span className="guide-kicker">{t("برگ ≠ تعداد دفتر", "SHEETS ≠ NOTEBOOK QUANTITY")}</span><h3>{t("برگ داخل دفتر با تعداد دفتر خرید فرق دارد", "Sheet count and purchase quantity are different")}</h3><div className="guide-example-values">{[[t("سایز", "Size"), "A5"],[t("برگ هر دفتر", "Sheets per notebook"),t("۵۰", "50")],[t("تعداد دفتر", "Notebooks"),t("۳", "3")]].map(([label, value]) => <div key={label}><span>{label}</span><strong dir="ltr">{value}</strong></div>)}</div><p>{t("سه دفتر A5 می‌خری که هرکدام ۵۰ برگ دارند.", "You buy three A5 notebooks, each containing 50 sheets.")}</p><small>{t("این گزینه‌ها فقط مثال آموزشی‌اند، نه فرم خرید.", "Illustrative options only, not a purchase form.")}</small></div>
              <h3 className="guide-subheading">{t("هر ترکیب، وضعیت خودش را دارد", "Every combination has its own status")}</h3><p className="guide-lead">{t("سایز، تعداد برگ و جلد، ترکیب قابل فروش را تعیین می‌کنند. همه ترکیب‌ها لزوماً موجود یا قابل ارائه نیستند.", "Size, sheet count and cover determine the product variant. Not every combination is offered or in stock.")}</p><div className="guide-three guide-availability">{[
                ["available", "موجود", "Available", "این ترکیب قابل خرید است.", "This combination is available to buy."],
                ["unavailable", "ناموجود", "Out of stock", "این ترکیب ارائه می‌شود، ولی فعلاً موجودی ندارد.", "This combination is offered but currently out of stock."],
                ["undefined", "ارائه‌نشده", "Not offered", "این ترکیب در محصول تعریف نشده است.", "This combination isn't offered for this product."]
              ].map(([status, fa, en, bodyFa, bodyEn]) => <div className="guide-card" key={status}><span className={`guide-status ${status}`}><span/>{t(fa,en)}</span><p>{t(bodyFa,bodyEn)}</p></div>)}</div><p className="guide-caption">{t("کالای ناموجود پیش‌فروش نمی‌شود. سفارش نقاشی اختصاصی مسیر جداگانه دارد.", "Out-of-stock products are not pre-sold. Commissioned artwork has a separate process.")}</p>
            </section>
            <section id="bundles" className="guide-section" tabIndex={-1}>
              {heading(3, "چند محصول هماهنگ، در یک پکیج", "Matching products in one bundle", "خرید پکیج", "BUYING A BUNDLE")}
              <div className="guide-bundle-visual"><BundleStillLife renderMedia={renderMedia}/><div><span className="guide-kicker">{t("یک مثال، نه مشخصات محصول", "AN ILLUSTRATIVE EXAMPLE")}</span><h3>{t("یک دفتر + دو استیکر + یک نشانک", "One notebook + two stickers + one bookmark")}</h3><p>{t("اجزا و تعداد هر جزء را فروشگاه مشخص می‌کند. برای بعضی اجزا، مثل دفتر، می‌توانی از گزینه‌های مجاز انتخاب کنی.", "The store defines the components and their quantities. Some components, such as the notebook, offer permitted options.")}</p></div></div>
              <ul className="guide-list">{[
                ["همه اجزای مشخص‌شده داخل پکیج هستند؛ حذف جزء یا تغییر تعداد داخلی در صفحه پکیج ممکن نیست.", "All specified components are included; you can't remove components or change their internal quantities."],
                ["تعداد پکیج، تعداد همه اجزا را افزایش می‌دهد.", "Bundle quantity increases the quantity of every component."],
                ["قیمت جداگانه اجزا، تخفیف و مبلغ نهایی نمایش داده می‌شوند.", "Individual component prices, the discount and the final amount are shown."],
                ["موجودی همه اجزای ترکیب باید کافی باشد.", "All components of your chosen combination must have sufficient stock."],
                ["کد تخفیف پیش‌فرض با تخفیف پکیج جمع نمی‌شود، مگر فروشگاه برای همان پکیج اجازه داده باشد.", "A discount code does not stack with the bundle discount by default, unless the store permits it for that bundle."]
              ].map(([fa,en]) => <li key={en}>{t(fa,en)}</li>)}</ul><div className="guide-note">{t("در سبد مختلط، کد ممکن است روی محصول مستقل مجاز اعمال شود، حتی اگر روی پکیج اعمال نشود.", "In a mixed cart, a code may apply to an eligible standalone product even if it doesn't apply to the bundle.")}</div>{link("مشاهده پکیج‌ها", "Explore bundles", "/bundles")}
            </section>
            <section id="ordering" className="guide-section" tabIndex={-1}>
              {heading(4, "از انتخاب تا رسیدن به دست تو", "From finding it to making it yours", "مراحل خرید", "HOW TO ORDER")}
              <div className="guide-steps">{[
                ["پیدا‌کردن محصول","Find your product","از کالکشن، دسته یا جست‌وجو شروع کن.","Start with a collection, category or search."],
                ["انتخاب گزینه‌ها","Choose your options","سایز، تعداد برگ، جلد و تعداد خرید را بررسی کن.","Check size, sheet count, cover and purchase quantity."],
                ["مرور سبد","Review your cart","اقلام، تخفیف و مبلغ را بررسی کن.","Review your items, discounts and amount."],
                ["ورود، آدرس و ارسال","Account, address and delivery","شماره را تأیید کن و برای اقلام فیزیکی مقصد و ارسال را انتخاب کن.","Verify your phone and choose a destination and delivery for physical items."],
                ["پرداخت و پیگیری","Pay and track","مبلغ نهایی را مرور کن، در درگاه پرداخت کن و وضعیت سفارش را پیگیری کن.","Review the final amount, pay on the gateway and follow your order status."]
              ].map(([fa,en,bodyFa,bodyEn], i) => <div className="guide-step" key={en}><span>{language === 0 ? ["۱","۲","۳","۴","۵"][i] : i+1}</span><div><h3>{t(fa,en)}</h3><p>{t(bodyFa,bodyEn)}</p></div></div>)}</div>
              <div className="guide-note">{t("برای سفارش فقط دیجیتال، مرحله آدرس و ارسال لازم نیست.", "Digital-only orders don't require an address or delivery step.")}</div>
              <div className="guide-three">{card("حساب", "Account", "ورود با شماره و رمز یا شماره و کد یک‌بارمصرف. ثبت‌نام با شماره، OTP و ساخت رمز.", "Sign in with your phone and password or a one-time code. Register with phone verification and a password.")}{card("سبد", "Cart", "افزودن به سبد، موجودی را قطعی رزرو نمی‌کند. قیمت و موجودی پیش از پرداخت بررسی می‌شوند.", "Adding an item to your cart doesn't reserve it. Price and stock are checked before payment.")}{card("پرداخت", "Payment", "اطلاعات کارت بانکی در درگاه وارد می‌شوند. نتیجه پرداخت پس از بررسی تراکنش مشخص می‌شود.", "Card details are entered on the payment gateway. The payment result is confirmed after verification.")}</div>
              <div className="guide-note guide-payment-note">{t("اگر وضعیت پرداخت نامشخص است، تا تعیین نتیجه دوباره پرداخت نکن.", "If payment status is unclear, don't pay again until it's confirmed.")}</div>
            </section>
            <section id="artworks" className="guide-section" tabIndex={-1}>{heading(5, "اثری آماده، یا اثری فقط برای تو", "An artwork to find, or one to imagine", "نقاشی آماده و سفارشی", "ARTWORKS & COMMISSIONS")}<div className="guide-two">
              {card("نقاشی آماده", "Available artworks", "اثر را ببین، مشخصات و موجودی را بررسی کن و خرید کن.", "Explore the artwork, check its details and availability, then buy.", link("مشاهده نقاشی‌ها", "Explore artworks", "/artworks"))}
              {card("نقاشی اختصاصی", "Commissioned artwork", "عکس یا ایده، سبک، سایز و نوع اجرا را ثبت کن. قیمت ممکن است پیش از پرداخت نیازمند بررسی هنرمند باشد.", "Submit your photo or idea, style, size and execution type. The quote may need artist review before payment.", link("شروع سفارش نقاشی", "Start a commission", "/commissions/new"))}
            </div><p className="guide-caption">{t("پرداخت، به معنی آماده‌شدن فوری اثر نیست. زمان اجرا و شرایط اصلاحات در توافق سفارش مشخص می‌شوند.", "Payment doesn't mean the artwork is instantly ready. Execution time and revision conditions are defined in the commission agreement.")}</p></section>
            <section id="delivery" className="guide-section" tabIndex={-1}>{heading(6, "بعد از خرید هم همراهت هستیم", "A little guidance after your purchase", "ارسال، پیگیری و مرجوعی", "DELIVERY, TRACKING & RETURNS")}<div className="guide-three">
              {card("ارسال", "Delivery", "هزینه و روش حمل با مقصد و اقلام سفارش مشخص می‌شوند.", "Delivery options and cost depend on the destination and order items.", link("اطلاعات بیشتر", "More information", "/faq"))}
              {card("پیگیری", "Tracking", "وضعیت سفارش و مرسوله را از حساب یا صفحه پیگیری ببین.", "Follow order and shipment updates through your account or tracking page.", link("پیگیری سفارش", "Track order", "/track-order"))}
              {card("مرجوعی", "Returns", "شرایط محصول آماده، نقاشی سفارشی و فایل دیجیتال ممکن است متفاوت باشد.", "Return conditions may differ for ready products, commissions and digital files.", link("لغو و مرجوعی", "Cancellations and returns", "/returns-policy"))}
            </div></section>
            <div className="guide-help"><span className="guide-kicker">{t("با خیال راحت انتخاب کن", "LET'S MAKE IT SIMPLE")}</span><h2>{t("هنوز سؤالی داری؟", "Still have a question?")}</h2><p>{t("سؤالات متداول را ببین یا با ما در ارتباط باش.", "Check the FAQ or get in touch.")}</p><div className="guide-actions">{link("سؤالات متداول", "FAQ", "/faq", "button primary")}{link("تماس با ما", "Contact", "/contact", "button secondary")}</div></div>
          </div>
        </div>
      </>}
  </div>
}
