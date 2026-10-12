export type Localized = [string, string]
// Live is the default. Fixtures are opt-in for design comparison only.
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true"
export type Collection = {
  id: string
  slug: string
  published: boolean
  name: Localized
  originalName: string
  color: string
  caption: Localized
  description?: Localized
  image?: string
  imageAlt: Localized
}
export const collectionName = (collection: Collection, language: 0 | 1) =>
  collection.name[language] || collection.originalName
export const demoCollections: Collection[] = [
  {
    id: "cats",
    slug: "gorbe",
    published: true,
    name: ["گربه", "Cats"],
    originalName: "گربه",
    color: "sage",
    caption: ["همه محصولات کالکشن گربه", "Explore the Cats collection"],
    description: [
      "همراه گربه‌ها بنویس، طراحی کن و به روزمره‌ات رنگ بده. همه محصولات و پکیج‌های این کالکشن را اینجا ببین.",
      "Write, draw, and brighten your everyday life with cats. Explore this collection's products and bundles in one place.",
    ],
    imageAlt: ["محصولات کالکشن گربه", "Cats collection products"],
  },
  {
    id: "ghosts",
    slug: "roh",
    published: true,
    name: ["روح", "Ghosts"],
    originalName: "روح",
    color: "lilac",
    caption: ["همه محصولات کالکشن روح", "Explore the Ghosts collection"],
    imageAlt: ["محصولات کالکشن روح", "Ghosts collection products"],
  },
  {
    id: "cows",
    slug: "gav",
    published: true,
    name: ["گاو", "Cows"],
    originalName: "گاو",
    color: "sand",
    caption: ["همه محصولات کالکشن گاو", "Explore the Cows collection"],
    imageAlt: ["محصولات کالکشن گاو", "Cows collection products"],
  },
  {
    id: "qolche",
    slug: "qolche",
    published: true,
    name: ["qolche", "qolche"],
    originalName: "qolche",
    color: "blue",
    caption: ["محصولات این کالکشن را ببین", "Explore this collection"],
    imageAlt: ["محصولات کالکشن qolche", "qolche collection products"],
  },
  {
    id: "love",
    slug: "love",
    published: true,
    name: ["Love", "Love"],
    originalName: "Love",
    color: "rose",
    caption: ["محصولات این کالکشن را ببین", "Explore this collection"],
    imageAlt: ["محصولات کالکشن Love", "Love collection products"],
  },
]
export const defaultCollectionDescription: Localized = [
  "دنیای تصویری محبوبت را به روزمره بیاور. همه محصولات و پکیج‌های این کالکشن را اینجا ببین.",
  "Bring your favorite visual world into everyday life. Explore this collection’s products and bundles in one place.",
]
export const demoProducts = [
  {
    id: "cats-sketchbook-127gsm",
    name: ["دفتر طراحی ۱۲۷ گرم", "127 gsm sketchbook"] as Localized,
    collection: 0,
    kind: "book",
    options: "A4 · A5 · A6",
    price: 125000,
    available: true,
  },
  {
    id: "notebook-ghosts",
    name: ["دفتر خط‌دار", "Ruled notebook"] as Localized,
    collection: 1,
    kind: "book",
    options: "A5 · A6",
    price: 145000,
    available: true,
  },
  {
    id: "sticker-cows",
    name: ["ست استیکر", "Sticker set"] as Localized,
    collection: 2,
    kind: "stickers",
    options: "",
    price: 45000,
    available: true,
  },
  {
    id: "bookmark-love",
    name: ["نشانک", "Bookmark"] as Localized,
    collection: 4,
    kind: "bookmark",
    options: "",
    price: 0,
    available: false,
  },
]
export const demoCategories: {
  id: string
  name: Localized
  kind: string
  color: string
}[] = [
  {
    id: "sketchbooks",
    name: ["دفتر طراحی", "Sketchbooks"],
    kind: "book",
    color: "sand",
  },
  {
    id: "notebooks",
    name: ["دفتر خط‌دار", "Notebooks"],
    kind: "book",
    color: "sage",
  },
  {
    id: "stickers",
    name: ["استیکر", "Stickers"],
    kind: "stickers",
    color: "lilac",
  },
  {
    id: "bookmarks",
    name: ["نشانک", "Bookmarks"],
    kind: "bookmark",
    color: "rose",
  },
]
export const collections = demoMode ? demoCollections : []
export const products = demoMode ? demoProducts : []
export const categories = demoMode ? demoCategories : []
