import { collections, type Collection } from "./data"

export type AboutText = readonly [string, string]
export interface AboutImage {
  src: string
  alt: AboutText
  caption?: AboutText
  public: boolean
  approved: boolean
}
export interface AboutStory {
  published: boolean
  languages: readonly ("fa" | "en")[]
  title: AboutText
  paragraphs: AboutText[]
  image?: AboutImage
}
export interface AboutRouteCard {
  id: string
  title: AboutText
  description: AboutText
  cta: AboutText
  route: string
}
export interface AboutContent {
  demo: boolean
  published: boolean
  languages: readonly ("fa" | "en")[]
  title: AboutText
  introduction: AboutText
  overview: AboutText[]
  heroImage?: AboutImage
  overviewImage?: AboutImage
  productImage?: AboutImage
  story?: AboutStory
  selectedCollections: Collection[]
  approvedCollectionIds?: readonly string[]
  routes: AboutRouteCard[]
  principles: AboutPrinciple[]
}
interface AboutPrinciple {
  title: AboutText
  description: AboutText
}
// Supplied design copy, not a claimed history or approved brand publication.
export const aboutDemoContent: AboutContent = {
  demo: true,
  published: false,
  languages: ["fa", "en"],
  title: ["هنر، نزدیک‌تر به زندگی روزمره", "Art, closer to everyday life"],
  introduction: [
    "در نیل‌آرت، کالکشن‌های هنری را روی محصولات کاربردی کشف کنید، نقاشی‌های آماده را ببینید یا برای یک اثر شخصی سفارش بدهید.",
    "Explore art collections on everyday products, discover original artworks, or commission a personal piece.",
  ],
  overview: [
    [
      "نیل‌آرت جایی برای کشف طرح‌ها و آثار هنری در قالب کالکشن، محصول و نقاشی است.",
      "Nilart brings together collections, products and artworks.",
    ],
    [
      "می‌توانید از یک موضوع شروع کنید و محصولات مرتبط را ببینید، یا از نوع محصول وارد شوید و گزینه مناسب خود را انتخاب کنید.",
      "Start with a theme to explore related products, or browse by product type to find the option that suits you.",
    ],
  ],
  selectedCollections: collections,
  routes: [
    {
      id: "products",
      title: ["محصولات هنری", "Art-inspired products"],
      description: [
        "محصولات را بر اساس کالکشن یا دسته ببینید و گزینه‌های موجود را انتخاب کنید. پکیج‌ها هم در این مسیر قابل کشف‌اند.",
        "Browse by collection or category and choose from available product options. Bundles are part of this path too.",
      ],
      cta: ["رفتن به فروشگاه", "Visit the shop"],
      route: "/shop",
    },
    {
      id: "artworks",
      title: ["نقاشی‌های آماده", "Original artworks"],
      description: [
        "آثار موجود را با مشخصات و شرایط همان اثر بررسی کنید.",
        "Explore available artworks and their individual details.",
      ],
      cta: ["دیدن آثار", "Explore artworks"],
      route: "/artworks",
    },
    {
      id: "commissions",
      title: ["نقاشی سفارشی", "Custom artwork"],
      description: [
        "ایده، تصویر و ترجیحات خود را برای بررسی و دریافت پیشنهاد ثبت کنید.",
        "Submit your idea, image and preferences for review and a proposal.",
      ],
      cta: ["شروع سفارش سفارشی", "Start a commission"],
      route: "/commissions/new",
    },
  ],
  principles: [
    {
      title: ["انتخاب روشن", "Clear choices"],
      description: [
        "گزینه‌ها، قیمت و موجودی را در صفحه محصول بررسی کنید.",
        "Review options, price and availability on the product page.",
      ],
    },
    {
      title: ["مسیرهای خرید متفاوت", "Different ways to buy"],
      description: [
        "خرید کالای آماده، نقاشی آماده و سفارش سفارشی مسیرهای مشخص خود را دارند.",
        "Ready-made products, original artworks and commissions have distinct purchase journeys.",
      ],
    },
    {
      title: ["همراهی در پیگیری", "Help with your order"],
      description: [
        "برای وضعیت سفارش و پرسش‌های مرتبط، مسیر پیگیری و پشتیبانی در دسترس است.",
        "Order tracking and support are available for order-related questions.",
      ],
    },
  ],
}
export function isAboutRoute(route: string) {
  return ["/about", "/fa/about", "/en/about"].includes(route.split(/[?#]/)[0])
}
export function approvedAboutImage(image?: AboutImage) {
  if (!image?.approved || !image.public || !image.alt[0] || !image.alt[1])
    return false
  return /^\/(?!\/)/.test(image.src) || /^https:\/\//.test(image.src)
}
export function featuredAboutCollections(
  items: Collection[],
  language: 0 | 1,
  demo: boolean,
  approvedCollectionIds: readonly string[] = [],
) {
  return items
    .filter(
      (item) =>
        item.published &&
        Boolean(item.name[language]) &&
        (demo ||
          (approvedCollectionIds.includes(item.id) &&
            Boolean(item.image) &&
            Boolean(item.imageAlt[language]))),
    )
    .slice(0, 5)
}
export function visibleAboutStory(
  story: AboutStory | undefined,
  language: 0 | 1,
) {
  return Boolean(
    story?.published &&
      story.languages.includes(language === 0 ? "fa" : "en") &&
      story.title[language] &&
      story.paragraphs.length &&
      story.paragraphs.every((paragraph) => paragraph[language]),
  )
}
