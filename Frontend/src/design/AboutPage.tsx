import { useEffect, useRef, useState, type ReactNode } from "react"
import CollectionCard, { CollectionSkeleton } from "./CollectionCard"
import {
  aboutDemoContent,
  approvedAboutImage,
  featuredAboutCollections,
  visibleAboutStory,
  type AboutContent,
  type AboutImage,
} from "./about"

interface MediaProps {
  language: 0 | 1
  image?: AboutImage
  kind: "hero" | "overview" | "products" | "story"
  failed?: boolean
  demo: boolean
  renderMedia: (color: string, kind: string) => ReactNode
}
function AboutMedia({
  language,
  image,
  kind,
  failed = false,
  demo,
  renderMedia,
}: MediaProps) {
  const [failedSource, setFailedSource] = useState("")
  const valid =
    approvedAboutImage(image) && !failed && failedSource !== image?.src
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  return (
    <figure className={`about-media about-media-${kind}`}>
      {valid && image ? (
        <img
          src={image.src}
          alt={image.alt[language]}
          onError={() => setFailedSource(image.src)}
        />
      ) : (
        <div className={`about-placeholder ${failed ? "image-failed" : ""}`}>
          {failed || kind === "story" || !demo ? (
            <div className="about-empty-media">
              <svg
                width="44"
                height="44"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8" cy="8" r="2" />
                <path d="m3 17 6-6 5 5 3-3 4 4" />
              </svg>
              <p>
                {failed
                  ? t("تصویر در دسترس نیست", "Image unavailable")
                  : t(
                      "فضای تصویر واقعی و تأییدشده برند",
                      "Space for approved brand photography",
                    )}
              </p>
            </div>
          ) : (
            <div className="about-gallery-composition" aria-hidden="true">
              <div className="about-composition-label">
                <span>ART & EVERYDAY</span>
                <span>DEMO / PLACEHOLDER</span>
              </div>
              <div className="about-art-frame">
                <svg viewBox="0 0 260 330" fill="none">
                  <rect width="260" height="330" fill="var(--canvas)" />
                  <circle
                    cx="165"
                    cy="100"
                    r="48"
                    fill="var(--accent)"
                    opacity=".75"
                  />
                  <path
                    d="M0 268Q65 105 121 222T260 180V330H0Z"
                    fill="var(--about-sage)"
                  />
                  <path
                    d="M60 330Q82 205 165 170M107 242q-42-62-63-43m75 19q43-42 79-17M82 285q-28-30-53-25"
                    stroke="var(--about-ink)"
                    strokeWidth="2"
                  />
                  <path
                    d="M27 23h30m-30 6h19"
                    stroke="var(--about-ink)"
                    opacity=".5"
                  />
                </svg>
              </div>
              <div className="about-composition-notebook">
                {renderMedia("sage", "book")}
              </div>
              <div className="about-composition-card">
                <svg viewBox="0 0 100 100" fill="none">
                  <circle cx="50" cy="50" r="30" fill="var(--about-clay)" />
                  <path
                    d="M18 82q30-64 64 0"
                    stroke="var(--about-ink)"
                    strokeWidth="2"
                  />
                  <path
                    d="M48 77V35m0 22q-20-25-24-12m24 20q22-23 29-9"
                    stroke="var(--about-ink)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <span className="about-composition-script handwritten">
                a little art, every day.
              </span>
            </div>
          )}
        </div>
      )}
      <figcaption>
        {valid && image
          ? image.caption?.[language] || image.alt[language]
          : !demo
            ? t(
                "تصویر در دسترس نیست؛ متن معرفی همچنان قابل مطالعه است.",
                "The image is unavailable; the introduction remains readable.",
              )
            : kind === "hero"
              ? t(
                  "Demo · جای‌نگهدار ترکیب اثر هنری و محصول؛ عکس واقعی برند ارائه نشده است.",
                  "Demo · Artwork-and-product composition placeholder; no actual brand photo supplied.",
                )
              : kind === "overview"
                ? t(
                    "Demo · محل تصویر عمومی و تأییدشده اثر یا محصول.",
                    "Demo · Space for an approved public artwork or product image.",
                  )
                : kind === "products"
                  ? t(
                      "Demo · ماکت آموزشی؛ نه تصویر SKU یا گزینه قابل خرید.",
                      "Demo · Illustrative mockup, not a SKU image or purchasable option.",
                    )
                  : t(
                      "بخش اختیاری؛ نیازمند تصویر و کپشن واقعی و تأییدشده.",
                      "Optional section; requires a real, approved image and caption.",
                    )}
      </figcaption>
    </figure>
  )
}
interface RouteIconProps {
  kind: string
}
function RouteIcon({ kind }: RouteIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "products" ? (
        <>
          <path d="M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1" />
          <path d="M9 12h6" />
        </>
      ) : kind === "artworks" ? (
        <>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M7 6h10v12H7ZM7 16l4-5 6 5" />
          <circle cx="14" cy="9" r="1" />
        </>
      ) : (
        <>
          <path d="m5 17 12-12 3 3L8 20H4l1-3ZM14 8l3 3M5 17l3 3" />
          <path d="M4 4h6m-6 0v6" />
        </>
      )}
    </svg>
  )
}
interface AboutProps {
  language: 0 | 1
  mode: string
  onMode: (mode: string) => void
  onNavigate: (name: string, route: string) => void
  arrow: ReactNode
  renderMedia: (color: string, kind: string) => ReactNode
  content?: AboutContent
}
export default function AboutPage({
  language,
  mode,
  onMode,
  onNavigate,
  arrow,
  renderMedia,
  content = aboutDemoContent,
}: AboutProps) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  const featured =
    mode === "no-collections"
      ? []
      : featuredAboutCollections(
          content.selectedCollections,
          language,
          content.demo,
          content.approvedCollectionIds,
        )
  const translationMissing =
    mode === "translation" ||
    !content.languages.includes(language === 0 ? "fa" : "en")
  const published = content.demo || content.published
  const loading = mode === "loading"
  const error = mode === "dynamic-error"
  const link = (
    fa: string,
    en: string,
    route: string,
    className = "text-link",
  ) => (
    <a
      href={route}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return
        event.preventDefault()
        onNavigate(t(fa, en), route)
      }}
    >
      {t(fa, en)}
      {className ? arrow : null}
    </a>
  )
  const retry = () => {
    onMode("loading")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => onMode("normal"), 600)
  }
  const media = (kind: MediaProps["kind"], image?: AboutImage) =>
    !content.demo && !approvedAboutImage(image) ? null : (
      <AboutMedia
        language={language}
        kind={kind}
        image={image}
        demo={content.demo}
        failed={mode === "image-error"}
        renderMedia={renderMedia}
      />
    )
  return (
    <div className="about-page">
      <div className="container">
        <nav
          className="breadcrumb about-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          {link("خانه", "Home", "/", "")}
          <span>/</span>
          <span aria-current="page">{t("درباره ما", "About")}</span>
        </nav>
        {content.demo && (
          <div className="about-demo-note">
            <span>PUB–18 / DEMO</span>
            <p>
              {t(
                "متن معرفی نمونه، نیازمند تأیید برند · تصویرهای جای‌نگهدار، عکس واقعی نیل‌آرت نیستند.",
                "Sample introduction, subject to brand approval · Placeholder images are not real NilArt photography.",
              )}
            </p>
          </div>
        )}
        {translationMissing || !published ? (
          <section className="about-unavailable">
            <h1>{t("درباره نیل‌آرت", "About NilArt")}</h1>
            <h2>
              {translationMissing
                ? t(
                    "این صفحه هنوز به زبان انتخاب‌شده منتشر نشده است.",
                    "This page hasn't been published in the selected language yet.",
                  )
                : t(
                    "معرفی برند هنوز منتشر نشده است.",
                    "The brand introduction hasn't been published yet.",
                  )}
            </h2>
            <p>
              {t(
                "محتوای تأییدنشده یا ترجمه حدسی نمایش داده نمی‌شود.",
                "Unapproved content or guessed translation is not displayed.",
              )}
            </p>
            <div className="hero-buttons">
              {translationMissing && content.languages[0] && (
                <button
                  className="button primary"
                  onClick={() => {
                    onMode("normal")
                    onNavigate(
                      content.languages[0] === "fa"
                        ? t("نسخه فارسی", "Persian version")
                        : t("نسخه انگلیسی", "English version"),
                      `/${content.languages[0]}/about`,
                    )
                  }}
                >
                  {content.languages[0] === "fa"
                    ? t("مشاهده نسخه فارسی", "View Persian version")
                    : t("مشاهده نسخه انگلیسی", "View English version")}
                </button>
              )}
              {link("تماس با ما", "Contact us", "/contact", "button secondary")}
            </div>
          </section>
        ) : (
          <>
            <section
              className={`about-hero ${
                !content.demo && !approvedAboutImage(content.heroImage)
                  ? "about-text-only"
                  : ""
              }`}
            >
              <div className="about-hero-copy">
                <span className="guide-kicker">
                  <span className="tiny-line" />
                  {t("درباره دنیای نیل‌آرت", "THE WORLD OF NILART")}
                </span>
                <h1>{content.title[language]}</h1>
                <p>{content.introduction[language]}</p>
                <div className="hero-buttons">
                  {link(
                    "کشف کالکشن‌ها",
                    "Explore collections",
                    "/collections",
                    "button primary",
                  )}
                  {link(
                    "دیدن نقاشی‌ها",
                    "Explore artworks",
                    "/artworks",
                    "button secondary",
                  )}
                </div>
                <div className="about-hero-signature">
                  <span className="handwritten">art & everyday.</span>
                  <span>
                    {t(
                      "کالکشن · محصول · نقاشی",
                      "COLLECTIONS · PRODUCTS · ARTWORKS",
                    )}
                  </span>
                </div>
              </div>
              <div className="about-hero-visual">
                {loading ? (
                  <div
                    className="skeleton about-hero-skeleton"
                    aria-busy="true"
                  >
                    <span className="sr-only">
                      {t("بارگذاری تصویر معرفی", "Loading introduction image")}
                    </span>
                  </div>
                ) : (
                  media("hero", content.heroImage)
                )}
              </div>
            </section>
            <section className="about-overview about-section">
              <div className="about-section-label">
                <span>01 / {t("نیل‌آرت", "NILART")}</span>
              </div>
              <div
                className={`about-overview-grid ${
                  !content.demo && !approvedAboutImage(content.overviewImage)
                    ? "about-text-only"
                    : ""
                }`}
              >
                <div className="about-overview-copy">
                  <h2>{t("نیل‌آرت چیست؟", "What is Nilart?")}</h2>
                  {loading ? (
                    <div className="about-copy-skeleton" aria-busy="true">
                      <span className="sr-only">
                        {t("بارگذاری معرفی", "Loading overview")}
                      </span>
                      <div className="skeleton" />
                      <div className="skeleton" />
                      <div className="skeleton" />
                    </div>
                  ) : (
                    content.overview.map((paragraph) => (
                      <p key={paragraph[1]}>{paragraph[language]}</p>
                    ))
                  )}
                  <div className="about-inventory-note">
                    <span aria-hidden="true" />
                    <p>
                      {t(
                        "محصولات فروشگاهی از موجودی آماده‌اند؛ اجرای نقاشی سفارشی، مسیر جداگانه‌ای دارد.",
                        "Shop products are sold from ready stock; commissioned artwork follows a separate production process.",
                      )}
                    </p>
                  </div>
                </div>
                <div className="about-overview-visual">
                  {media("overview", content.overviewImage)}
                </div>
              </div>
            </section>
            <section className="about-section about-paths">
              <div className="about-section-label">
                <span>02 / {t("مسیرهای کشف", "WAYS TO EXPLORE")}</span>
              </div>
              <div className="about-section-title">
                <h2>
                  {t(
                    "سه مسیر، یک دنیای هنری",
                    "Three paths, one creative world",
                  )}
                </h2>
                <p>
                  {t(
                    "از انتخابی برای روزمره تا اثری برای خودتان.",
                    "From something for everyday life to a piece of your own.",
                  )}
                </p>
              </div>
              <div className="about-route-grid">
                {content.routes.map((route, index) => (
                  <article
                    className={`about-route-card about-route-${route.id}`}
                    key={route.id}
                  >
                    <div className="about-route-top">
                      <span className="about-route-icon">
                        <RouteIcon kind={route.id} />
                      </span>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3>{route.title[language]}</h3>
                    <p>{route.description[language]}</p>
                    {link(route.cta[0], route.cta[1], route.route)}
                  </article>
                ))}
              </div>
            </section>
            <section className="about-section about-collections">
              <div className="about-section-label">
                <span>03 / {t("کالکشن‌ها", "COLLECTIONS")}</span>
              </div>
              <div className="about-section-title">
                <div>
                  <h2>{t("از یک موضوع شروع کنید", "Start with a theme")}</h2>
                  <p>
                    {t(
                      "یک کالکشن می‌تواند چند نوع محصول داشته باشد؛ موضوع موردعلاقه‌تان را انتخاب کنید و محصولات مرتبط را ببینید.",
                      "A collection can bring together different product types. Choose a theme and explore its related products.",
                    )}
                  </p>
                </div>
                {link("همه کالکشن‌ها", "All collections", "/collections")}
              </div>
              {error ? (
                <div className="about-dynamic-error" role="alert">
                  <h3>
                    {t(
                      "دریافت بخشی از محتوا ممکن نشد.",
                      "Some content could not be loaded.",
                    )}
                  </h3>
                  <p>
                    {t(
                      "بخش کالکشن‌های منتخب فعلاً در دسترس نیست؛ سایر بخش‌های معرفی همچنان قابل مطالعه‌اند.",
                      "Featured collections are unavailable right now; the rest of the introduction remains readable.",
                    )}
                  </p>
                  <button className="button secondary" onClick={retry}>
                    {t("تلاش دوباره", "Try again")}
                  </button>
                  {link("فروشگاه", "Shop", "/shop")}
                </div>
              ) : loading ? (
                <div className="about-collection-grid" aria-busy="true">
                  <span className="sr-only">
                    {t("بارگذاری کالکشن‌ها", "Loading collections")}
                  </span>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <CollectionSkeleton key={i} />
                  ))}
                </div>
              ) : featured.length ? (
                <div className="about-collection-grid">
                  {featured.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      language={language}
                      onNavigate={onNavigate}
                      arrow={arrow}
                      forceFallback={mode === "image-error"}
                      media={
                        <div
                          className={`about-collection-placeholder ${collection.color}`}
                        >
                          <svg
                            width="90"
                            height="90"
                            viewBox="0 0 100 100"
                            fill="none"
                            stroke="var(--mock-ink)"
                            strokeWidth="1"
                            aria-hidden="true"
                          >
                            <circle cx="50" cy="50" r="35" />
                            <path d="M15 55q35-65 70 0M15 65q35-45 70 0M35 15q-35 35 0 70m30-70q35 35 0 70" />
                            <circle cx="50" cy="50" r="14" />
                          </svg>
                        </div>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="about-no-collections">
                  <p>
                    {t(
                      "فعلاً کالکشن منتشرشده‌ای برای معرفی در این بخش نداریم؛ از فروشگاه شروع کنید.",
                      "There are no published collections to feature here right now; start with the shop.",
                    )}
                  </p>
                  {link("رفتن به فروشگاه", "Visit the shop", "/shop")}
                </div>
              )}
            </section>
            <section
              className={`about-section about-design-products ${
                !content.demo && !approvedAboutImage(content.productImage)
                  ? "about-text-only"
                  : ""
              }`}
            >
              <div className="about-design-visual">
                {media("products", content.productImage)}
              </div>
              <div className="about-design-copy">
                <span className="about-section-label">
                  04 / {t("از طرح تا محصول", "FROM DESIGN TO PRODUCT")}
                </span>
                <h2>
                  {t("یک طرح، چند انتخاب", "One design, different choices")}
                </h2>
                <p>
                  {t(
                    "در صفحه هر محصول، گزینه‌های فعال مانند سایز یا نوع جلد و موجودی همان ترکیب را بررسی کنید.",
                    "On each product page, check the available options, such as size or cover type, and the stock for that combination.",
                  )}
                </p>
                <p className="about-product-note">
                  {t(
                    "کالکشن موضوع هنری است، نه نوع محصول. برای دفتر، گرماژ ویژگی کاغذ است و تعداد برگ با تعداد دفتر خریداری‌شده فرق دارد؛ گزینه ناموجود قابل خرید نیست.",
                    "A collection is a visual theme, not a product type. For notebooks, paper weight is a paper property and sheet count differs from notebook quantity; out-of-stock options aren't available to buy.",
                  )}
                </p>
                {link(
                  "مشاهده گزینه‌ها در فروشگاه",
                  "Explore options in the shop",
                  "/shop",
                )}
              </div>
            </section>
            {visibleAboutStory(content.story, language) && content.story ? (
              <section className="about-section about-real-story">
                <h2>{content.story.title[language]}</h2>
                {content.story.paragraphs.map((paragraph) => (
                  <p key={paragraph[1]}>{paragraph[language]}</p>
                ))}
                {content.story.image &&
                  approvedAboutImage(content.story.image) &&
                  media("story", content.story.image)}
              </section>
            ) : mode === "story-slot" && content.demo ? (
              <section className="about-section about-story-slot">
                <div>
                  <span className="guide-kicker">
                    {t(
                      "بخش اختیاری؛ نیازمند محتوای تأییدشده",
                      "OPTIONAL · APPROVED CONTENT REQUIRED",
                    )}
                  </span>
                  <h2>{t("داستان نیل‌آرت", "The Nilart story")}</h2>
                  <p>
                    {t(
                      "این بخش تنها با داستان واقعی و تصویر عمومی تأییدشده منتشر می‌شود: انگیزه شروع، نگاه هنری یا روش انتخاب طرح‌ها. در نسخه فعلی داستانی ساخته نشده است.",
                      "Publish this section only with a real story and approved public imagery: the motivation, artistic outlook or design-selection process. No story has been invented for this version.",
                    )}
                  </p>
                </div>
                {media("story")}
              </section>
            ) : null}
            <section className="about-section about-principles">
              <div className="about-section-label">
                <span>05 / {t("تجربه نیل‌آرت", "THE NILART EXPERIENCE")}</span>
              </div>
              <h2>
                {t(
                  "برای یک انتخاب روشن‌تر",
                  "A little clarity for your next choice",
                )}
              </h2>
              <div className="about-principle-grid">
                {content.principles.map((principle, index) => (
                  <div key={principle.title[1]}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <h3>{principle.title[language]}</h3>
                    <p>{principle.description[language]}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="about-final-cta">
              <span className="guide-kicker">
                {t("حالا، نوبت انتخاب شماست", "NOW, MAKE IT YOUR OWN")}
              </span>
              <h2>
                {t("از کجا شروع می‌کنید؟", "Where would you like to start?")}
              </h2>
              <div className="hero-buttons">
                {link(
                  "کشف کالکشن‌ها",
                  "Explore collections",
                  "/collections",
                  "button primary",
                )}
                {link(
                  "سفارش نقاشی سفارشی",
                  "Commission an artwork",
                  "/commissions/new",
                  "button secondary",
                )}
              </div>
              {link(
                "پرسشی دارید؟ با ما تماس بگیرید",
                "Have a question? Contact us",
                "/contact",
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
