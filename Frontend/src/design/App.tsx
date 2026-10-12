import CheckoutPaymentPage from "./CheckoutPaymentPage"
import DashboardPage from "./DashboardPage"
import ReceiptPage from "./ReceiptPage"
import CancellationPage from "./CancellationPage"
import ReturnRequestPage from "./ReturnRequestPage"
import RequestStatusPage from "./RequestStatusPage"
import DownloadsPage from "./DownloadsPage"
import ArtworkReviewPage from "./ArtworkReviewPage"
import FavoritesPage from "./FavoritesPage"
import AddressesPage from "./AddressesPage"
import ProfilePage from "./ProfilePage"
import SecurityPage from "./SecurityPage"
import AccountPreferencesPage from "./AccountPreferencesPage"
import SupportPage from "./SupportPage"
import SupportConversationPage from "./SupportConversationPage"
import NotificationsPage from "./NotificationsPage"
import { clearNotificationsDemo, syncNotificationsSession } from "./notifications"
import { clearConversationHandoffs } from "./support-conversation"
import { activeAttempt, emptyPayment, isPaymentRoute } from "./payment"
import { requestDemoDelivery, deliveryContext } from "./delivery"
import { evaluateCart } from "./cart"
import CheckoutDeliveryPage from "./CheckoutDeliveryPage"
import { emptyDelivery } from "./delivery"
import CheckoutAddressPage from "./CheckoutAddressPage"
import AuthPage from "./AuthPage"
import { isAuthRoute } from "./auth"
import { demoAddresses } from "./address"
import {
  lazy,
  Suspense,
  useEffect,
  useCallback,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { categories as demoCategories, collections as demoCollections, products as demoProducts, demoMode, type Localized } from "./data"
import { homepageProducts, useLiveCatalog } from "../features/catalog/adapter"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import CollectionCard, { CollectionSkeleton } from "./CollectionCard"
import CollectionsPage from "./CollectionsPage"
import CollectionDetailPage from "./CollectionDetailPage"
import ShopPage from "./ShopPage"
import LiveArtworksPage from "../features/catalog/LiveArtworksPage"
import LiveShopPage from "../features/catalog/LiveShopPage"
import { isShopRoute } from "./shop"
import ProductCard from "./ProductCard"
import { mergeCart, productSlug, type CartLine } from "./product"
import {
  bundleSlug,
  startingBundleQuote,
  type BundleCartLine,
  type BundleDraft,
} from "./bundle"
import BundleStillLife from "./BundleStillLife"
import BuyingGuide from "./BuyingGuide"
import FAQPage from "./FAQPage"
import TrackingPage from "./TrackingPage"
import ReturnsPage from "./ReturnsPage"
import AboutPage from "./AboutPage"
import { isAboutRoute } from "./about"
import ContactPage from "./ContactPage"
import { contactPreviewModes, isContactRoute } from "./contact"
import TermsPage from "./TermsPage"
import { isTermsRoute } from "./terms"
import ArtworksPage from "./ArtworksPage"
import ArtworkDetailPage from "./ArtworkDetailPage"
import CommissionsPage from "./CommissionsPage"
import { isCommissionRoute } from "./commissions"
import ReferencesPage, { type ReferenceNavigationGuard } from "./ReferencesPage"
import { isReferencesRoute, type ReferenceDraft } from "./references"
import PreferencesPage from "./PreferencesPage"
import { isPreferencesRoute, type PreferencesDraft } from "./preferences"
import AssessmentPage from "./AssessmentPage"
import { isAssessmentRoute, assessmentDemoReference, assessmentDemoPreferences, type AssessmentJob } from "./assessment"
import { demoJobStatus, createDemoJob } from "./assessment"
import QuotePage from "./QuotePage"
import { isQuoteRoute, demoQuote, payableQuote, acceptanceMatches, quoteCartLine, quoteMatches, commissionCartId, type CommissionQuote, type QuoteAcceptance } from "./quote"
import { isReturnsRoute } from "./returns"
import { isTrackingRoute, trackingPreviewModes } from "./tracking"
import {
  canStoreCartItem,
  cartOverrides,
  demoCart,
  shoppingLines,
  type ArtCartLine,
  type EvaluatedLine,
  type ShoppingLine,
} from "./cart"
const ProductDetailPage = lazy(() => import("./ProductDetailPage"))
const BundleDetailPage = lazy(() => import("./BundleDetailPage"))
const CartPage = lazy(() => import("./CartPage"))
const CheckoutPage = lazy(() => import("./CheckoutPage"))
import {
  checkoutFixture,
  mergeCheckoutCarts,
  parseCheckoutIds,
  type CheckoutSession,
} from "./checkout"

type IconName = "arrow" | "search" | "bag" | "user" | "menu" | "close" | "heart" | "check" | "box" | "book" | "plus"
interface IconProps {
  name: IconName
  size?: number
}
interface TrustItem {
  icon: IconName
  title: Localized
  desc: Localized
}
interface RemovedCartItem {
  line: ShoppingLine
  index: number
}
interface CheckoutMergeNotice {
  candidate: import("./cart").CartSnapshot
  changes: number
  conflicts: number
}
function Icon({ name, size = 22 }: IconProps) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M19 12H5m6-6-6 6 6 6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    heart: (
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />
    ),
    check: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    box: (
      <>
        <path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l9 4" />
      </>
    ),
    book: (
      <>
        <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={name === "arrow" ? "direction-arrow" : ""}
    >
      {paths[name]}
    </svg>
  )
}

// Original abstract mockups, not NilArt artwork. Replace this surface with brand photography.
function Mockup({
  color = "sage",
  kind = "book",
  hero = false,
}: {
  color?: string
  kind?: string
  hero?: boolean
}) {
  return (
    <div
      className={`mockup ${color} ${hero ? "hero-mockup" : ""}`}
      role="img"
      aria-label="ماکت نمونه محصول؛ تصویر واقعی برند ارائه نشده / Sample product mockup, not brand artwork"
    >
      <svg viewBox={hero ? "0 0 640 550" : "0 0 400 350"} aria-hidden="true">
        <defs>
          <filter
            id={`shadow-${color}-${kind}-${hero}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="5"
              dy="14"
              stdDeviation="13"
              floodColor="#211E1A"
              floodOpacity=".15"
            />
          </filter>
          <pattern
            id={`paper-${color}-${kind}-${hero}`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r=".5" fill="#211E1A" opacity=".06" />
          </pattern>
        </defs>
        {hero && (
          <>
            <ellipse
              cx="320"
              cy="500"
              rx="240"
              ry="26"
              fill="#75634b"
              opacity=".08"
            />
            <g transform="translate(447 65) rotate(17)">
              <path d="M0 0h55v265H0z" fill="#f2e8d6" />
              <path d="M8 0h39v260H8z" fill="#b5beb0" />
              <circle cx="27" cy="34" r="7" fill="#f2e8d6" />
              <path
                d="M27 50v148M27 95q-28-20-15-35q24 8 15 35M27 140q30-22 17-42q-25 9-17 42"
                stroke="#5a715f"
                fill="none"
                strokeWidth="2"
              />
            </g>
          </>
        )}
        <g
          transform={
            hero
              ? "translate(80 70) rotate(-9 160 210)"
              : "translate(88 38) rotate(-8 110 140)"
          }
          filter={`url(#shadow-${color}-${kind}-${hero})`}
        >
          {kind === "book" || hero ? (
            <>
              <rect
                x="6"
                y="6"
                width={hero ? 295 : 223}
                height={hero ? 395 : 275}
                rx="4"
                fill="#e7ded0"
              />
              <rect
                width={hero ? 295 : 220}
                height={hero ? 390 : 270}
                rx="5"
                fill="var(--mock-cover)"
              />
              <rect
                width={hero ? 295 : 220}
                height={hero ? 390 : 270}
                rx="5"
                fill={`url(#paper-${color}-${kind}-${hero})`}
              />
              <path
                d={hero ? "M18 0v390" : "M14 0v270"}
                stroke="#fff"
                opacity=".35"
              />
              <circle
                cx={hero ? 150 : 112}
                cy={hero ? 155 : 100}
                r={hero ? 66 : 48}
                fill="var(--mock-ink)"
                opacity=".85"
              />
              <path
                d={
                  hero
                    ? "M65 285Q105 110 190 260Q215 320 260 200v150H55Z"
                    : "M42 197Q80 85 140 184q30 48 60-33v92H38Z"
                }
                fill="var(--mock-paper)"
              />
              <path
                d={
                  hero
                    ? "M115 290q30-130 85-85M150 260l-22-40M162 240l30-10"
                    : "M82 208q23-86 62-64M106 184l-16-29M116 168l22-8"
                }
                fill="none"
                stroke="var(--mock-ink)"
                strokeWidth="2"
              />
              <text
                x={hero ? 147 : 110}
                y={hero ? 350 : 246}
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontSize={hero ? 12 : 9}
                letterSpacing="4"
                fill="var(--mock-ink)"
              >
                A LITTLE WORLD
              </text>
            </>
          ) : kind === "bookmark" ? (
            <>
              <rect
                x="48"
                y="0"
                width="90"
                height="270"
                rx="3"
                fill="var(--mock-cover)"
              />
              <circle cx="93" cy="18" r="5" fill="#fff" />
              <path
                d="M93 20q-20-65 15-42"
                fill="none"
                stroke="var(--mock-ink)"
                strokeWidth="3"
              />
              <circle cx="93" cy="97" r="28" fill="var(--mock-ink)" />
              <path d="M60 222q35-150 65-32v60H60" fill="var(--mock-paper)" />
            </>
          ) : (
            <>
              <rect width="220" height="265" rx="5" fill="#fffdf8" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <g
                  key={i}
                  transform={`translate(${25 + (i % 2) * 105} ${25 + Math.floor(i / 2) * 83})`}
                >
                  <rect
                    width="66"
                    height="65"
                    rx={i % 2 ? 30 : 8}
                    fill="var(--mock-cover)"
                  />
                  <circle cx="32" cy="27" r="16" fill="var(--mock-ink)" />
                  <path d="M8 56q25-48 50 0" fill="var(--mock-paper)" />
                </g>
              ))}
            </>
          )}
        </g>
        {hero && (
          <>
            <g
              transform="translate(357 328) rotate(12)"
              filter={`url(#shadow-${color}-${kind}-${hero})`}
            >
              <rect width="182" height="156" rx="4" fill="#fffdf6" />
              <circle cx="51" cy="47" r="26" fill="#c78565" />
              <path d="M107 19h51v58h-51z" fill="#8b9d87" />
              <path d="M25 119q35-72 70 0Z" fill="#6f8479" />
              <path d="M115 95h42v38h-42z" fill="#d7b97e" />
            </g>
            <path
              d="m551 244-23 160"
              stroke="#ac7555"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path d="m527 410-5 15-1-17" fill="#383429" />
          </>
        )}
      </svg>
      <span className="sample-label">SAMPLE MOCKUP</span>
    </div>
  )
}

function Modal({
  open,
  onClose,
  title,
  children,
  drawer = false,
  sheet = false,
  kind,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  drawer?: boolean
  sheet?: boolean
  kind?: "lightbox" | "guide" | "cart"
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const el = ref.current
    if (open && el && !el.open) {
      el.showModal()
      if (kind) el.querySelector<HTMLHeadingElement>("h2")?.focus()
    } else if (!open && el?.open) el.close()
  }, [open, kind])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={
        drawer
          ? "modal drawer"
          : sheet
            ? "modal filter-sheet"
            : `modal ${kind ? `product-dialog-${kind}` : ""}`
      }
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-head">
        <h2 id={titleId} tabIndex={kind ? -1 : undefined}>
          {title}
        </h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="بستن / Close"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export default function App() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const catsPreview = demoMode ? startingBundleQuote() : { price: 0, saving: 0, separate: 0, capacity: 0 }
  const [lang, setLang] = useState<0 | 1>(
    (pathname === "/en" || pathname.startsWith("/en/")) ||
    ["/en/track-order", "/en/returns", "/en/artworks", "/en/about", "/en/contact", "/en/commissions", "/en/commissions/new", "/en/terms"].includes(window.location.pathname) ||
      window.location.pathname.startsWith("/en/artworks/") ||
      window.location.pathname.startsWith("/en/auth/") ||
      window.location.pathname.startsWith("/en/account") ||
      window.location.pathname.startsWith("/en/commissions/new/") ||
      (isShopRoute(window.location.pathname) && window.location.pathname.startsWith("/en/"))
      ? 1
      : 0,
  )
  const t = (fa: string, en: string) => (lang === 0 ? fa : en)
  const local = (text: Localized) => text[lang]
  const [drawer, setDrawer] = useState(false)
  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState("")
  const [destination, setDestination] = useState<{
    name: string
    route: string
  } | null>(null)
  const [lab, setLab] = useState(false)
  const [guideMode, setGuideMode] = useState("normal")
  const [faqMode, setFaqMode] = useState("normal")
  const [trackingMode, setTrackingMode] = useState("initial")
  const [returnsMode, setReturnsMode] = useState("normal")
  const [aboutMode, setAboutMode] = useState("normal")
  const [contactMode, setContactMode] = useState("normal")
  const [termsMode, setTermsMode] = useState("normal")
  const [mode, setMode] = useState("normal")
  const [collectionsMode, setCollectionsMode] = useState("normal")
  const [detailMode, setDetailMode] = useState("normal")
  const [productMode, setProductMode] = useState("normal")
  const [productPreset, setProductPreset] = useState("")
  const [cart, setCart] = useState<CartLine[]>([])
  const [bundleCart, setBundleCart] = useState<BundleCartLine[]>([])
  const [artCart, setArtCart] = useState<ArtCartLine[]>([])
  const [cartMode, setCartMode] = useState("normal")
  const paymentDemoGeneration = useRef(0)
  const [paymentCheckout, setPaymentCheckout] = useState(emptyPayment)
  const [deliveryCheckout, setDeliveryCheckout] = useState(emptyDelivery)
  const [addressCheckout, setAddressCheckout] = useState(demoAddresses)
  const [checkoutMode, setCheckoutMode] = useState("normal")
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession>({
    status: "guest",
    demo: true,
  })
  const [checkoutIds, setCheckoutIds] = useState<string[] | null>(() =>
    parseCheckoutIds(window.location.search),
  )
  const [checkoutMerge, setCheckoutMerge] =
    useState<CheckoutMergeNotice | null>(null)
  const [cartLivePrices, setCartLivePrices] = useState<Record<string, number>>(
    {},
  )
  const [cartLiveStocks, setCartLiveStocks] = useState<Record<string, number>>(
    {},
  )
  const liveCartPrices = {
    ...cartOverrides(cartMode).prices,
    ...cartLivePrices,
  }
  const liveCartStocks = { ...cartOverrides(cartMode).stock, ...cartLiveStocks }
  const [cartCoupon, setCartCoupon] = useState("")
  const [cartUndo, setCartUndo] = useState<RemovedCartItem | null>(null)
  const [editingCartLine, setEditingCartLine] = useState<ShoppingLine | null>(
    null,
  )
  const [bundleMode, setBundleMode] = useState("normal")
  const [bundlePreset, setBundlePreset] = useState("")
  const [bundleDrafts, setBundleDrafts] = useState<Record<string, BundleDraft>>(
    {},
  )
  const saveBundleDraft = useCallback((slug: string, draft: BundleDraft) => {
    setBundleDrafts((previous) => {
      const old = previous[slug]
      if (
        old &&
        old.quantity === draft.quantity &&
        Object.keys(draft.selection).every(
          (key) =>
            old.selection[(key as keyof typeof draft.selection)] ===
            draft.selection[(key as keyof typeof draft.selection)],
        )
      )
        return previous
      return { ...previous, [slug]: draft }
    })
  }, [])
  const [signedIn, setSignedIn] = useState(false)
  const [referenceDraft, setReferenceDraft] = useState<ReferenceDraft | null>(null)
  const [preferencesDraft, setPreferencesDraft] = useState<PreferencesDraft | null>(null)
  const [assessmentJob, setAssessmentJob] = useState<AssessmentJob | null>(null)
  const [commissionQuote, setCommissionQuote] = useState<CommissionQuote | null>(null)
  const [quoteAcceptance, setQuoteAcceptance] = useState<QuoteAcceptance | null>(null)
  const referenceGuard = useRef<ReferenceNavigationGuard | null>(null)
  const registerReferenceGuard = useCallback((guard: ReferenceNavigationGuard | null) => { referenceGuard.current = guard }, [])
  useEffect(() => { if (!signedIn) setReferenceDraft(null) }, [signedIn])
  useEffect(() => { if (!signedIn) setPreferencesDraft(null) }, [signedIn])
  useEffect(() => { if (!signedIn) setAssessmentJob(null) }, [signedIn])
  useEffect(() => {
    if (!signedIn) {
      setCommissionQuote(null); setQuoteAcceptance(null)
      setArtCart(previous => previous.filter(line => !line.commissionAcceptance))
      return
    }
    setArtCart(previous => previous.map(line => {
      if (!line.commissionAcceptance || line.status === "expired") return line
      return quoteMatches(commissionQuote, assessmentJob, referenceDraft, preferencesDraft) &&
        acceptanceMatches(line.commissionAcceptance, commissionQuote) &&
        payableQuote(commissionQuote, assessmentJob, referenceDraft, preferencesDraft)
        ? line : { ...line, status: "expired" as const }
    }))
  }, [signedIn, referenceDraft, preferencesDraft, assessmentJob, commissionQuote])
  const [favorites, setFavorites] = useState<string[]>([])
  const [toast, setToast] = useState("")
  const [demoPage, setPage] = useState(
    /^\/(fa|en)\/account(?:\/.*)?$/.test(window.location.pathname) ||
    isAuthRoute(window.location.pathname) ||
    isShopRoute(window.location.pathname) ||
    window.location.pathname.startsWith("/collections") ||
      window.location.pathname.startsWith("/products/") ||
      window.location.pathname.startsWith("/bundles/") ||
      window.location.pathname === "/guides/buying" ||
      window.location.pathname === "/faq" ||
      isTrackingRoute(window.location.pathname) ||
      isReturnsRoute(window.location.pathname) ||
      isAboutRoute(window.location.pathname) ||
      isContactRoute(window.location.pathname) ||
      isTermsRoute(window.location.pathname) ||
      isCommissionRoute(window.location.pathname) ||
      isReferencesRoute(window.location.pathname) ||
      isPreferencesRoute(window.location.pathname) ||
      isAssessmentRoute(window.location.pathname) ||
      isQuoteRoute(window.location.pathname) ||
      /^(\/fa|\/en)?\/artworks(\/[^/]+)?$/.test(window.location.pathname) ||
      window.location.pathname === "/cart" ||
      (["/checkout", "/checkout/address", "/checkout/delivery"].includes(window.location.pathname) || isPaymentRoute(window.location.pathname))
      ? window.location.pathname
      : "/",
  )
  const [demoSearch, setUrlSearch] = useState(window.location.search)
  const page = demoMode ? demoPage : pathname
  const nextSearch = searchParams.toString()
  const urlSearch = demoMode ? demoSearch : nextSearch ? `?${nextSearch}` : ""
  useEffect(() => {
    if (demoMode) return
    if (pathname === "/en" || pathname.startsWith("/en/")) setLang(1)
    else if (pathname === "/" || pathname === "/fa" || pathname.startsWith("/fa/")) setLang(0)
    else if (searchParams.get("language") === "en") setLang(1)
    else if (searchParams.get("language") === "fa") setLang(0)
    setDrawer(false)
    setSearch(false)
    setDestination(null)
  }, [pathname, nextSearch, searchParams])
  const supportSessionRef = useRef(signedIn)
  useEffect(() => {
    if (isAuthRoute(page) || supportSessionRef.current !== signedIn) {
      clearConversationHandoffs()
    }
    if (isAuthRoute(page)) clearNotificationsDemo()
    else syncNotificationsSession(String(signedIn))
    supportSessionRef.current = signedIn
  }, [page, signedIn])
  const currentPageRef = useRef(page)
  currentPageRef.current = page
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCollections = page.startsWith("/collections")
  const isShop = isShopRoute(page)
  const isDetail = isCollections && page !== "/collections"
  const liveCatalog = useLiveCatalog(isDetail ? page.split("/")[2] : undefined)
  const collections = demoMode ? demoCollections : liveCatalog.data.collections
  const categories = demoMode ? demoCategories : liveCatalog.data.categories
  const products = demoMode ? demoProducts : homepageProducts(liveCatalog.data)
  const homeMode = demoMode ? mode : liveCatalog.status
  const homeCollectionsMode = demoMode ? mode : liveCatalog.collectionsStatus
  const isProduct = page.startsWith("/products/")
  const isBundle = page.startsWith("/bundles/")
  const isCart = page === "/cart"
  const isCheckout = ["/checkout", "/checkout/address", "/checkout/delivery"].includes(page) || isPaymentRoute(page)
  const isBuyingGuide = page === "/guides/buying"
  const isFAQ = page === "/faq"
  const isTracking = isTrackingRoute(page)
  const isReturns = isReturnsRoute(page)
  const isAbout = isAboutRoute(page)
  const isContact = isContactRoute(page)
  const isTerms = isTermsRoute(page)
  const isArtworks = /^(\/fa|\/en)?\/artworks$/.test(page)
  const isArtworkDetail = /^\/(fa|en)\/artworks\/[^/]+$/.test(page)
  const isCommissions = isCommissionRoute(page)
  const isReferences = isReferencesRoute(page)
  const isPreferences = isPreferencesRoute(page)
  const isAssessment = isAssessmentRoute(page)
  const isQuote = isQuoteRoute(page)
  const cartCount =
    cart.reduce((total, line) => total + line.quantity, 0) +
    bundleCart.reduce((total, line) => total + line.quantity, 0) +
    artCart.length
  useEffect(() => {
    if (!cartUndo) return
    const timer = setTimeout(() => setCartUndo(null), 10000)
    return () => clearTimeout(timer)
  }, [cartUndo])
  useEffect(() => {
    if (!demoMode) return
    const restore = () => {
      if (referenceGuard.current && !(/^\/(fa|en)\/account\/profile$/.test(currentPageRef.current) && /^\/(fa|en)\/account\/profile$/.test(window.location.pathname))) {
        let checking = true
        const allowed = referenceGuard.current(() => {
          if (!checking) { referenceGuard.current = null; window.history.back() }
        })
        checking = false
        if (!allowed) { window.history.forward(); return }
      }
      const state = window.history.state
      setPage(
        state?.page ||
          (/^\/(fa|en)\/account(?:\/.*)?$/.test(window.location.pathname) ||
          isAuthRoute(window.location.pathname) ||
          isShopRoute(window.location.pathname) ||
          window.location.pathname.startsWith("/collections") ||
          window.location.pathname.startsWith("/products/") ||
          window.location.pathname.startsWith("/bundles/") ||
          window.location.pathname === "/guides/buying" ||
          window.location.pathname === "/faq" ||
          isTrackingRoute(window.location.pathname) ||
          isReturnsRoute(window.location.pathname) ||
          isAboutRoute(window.location.pathname) ||
          isContactRoute(window.location.pathname) ||
          isTermsRoute(window.location.pathname) ||
          isCommissionRoute(window.location.pathname) ||
          isReferencesRoute(window.location.pathname) ||
          isPreferencesRoute(window.location.pathname) ||
          isAssessmentRoute(window.location.pathname) ||
          isQuoteRoute(window.location.pathname) ||
          /^(\/fa|\/en)?\/artworks(\/[^/]+)?$/.test(window.location.pathname) ||
          window.location.pathname === "/cart" ||
          (["/checkout", "/checkout/address", "/checkout/delivery"].includes(window.location.pathname) || isPaymentRoute(window.location.pathname))
            ? window.location.pathname
            : "/"),
      )
      setUrlSearch(
        state?.destination ? state.search || "" : window.location.search,
      )
      setDestination(state?.destination || null)
      if (/^\/(fa|en)\/account(?:\/.*)?$/.test(window.location.pathname))
        setLang(window.location.pathname.startsWith("/en/") ? 1 : 0)
      if (isShopRoute(window.location.pathname))
        setLang(window.location.pathname.startsWith("/en/") ? 1 : 0)
      if ((["/checkout", "/checkout/address", "/checkout/delivery"].includes(window.location.pathname) || isPaymentRoute(window.location.pathname)))
        setCheckoutIds(previous => parseCheckoutIds(window.location.search) ?? state?.checkoutIds ?? previous)
      if (isTrackingRoute(window.location.pathname))
        setLang(window.location.pathname === "/en/track-order" ? 1 : 0)
      if (isReturnsRoute(window.location.pathname))
        setLang(window.location.pathname === "/en/returns" ? 1 : 0)
      if (isAboutRoute(window.location.pathname))
        setLang(window.location.pathname === "/en/about" ? 1 : 0)
      if (isContactRoute(window.location.pathname))
        setLang(window.location.pathname === "/en/contact" ? 1 : 0)
      if (isTermsRoute(window.location.pathname))
        setLang(window.location.pathname === "/en/terms" ? 1 : 0)
      if (isCommissionRoute(window.location.pathname))
        setLang(window.location.pathname.startsWith("/en/") ? 1 : 0)
      if (isReferencesRoute(window.location.pathname) || isPreferencesRoute(window.location.pathname) || isAssessmentRoute(window.location.pathname) || isQuoteRoute(window.location.pathname))
        setLang(window.location.pathname.startsWith("/en/") ? 1 : 0)
      if (/^(\/fa|\/en)?\/artworks(\/[^/]+)?$/.test(window.location.pathname))
        setLang(window.location.pathname.startsWith("/en/") ? 1 : 0)
      setDrawer(false)
      setSearch(false)
      requestAnimationFrame(() => window.scrollTo(0, state?.scroll || 0))
    }
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    window.addEventListener("popstate", restore)
    return () => {
      window.removeEventListener("popstate", restore)
      window.history.scrollRestoration = previousRestoration
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [])
  useEffect(() => {
    document.documentElement.lang = lang === 0 ? "fa" : "en"
    document.documentElement.dir = lang === 0 ? "rtl" : "ltr"
  }, [lang])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(""), 4000)
    return () => clearTimeout(id)
  }, [toast])
  const navigate = (
    name: string,
    requestedRoute: string,
    preserveEdit = false,
  ): void => {
    if (referenceGuard.current && !(/^\/(fa|en)\/account\/profile$/.test(page) && /^\/(fa|en)\/account\/profile$/.test(requestedRoute))) {
      const guard = referenceGuard.current
      guard(() => {
        referenceGuard.current = null
        navigate(name, requestedRoute, preserveEdit)
        referenceGuard.current = guard
      })
      return
    }
    if (!preserveEdit) setEditingCartLine(null)
    const route =
      requestedRoute.split(/[?#]/)[0] === "/shop"
        ? `/${lang === 0 ? "fa" : "en"}${requestedRoute}`
      : requestedRoute.split("?")[0] === "/login"
        ? `/${lang === 0 ? "fa" : "en"}/auth/login${requestedRoute.includes("?") ? requestedRoute.slice(requestedRoute.indexOf("?")) : ""}`
      : isCommissionRoute(requestedRoute)
        ? `/${requestedRoute.startsWith("/en/") ? "en" : requestedRoute.startsWith("/fa/") ? "fa" : lang === 0 ? "fa" : "en"}/commissions`
        : requestedRoute === "/artworks"
        ? `/${lang === 0 ? "fa" : "en"}/artworks`
        : requestedRoute === "/bundles/cats"
        ? `/bundles/${bundleSlug}`
        : requestedRoute === "/track-order"
          ? `/${lang === 0 ? "fa" : "en"}/track-order`
          : ["/returns", "/returns-policy"].includes(requestedRoute)
            ? `/${lang === 0 ? "fa" : "en"}/returns`
            : requestedRoute === "/about"
              ? `/${lang === 0 ? "fa" : "en"}/about`
              : requestedRoute === "/contact"
                ? `/${lang === 0 ? "fa" : "en"}/contact`
                : requestedRoute === "/terms"
                  ? `/${lang === 0 ? "fa" : "en"}/terms`
            : requestedRoute
    if (!demoMode) {
      let target = route === "/" && lang === 1 ? "/en" : route
      if (lang === 1 && /^\/collections(\/|\?|$)/.test(target)) {
        const url = new URL(target, window.location.origin)
        url.searchParams.set("language", "en")
        target = url.pathname + url.search + url.hash
      }
      router.push(target)
      setDestination(null)
      setDrawer(false)
      setSearch(false)
      return
    }
    window.history.replaceState(
      {
        ...window.history.state,
        page,
        search: urlSearch,
        checkoutIds,
        scroll: window.scrollY,
      },
      "",
    )
    if (
      route === "/" ||
      /^\/(fa|en)\/account(?:\/.*)?$/.test(route.split(/[?#]/)[0]) ||
      isAuthRoute(route.split(/[?#]/)[0]) ||
      isShopRoute(route) ||
      route === "/cart" ||
      ["/checkout", "/checkout/address", "/checkout/delivery"].includes(route.split(/[?#]/)[0]) || isPaymentRoute(route.split(/[?#]/)[0]) ||
      route.split(/[?#]/)[0] === "/guides/buying" ||
      route.split(/[?#]/)[0] === "/faq" ||
      isTrackingRoute(route) ||
      isReturnsRoute(route) ||
      isAboutRoute(route) ||
      isContactRoute(route) ||
      isTermsRoute(route) ||
      isCommissionRoute(route) ||
      isReferencesRoute(route) ||
      isPreferencesRoute(route) ||
      isAssessmentRoute(route) ||
      isQuoteRoute(route) ||
      /^(\/fa|\/en)\/artworks(\/[^/]+)?$/.test(route.split(/[?#]/)[0]) ||
      route === "/collections" ||
      route.startsWith("/collections/") ||
      [bundleSlug].some((slug) => route === `/bundles/${slug}`) ||
      [productSlug, "cat-sketch-127", "sketchbook-cats"].some(
        (slug) => route === `/products/${slug}`,
      )
    ) {
      window.history.pushState(
        { page: route.split(/[?#]/)[0], scroll: 0, from: page, checkoutIds },
        "",
        route,
      )
      setPage(route.split(/[?#]/)[0])
      if (isShopRoute(route)) setLang(route.startsWith("/en/") ? 1 : 0)
      if (/^\/(fa|en)\/account(?:\/.*)?$/.test(route.split(/[?#]/)[0]))
        setLang(route.startsWith("/en/") ? 1 : 0)
      if (/^(\/fa|\/en)\/artworks(\/[^/]+)?$/.test(route.split(/[?#]/)[0]))
        setLang(route.startsWith("/en/") ? 1 : 0)
      if (isTrackingRoute(route)) setLang(route === "/en/track-order" ? 1 : 0)
      if (isReturnsRoute(route))
        setLang(route.split(/[?#]/)[0] === "/en/returns" ? 1 : 0)
      if (isAboutRoute(route))
        setLang(route.split(/[?#]/)[0] === "/en/about" ? 1 : 0)
      if (isContactRoute(route))
        setLang(route.split(/[?#]/)[0] === "/en/contact" ? 1 : 0)
      if (isTermsRoute(route))
        setLang(route.split(/[?#]/)[0] === "/en/terms" ? 1 : 0)
      if (isCommissionRoute(route))
        setLang(route.startsWith("/en/") ? 1 : 0)
      if (isReferencesRoute(route) || isPreferencesRoute(route) || isAssessmentRoute(route) || isQuoteRoute(route))
        setLang(route.startsWith("/en/") ? 1 : 0)
      if (route.includes("language=fa")) {
        setLang(0)
        setGuideMode("normal")
      }
      if (route.startsWith("/products/")) {
        setProductMode("normal")
        setProductPreset("")
      }
      if (route.startsWith("/bundles/")) {
        setBundleMode("normal")
        setBundlePreset("")
      }
      setUrlSearch(new URL(route, window.location.origin).search)
      if (page === "/cart" && route.split(/[?#]/)[0] === "/checkout" && !activeAttempt(paymentCheckout.attempt))
        setPaymentCheckout(previous => ({ ...emptyPayment(), acceptedTermsVersion: previous.acceptedTermsVersion }))
      if (route.split(/[?#]/)[0] === "/checkout" && (route.includes("items=") || !page.startsWith("/checkout")))
        setCheckoutIds(
          parseCheckoutIds(new URL(route, window.location.origin).search),
        )
      setDestination(null)
      window.scrollTo(0, 0)
    } else {
      const target = { name, route }
      window.history.pushState(
        {
          page,
          search: urlSearch,
          destination: target,
          scroll: window.scrollY,
        },
        "",
        route,
      )
      setDestination(target)
    }
    setDrawer(false)
    setSearch(false)
  }
  const closeDestination = () => demoMode ? window.history.back() : router.back()
  const addToDemoCart = (line: CartLine, stock: number) => {
    const editing = editingCartLine?.kind === "product" ? editingCartLine : null
    const previous = editing
      ? cart.filter((item) => item.skuId !== editing.data.skuId)
      : cart
    const existing = previous.find((item) => item.skuId === line.skuId)
    const updatedPrices = { ...cartLivePrices, [line.skuId]: line.unitPrice }
    const updatedStocks = { ...cartLiveStocks, [line.skuId]: stock }
    setCartLivePrices(updatedPrices)
    setCartLiveStocks(updatedStocks)
    const next = mergeCart(
      previous,
      existing ? { ...line, unitPrice: existing.unitPrice } : line,
      stock,
    )
    if (
      !next ||
      !canStoreCartItem(
        {
          products: next,
          bundles: bundleCart,
          art: artCart,
          livePrices: updatedPrices,
          liveStocks: updatedStocks,
        },
        `product:${line.skuId}`,
        cartMode,
      )
    )
      return false
    setCart(next)
    if (editing) {
      navigate(t("سبد خرید", "Shopping cart"), "/cart")
      setToast(
        t("انتخاب سبد به‌روزرسانی شد — نمایشی", "Cart options updated — demo"),
      )
    }
    return true
  }
  const addBundleToDemoCart = (line: BundleCartLine) => {
    const editing = editingCartLine?.kind === "bundle" ? editingCartLine : null
    const previous = editing
      ? bundleCart.filter((item) => item.key !== editing.data.key)
      : bundleCart
    const existing = previous.find((item) => item.key === line.key)
    const updatedPrices = {
      ...cartLivePrices,
      ...Object.fromEntries(
        line.parts.map((part) => [part.skuId, part.unitPrice]),
      ),
    }
    const updatedStocks = {
      ...cartLiveStocks,
      ...Object.fromEntries(line.parts.map((part) => [part.skuId, part.stock])),
    }
    setCartLivePrices(updatedPrices)
    setCartLiveStocks(updatedStocks)
    const next = existing
      ? previous.map((item) =>
          item.key === line.key
            ? {
                ...line,
                parts: item.parts,
                unitPrice: item.unitPrice,
                quantity: item.quantity + line.quantity,
              }
            : item,
        )
      : [...previous, line]
    if (
      !canStoreCartItem(
        {
          products: cart,
          bundles: next,
          art: artCart,
          livePrices: updatedPrices,
          liveStocks: updatedStocks,
        },
        `bundle:${line.key}`,
        cartMode,
      )
    )
      return false
    setBundleCart(next)
    if (editing) {
      navigate(t("سبد خرید", "Shopping cart"), "/cart")
      setToast(
        t("پکیج سبد به‌روزرسانی شد — نمایشی", "Cart bundle updated — demo"),
      )
    }
    return true
  }
  const loadCartDemo = (variant = "mixed") => {
    const fixture = demoCart(variant)
    setCart(fixture.products)
    setBundleCart(fixture.bundles)
    setArtCart(fixture.art)
    setCartCoupon("")
    setCartUndo(null)
    setCartMode(variant)
    setCartLivePrices({})
    setCartLiveStocks({})
  }
  const changeCartQuantity = (id: string, quantity: number) => {
    if (id.startsWith("product:"))
      setCart((previous) =>
        previous.map((line) =>
          line.skuId === id.slice(8) ? { ...line, quantity } : line,
        ),
      )
    if (id.startsWith("bundle:"))
      setBundleCart((previous) =>
        previous.map((line) =>
          line.key === id.slice(7) ? { ...line, quantity } : line,
        ),
      )
  }
  const removeCartItem = (id: string) => {
    const line = shoppingLines({
      products: cart,
      bundles: bundleCart,
      art: artCart,
    }).find((line) => line.id === id)
    if (!line) return
    const index =
      line.kind === "product"
        ? cart.findIndex((item) => item.skuId === line.data.skuId)
        : line.kind === "bundle"
          ? bundleCart.findIndex((item) => item.key === line.data.key)
          : artCart.findIndex((item) => item.id === line.data.id)
    setCartUndo({ line, index })
    if (line.kind === "product")
      setCart((previous) =>
        previous.filter((item) => item.skuId !== line.data.skuId),
      )
    else if (line.kind === "bundle")
      setBundleCart((previous) =>
        previous.filter((item) => item.key !== line.data.key),
      )
    else
      setArtCart((previous) =>
        previous.filter((item) => item.id !== line.data.id),
      )
  }
  const restoreCartItem = () => {
    if (!cartUndo) return
    const { line, index } = cartUndo
    if (line.kind === "product")
      setCart((previous) => {
        const existing = previous.find((item) => item.skuId === line.data.skuId)
        if (existing)
          return previous.map((item) =>
            item.skuId === line.data.skuId
              ? { ...line.data, quantity: item.quantity + line.data.quantity }
              : item,
          )
        const next = [...previous]
        next.splice(index, 0, line.data)
        return next
      })
    else if (line.kind === "bundle")
      setBundleCart((previous) => {
        const existing = previous.find((item) => item.key === line.data.key)
        if (existing)
          return previous.map((item) =>
            item.key === line.data.key
              ? { ...line.data, quantity: item.quantity + line.data.quantity }
              : item,
          )
        const next = [...previous]
        next.splice(index, 0, line.data)
        return next
      })
    else
      setArtCart((previous) => {
        if (previous.some((item) => item.id === line.data.id)) return previous
        const next = [...previous]
        next.splice(index, 0, line.data)
        return next
      })
    setCartUndo(null)
  }
  const acceptCartPrice = (row: EvaluatedLine) => {
    const line = row.line
    if (line.kind === "product")
      setCartLivePrices((previous) => ({
        ...previous,
        [line.data.skuId]: row.currentPrice,
      }))
    if (line.kind === "bundle" && row.newParts)
      setCartLivePrices((previous) => ({
        ...previous,
        ...Object.fromEntries(
          row.newParts!.map((part) => [part.skuId, part.unitPrice]),
        ),
      }))
    if (line.kind === "product")
      setCart((previous) =>
        previous.map((item) =>
          item.skuId === line.data.skuId
            ? { ...item, unitPrice: row.currentPrice }
            : item,
        ),
      )
    if (line.kind === "bundle")
      setBundleCart((previous) =>
        previous.map((item) =>
          item.key === line.data.key
            ? {
                ...item,
                unitPrice: row.currentPrice,
                parts: row.newParts || item.parts,
              }
            : item,
        ),
      )
  }
  const editCartItem = (id: string) => {
    const line = shoppingLines({
      products: cart,
      bundles: bundleCart,
      art: artCart,
    }).find((item) => item.id === id)
    if (!line || (line.kind !== "product" && line.kind !== "bundle")) return
    setEditingCartLine(line)
    navigate(
      t("ویرایش انتخاب سبد", "Edit cart options"),
      line.kind === "bundle"
        ? `/bundles/${bundleSlug}`
        : `/products/${productSlug}`,
      true,
    )
  }
  const createCheckoutMerge = (snapshot: import("./cart").CartSnapshot) => {
    const account = checkoutFixture("verified")
    account.products = account.products.map((line) => ({
      ...line,
      quantity: 6,
    }))
    account.bundles = []
    account.art = snapshot.art
    const proposal = mergeCheckoutCarts(snapshot, account)
    setCheckoutMerge({
      candidate: proposal.candidate,
      changes: proposal.changes.length,
      conflicts: proposal.conflicts.length,
    })
  }
  const changeCheckoutSession = (session: CheckoutSession) => {
    setCheckoutSession(session)
    setSignedIn(
      session.status === "verified" || session.status === "unverified",
    )
    if (session.status === "verified" && checkoutMode === "merge-conflict")
      createCheckoutMerge({
        products: cart,
        bundles: bundleCart,
        art: artCart,
        livePrices: cartLivePrices,
        liveStocks: cartLiveStocks,
      })
  }
  const loadCheckoutDemo = (mode: string) => {
    const demoTicket = ++paymentDemoGeneration.current
    const fixture = checkoutFixture(mode)
    if (["delivery-mixed", "payment-mixed"].includes(mode)) fixture.art = fixture.art.map(line => ({ ...line, delivery: "digital" }))
    setCart(fixture.products)
    setBundleCart(fixture.bundles)
    setArtCart(fixture.art)
    setCartLivePrices({})
    setCartLiveStocks({})
    setCartCoupon(mode.startsWith("payment-") ? "NILART10" : "")
    setCartMode("normal")
    setCheckoutMerge(null)
    setCheckoutMode(mode === "merge-conflict" ? mode : "normal")
    const selection =
      mode === "quote-expired" ? checkoutFixture("verified") : fixture
    setCheckoutIds(
      shoppingLines(selection)
        .filter(
          (line) =>
            line.kind !== "commission" || line.data.status !== "pending",
        )
        .map((line) => line.id),
    )
    const status =
      mode === "guest"
        ? "guest"
        : mode === "unverified"
          ? "unverified"
          : "verified"
    setCheckoutSession({ status, demo: true })
    setSignedIn(status !== "guest")
    if (mode === "merge-conflict") createCheckoutMerge(fixture)
    if (mode.startsWith("payment-") || mode === "digital") {
      setPaymentCheckout(emptyPayment())
      if (mode.startsWith("payment-")) {
        setDeliveryCheckout(emptyDelivery())
        const demoRows = evaluateCart(fixture).filter(row => !row.issue)
        const destination = addressCheckout.addresses.find(a => a.id === addressCheckout.selectedAddressId)
        requestDemoDelivery(deliveryContext(destination, demoRows, "NILART10"), demoRows, "normal").then(quote => {
          if (demoTicket !== paymentDemoGeneration.current) return
          setDeliveryCheckout({ quote, selectedDeliveryOption: "standard", acceptedVersion: quote.version })
        })
      }
    }
  }
  const changeCheckoutMode = (mode: string) => {
    setCheckoutMode(mode)
    if (["invalid-credentials", "otp-invalid", "otp-expired", "sms-error", "rate-limited", "restricted"].includes(mode)) {
      setCheckoutSession({ status: "guest", demo: true })
      setSignedIn(false)
    }
    if (mode === "price-change") {
      setCartLivePrices({})
      setCartMode("price-change")
    } else if (mode === "stock-conflict") {
      setCartLiveStocks({})
      setCartMode("stock-conflict")
    } else if (mode === "session-expired") {
      setCheckoutSession({ status: "expired", demo: true })
      setSignedIn(false)
    } else if (mode === "normal") setCartMode("normal")
  }
  const updateDetailQuery = (query: string) => {
    if (!demoMode) {
      const params = new URLSearchParams(query)
      const language = searchParams.get("language")
      if (language) params.set("language", language)
      router.push(`${page}${params.size ? `?${params}` : ""}`, { scroll: false })
      return
    }
    window.history.replaceState(
      {
        ...window.history.state,
        page,
        search: urlSearch,
        scroll: window.scrollY,
      },
      "",
    )
    window.history.pushState(
      { page, search: query ? `?${query}` : "", scroll: window.scrollY },
      "",
      `${page}${query ? `?${query}` : ""}`,
    )
    setUrlSearch(query ? `?${query}` : "")
  }
  const retryDetail = () => {
    setDetailMode("results-loading")
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => {
      setDetailMode("normal")
      retryTimer.current = null
    }, 650)
  }
  const updateShopQuery = (query: string, replace = false) => {
    if (!demoMode) {
      const route = `${page}${query ? `?${query}` : ""}`
      if (replace) router.replace(route, { scroll: false })
      else router.push(route, { scroll: false })
      return
    }
    if (!replace) window.history.replaceState({ ...window.history.state, page, search: urlSearch, scroll: window.scrollY }, "")
    const route = `${page}${query ? `?${query}` : ""}`
    const state = { ...window.history.state, page, search: query ? `?${query}` : "", scroll: window.scrollY }
    if (replace) window.history.replaceState(state, "", route)
    else window.history.pushState(state, "", route)
    setUrlSearch(query ? `?${query}` : "")
  }
  const retryCollections = () => {
    setCollectionsMode("loading")
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = setTimeout(() => {
      setCollectionsMode("normal")
      retryTimer.current = null
    }, 700)
  }
  const link = (
    name: string,
    route: string,
    className = "",
    content?: ReactNode,
  ) => (
    <a
      key={route}
      href={route}
      className={className}
      aria-current={
        (route === "/collections" && isCollections) ||
        (isShopRoute(route) && isShop) ||
        (route === "/guides/buying" && isBuyingGuide) ||
        (route === "/faq" && isFAQ) ||
        (isTrackingRoute(route) && isTracking) ||
        (isReturnsRoute(route) && isReturns) ||
        (isAboutRoute(route) && isAbout) ||
        (isContactRoute(route) && isContact) ||
        (isTermsRoute(route) && isTerms) ||
        (route === "/artworks" && (isArtworks || isArtworkDetail)) ||
        (isCommissionRoute(route) && (isCommissions || isReferences))
          ? "page"
          : undefined
      }
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        navigate(name, route)
      }}
    >
      {content || name}
    </a>
  )
  const arrowLink = (name: string, route: string, className = "text-link") =>
    link(
      name,
      route,
      className,
      <>
        {name}
        <Icon name="arrow" size={19} />
      </>,
    )
  const switchLanguage = () => {
    const next = lang === 0 ? 1 : 0
    setLang(next)
    if (!demoMode) {
      const locale = next === 0 ? "fa" : "en"
      if (["/", "/fa", "/en"].includes(page)) router.replace(next === 0 ? "/" : "/en", { scroll: false })
      else if (/^\/(fa|en)(\/|$)/.test(page)) router.replace(page.replace(/^\/(fa|en)/, `/${locale}`) + urlSearch + window.location.hash, { scroll: false })
      else {
        const query = new URLSearchParams(nextSearch)
        query.set("language", locale)
        router.replace(`${page}?${query}` + window.location.hash, { scroll: false })
      }
      return
    }
    if (isShop) {
      const route = page.replace(/^\/(fa|en)/, next === 0 ? "/fa" : "/en")
      window.history.replaceState({ ...window.history.state, page: route, search: urlSearch, scroll: window.scrollY }, "", route + urlSearch)
      setPage(route)
      return
    }
    if (isQuote) {
      const route = `/${next === 0 ? "fa" : "en"}/commissions/new/quote`
      window.history.replaceState({ ...window.history.state, page: route }, "", route)
      setPage(route)
    }
    if (isAssessment) {
      const route = `/${next === 0 ? "fa" : "en"}/commissions/new/assessment`
      window.history.replaceState({ ...window.history.state, page: route }, "", route)
      setPage(route)
    }
    if (isPreferences) {
      const route = `/${next === 0 ? "fa" : "en"}/commissions/new/preferences`
      window.history.replaceState({ ...window.history.state, page: route }, "", route)
      setPage(route)
    }
    if (isReferences) {
      const route = `/${next === 0 ? "fa" : "en"}/commissions/new/references`
      window.history.replaceState({ ...window.history.state, page: route }, "", route)
      setPage(route)
    }
    if (isCommissions) {
      const route = `/${next === 0 ? "fa" : "en"}/commissions`
      window.history.replaceState({ ...window.history.state, page: route }, "", route)
      setPage(route)
    }
    if (isArtworks || isArtworkDetail) {
      const route = `/${next === 0 ? "fa" : "en"}/artworks${isArtworkDetail ? "/" + page.split("/").pop() : ""}`
      window.history.replaceState({ ...window.history.state, page: route }, "", `${route}${window.location.search}`)
      setPage(route)
    }
    if (isTracking || isReturns || isAbout || isContact || isTerms) {
      const route = `/${next === 0 ? "fa" : "en"}/${
        isTerms ? "terms" : isContact ? "contact" : isAbout ? "about" : isReturns ? "returns" : "track-order"
      }`
      window.history.replaceState(
        { ...window.history.state, page: route },
        "",
        `${route}${isReturns || isTerms ? window.location.hash : ""}`,
      )
      setPage(route)
    }
  }
  const nav = [
    [t("کالکشن‌ها", "Collections"), "/collections"],
    [t("فروشگاه", "Shop"), `/${lang === 0 ? "fa" : "en"}/shop`],
    [t("نقاشی‌ها", "Artworks"), "/artworks"],
    [t("سفارش نقاشی", "Commission artwork"), "/commissions"],
  ]
  const SectionHeading = ({
    number,
    title,
    description,
    action,
    route,
  }: {
    number: string
    title: string
    description?: string
    action?: string
    route?: string
  }) => (
    <div className="section-heading">
      <div>
        <div className="eyebrow section-number">{number} / NILART STUDIO</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && route && arrowLink(action, route)}
    </div>
  )
  const toggleFavorite = (id: string) => {
    if (!demoMode) return
    if (!signedIn) {
      navigate(
        t("ورود برای ذخیره علاقه‌مندی", "Sign in to save your favorite"),
        `/login?returnTo=${encodeURIComponent("/products/" + (id === "cat-sketch-127" ? productSlug : id))}`,
      )
      return
    }
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
    setToast(
      favorites.includes(id)
        ? t("از علاقه‌مندی‌های نمونه حذف شد", "Removed from demo favorites")
        : t("در علاقه‌مندی‌های نمونه ذخیره شد", "Saved to demo favorites"),
    )
  }
  if (isAuthRoute(page)) return <AuthPage page={page} search={urlSearch} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/orders\/[^/]+\/receipt$/.test(page)) return <ReceiptPage page={page} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/orders\/[^/]+\/cancel$/.test(page)) return <CancellationPage key={page} page={page} navigate={(route) => navigate("", route)} renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} />
  if (/^\/(fa|en)\/account\/orders\/[^/]+\/return$/.test(page)) return <ReturnRequestPage key={page} page={page} navigate={(route) => navigate("", route)} renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} />
  if (/^\/(fa|en)\/account\/requests\/[^/]+$/.test(page)) return <RequestStatusPage key={page} page={page} navigate={(route) => navigate("", route)} renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} />
  if (/^\/(fa|en)\/account\/downloads$/.test(page)) return <DownloadsPage key={page} page={page} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/orders\/[^/]+\/artwork-review$/.test(page)) return <ArtworkReviewPage key={page} page={page} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/favorites$/.test(page)) return <FavoritesPage key={page} page={page} navigate={(route) => navigate("", route)} renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} />
  if (/^\/(fa|en)\/account\/addresses$/.test(page)) return <AddressesPage key={page} page={page} search={urlSearch} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/profile$/.test(page)) return <ProfilePage page={page} navigate={(route) => navigate("", route)} registerGuard={registerReferenceGuard} />
  if (/^\/(fa|en)\/account\/security$/.test(page)) return <SecurityPage page={page} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/preferences$/.test(page)) return <AccountPreferencesPage page={page} navigate={(route) => navigate("", route)} registerGuard={registerReferenceGuard} />
  if (/^\/(fa|en)\/account\/support$/.test(page)) return <SupportPage page={page} search={urlSearch} navigate={(route) => navigate("", route)} registerGuard={registerReferenceGuard} />
  if (/^\/(fa|en)\/account\/notifications$/.test(page)) return <NotificationsPage key={String(signedIn)} sessionKey={String(signedIn)} page={page} navigate={(route) => navigate("", route)} />
  if (/^\/(fa|en)\/account\/support\/[^/]+$/.test(page)) return <SupportConversationPage key={page.split("/")[4]} page={page} navigate={(route) => navigate("", route)} registerGuard={registerReferenceGuard} />
  if (/^\/(fa|en)\/account(?:\/.*)?$/.test(page)) return <DashboardPage page={page} navigate={(route) => navigate("", route)} renderMedia={(color, kind) => <Mockup color={color} kind={kind} />} />
  return (
    <div className="app" dir={lang === 0 ? "rtl" : "ltr"}>
      <a className="skip-link" href={isCheckout ? "#checkout-title" : "#main"}>
        {t("رفتن به محتوای اصلی", "Skip to content")}
      </a>
      {!isCheckout && (
        <>
          <div className="announcement">
            {t(
              "هنر، در کوچک‌ترین لحظه‌های روزمره",
              "Art, in the little moments of everyday life",
            )}
            <span>
              {" "}
              {t(
                "ساخته‌شده با حوصله، انتخاب‌شده با عشق",
                "Thoughtfully made, lovingly chosen",
              )}
            </span>
          </div>
          <header className="header">
            <div className="container header-inner">
              <button
                className="icon-button mobile-menu"
                onClick={() => setDrawer(true)}
                aria-label={t("بازکردن منو", "Open menu")}
              >
                <Icon name="menu" />
              </button>
              <a
                className="wordmark"
                href="/"
                aria-label="NilArt Studio — Home"
                onClick={(e) => {
                  e.preventDefault()
                  navigate(t("خانه", "Home"), "/")
                }}
              >
                <span>
                  nilart<span className="wordmark-dot">.</span>
                </span>
                <small>ART & EVERYDAY</small>
              </a>
              <nav
                className="desktop-nav"
                aria-label={t("ناوبری اصلی", "Main navigation")}
              >
                {nav.map(([name, route]) =>
                  link(name, route, "", <span key={route}>{name}</span>),
                )}
              </nav>
              <div className="header-actions">
                <button
                  className="icon-button"
                  onClick={() => setSearch(true)}
                  aria-label={t("جست‌وجو", "Search")}
                >
                  <Icon name="search" />
                </button>
                <span className="header-divider" />
                <button
                  className="language-button desktop-only"
                  onClick={switchLanguage}
                >
                  {lang === 0 ? "EN" : "فا"}
                </button>
                <button
                  className="icon-button desktop-only"
                  onClick={() =>
                    navigate(
                      t("حساب من", "My account"),
                      signedIn ? "/account" : "/login",
                    )
                  }
                  aria-label={t("حساب من", "My account")}
                >
                  <Icon name="user" />
                  {signedIn && <span className="account-dot" />}
                </button>
                <button
                  className="icon-button cart-button"
                  onClick={() => navigate(t("سبد خرید", "Cart"), "/cart")}
                  aria-label={
                    t("سبد خرید، ", "Cart, ") +
                    cartCount.toLocaleString(lang === 0 ? "fa-IR" : "en-US") +
                    t(" کالا (نمایشی)", " items (demo)")
                  }
                >
                  <Icon name="bag" />
                  <span className="cart-count">
                    {cartCount.toLocaleString(lang === 0 ? "fa-IR" : "en-US")}
                  </span>
                </button>
              </div>
            </div>
          </header>
        </>
      )}

      <main id="main">
        {isCheckout ? (
          <Suspense
            fallback={
              <div className="container checkout-content" aria-busy="true">
                <h1 className="sr-only">
                  {t("بارگذاری checkout", "Loading checkout")}
                </h1>
                <div className="skeleton cart-summary-skeleton" />
              </div>
            }
          >
            {isPaymentRoute(page) ? <CheckoutPaymentPage
              language={lang} route={page} onLanguage={switchLanguage} onNavigate={navigate}
              snapshot={{ products: cart, bundles: bundleCart, art: artCart, livePrices: cartLivePrices, liveStocks: cartLiveStocks }}
              selectedIds={checkoutIds} cartMode={cartMode} couponCode={cartCoupon}
              session={checkoutSession} blocked={!!checkoutMerge} address={addressCheckout} delivery={deliveryCheckout}
              state={paymentCheckout} onState={setPaymentCheckout}
              onDemo={loadCheckoutDemo} onSession={changeCheckoutSession}
              renderMedia={(color, kind, hero) => <Mockup color={color} kind={kind} hero={hero} />}
              arrow={<Icon name="arrow" size={19} />}
            /> : page === "/checkout/delivery" ? <CheckoutDeliveryPage
              language={lang} onLanguage={switchLanguage} onNavigate={navigate}
              snapshot={{ products: cart, bundles: bundleCart, art: artCart, livePrices: cartLivePrices, liveStocks: cartLiveStocks }}
              selectedIds={checkoutIds} cartMode={cartMode} couponCode={cartCoupon}
              session={checkoutSession} blocked={!!checkoutMerge} addressState={addressCheckout}
              state={deliveryCheckout} onState={setDeliveryCheckout}
              onDemo={loadCheckoutDemo} onSession={changeCheckoutSession}
              arrow={<Icon name="arrow" size={19} />}
            /> : page === "/checkout/address" ? <CheckoutAddressPage
              language={lang} onLanguage={switchLanguage}
              snapshot={{ products: cart, bundles: bundleCart, art: artCart, livePrices: cartLivePrices, liveStocks: cartLiveStocks }}
              selectedIds={checkoutIds} cartMode={cartMode} couponCode={cartCoupon}
              session={checkoutSession} blocked={!!checkoutMerge}
              state={addressCheckout} onState={setAddressCheckout}
              onNavigate={navigate} onDemo={loadCheckoutDemo} onSession={changeCheckoutSession}
              arrow={<Icon name="arrow" size={19} />}
            /> : <CheckoutPage
              language={lang}
              onLanguage={switchLanguage}
              snapshot={{
                products: cart,
                bundles: bundleCart,
                art: artCart,
                livePrices: cartLivePrices,
                liveStocks: cartLiveStocks,
              }}
              selectedIds={checkoutIds}
              cartMode={cartMode}
              couponCode={cartCoupon}
              session={
                checkoutSession.status === "guest" && signedIn
                  ? { status: "unverified", demo: true }
                  : checkoutSession
              }
              acceptedTermsVersion={paymentCheckout.acceptedTermsVersion}
              onTermsAccepted={(version) => setPaymentCheckout(previous => ({ ...previous, acceptedTermsVersion: version }))}
              mode={checkoutMode}
              onMode={changeCheckoutMode}
              onDemo={loadCheckoutDemo}
              onSession={changeCheckoutSession}
              mergeNotice={checkoutMerge}
              onKeepGuest={() => setCheckoutMerge(null)}
              onReviewMerged={() => {
                if (!checkoutMerge) return
                setCart(checkoutMerge.candidate.products)
                setBundleCart(checkoutMerge.candidate.bundles)
                setArtCart(checkoutMerge.candidate.art)
                setCheckoutMerge(null)
                navigate(
                  t("بازبینی سبد ترکیب‌شده", "Review combined cart"),
                  "/cart",
                )
              }}
              onAcceptPrice={acceptCartPrice}
              onNavigate={navigate}
              renderMedia={(color, kind, hero) => (
                <Mockup color={color} kind={kind} hero={hero} />
              )}
              renderDialog={(open, onClose, title, children, kind) => (
                <Modal open={open} onClose={onClose} title={title} kind={kind}>
                  {children}
                </Modal>
              )}
              arrow={<Icon name="arrow" size={19} />}
            />}
          </Suspense>
        ) : isQuote ? (
          <QuotePage language={lang} signedIn={signedIn} reference={referenceDraft}
            preferences={preferencesDraft} job={assessmentJob} quote={commissionQuote}
            acceptance={quoteAcceptance} onQuote={setCommissionQuote}
            inCart={artCart.some(line => line.id === commissionCartId && line.status === "confirmed" && acceptanceMatches(line.commissionAcceptance || null, commissionQuote))}
            onNavigate={navigate} onDemoSignIn={setSignedIn}
            onApprove={async (quote, mode) => {
              if (!signedIn || !preferencesDraft || quote.version !== commissionQuote?.version ||
                quote.termsVersion !== commissionQuote.termsVersion ||
                !payableQuote(quote, assessmentJob, referenceDraft, preferencesDraft)) return "invalid"
              const accepted = acceptanceMatches(quoteAcceptance, quote) ? quoteAcceptance! : {
                quoteId: quote.id, quoteVersion: quote.version, termsVersion: quote.termsVersion,
                requestKey: quote.requestKey, owner: "demo-session" as const, acceptedAt: Date.now()
              }
              setQuoteAcceptance(accepted)
              if (mode === "network") return "unknown"
              if (mode === "add-error") return "add-error"
              const line = quoteCartLine(quote, preferencesDraft, accepted)
              setArtCart(previous => {
                const existing = previous.find(item => item.id === line.id)
                if (existing?.status === "confirmed" && acceptanceMatches(existing.commissionAcceptance || null, quote)) return previous
                return [...previous.filter(item => item.id !== line.id), line]
              })
              return "added"
            }}
            onDemoFixture={() => {
              if (!signedIn) return
              const reference = { ...assessmentDemoReference }
              const preferences = { ...assessmentDemoPreferences }
              const sampleJob = demoJobStatus(createDemoJob(reference, preferences), "complete")
              setReferenceDraft(reference); setPreferencesDraft(preferences); setAssessmentJob(sampleJob)
              setCommissionQuote(demoQuote(sampleJob, preferences.execution)); setQuoteAcceptance(null)
              setArtCart(previous => previous.filter(line => line.id !== commissionCartId))
            }} />
        ) : isAssessment ? (
          <AssessmentPage language={lang} signedIn={signedIn} reference={referenceDraft}
            preferences={preferencesDraft} job={assessmentJob} onJob={setAssessmentJob}
            onNavigate={navigate} onDemoSignIn={setSignedIn}
            onDemoFixture={() => {
              if (!signedIn) return
              setReferenceDraft({ ...assessmentDemoReference })
              setPreferencesDraft({ ...assessmentDemoPreferences })
              setAssessmentJob(null)
            }} />
        ) : isPreferences ? (
          <PreferencesPage language={lang} signedIn={signedIn} reference={referenceDraft}
            saved={preferencesDraft} onSave={setPreferencesDraft} onNavigate={navigate}
            hasPriorAssessment={!!assessmentJob}
            onDemoSignIn={setSignedIn} registerGuard={registerReferenceGuard} />
        ) : isReferences ? (
          <ReferencesPage language={lang} signedIn={signedIn} draft={referenceDraft}
            onSave={setReferenceDraft} onNavigate={navigate} onDemoSignIn={setSignedIn}
            registerGuard={registerReferenceGuard}
          />
        ) : isCommissions ? (
          <CommissionsPage language={lang} signedIn={signedIn} onNavigate={navigate} onDemoSignIn={setSignedIn} />
        ) : (isArtworkDetail || isArtworks) && !demoMode ? (
          <LiveArtworksPage language={lang} slug={isArtworkDetail ? page.split("/").pop() : undefined} navigate={navigate} />
        ) : isArtworkDetail ? (
          <ArtworkDetailPage
            slug={page.split("/").pop() || ""}
            language={lang}
            signedIn={signedIn}
            cartIds={artCart.filter(line => line.kind === "artwork").map(line => line.id)}
            favorites={favorites}
            onFavorite={id => setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])}
            onAdd={line => setArtCart(previous => previous.some(item => item.kind === "artwork" && item.id === line.id) ? previous : [...previous, line])}
            onNavigate={navigate}
            onBack={() => {
              if (demoMode && /^(\/fa|\/en)\/artworks$/.test(window.history.state?.from || "")) window.history.back()
              else navigate(t("گالری نقاشی‌ها", "Art gallery"), `/${lang === 0 ? "fa" : "en"}/artworks`)
            }}
          />
        ) : isArtworks ? (
          <ArtworksPage language={lang} signedIn={signedIn} onNavigate={navigate}
            savedFavorites={favorites}
            onFavorite={id => setFavorites(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id])}
          />
        ) : isTerms ? (
          <TermsPage language={lang} signedIn={signedIn} mode={termsMode} onMode={setTermsMode} onNavigate={navigate} arrow={<Icon name="arrow" size={18} />} />
        ) : isContact ? (
          <ContactPage language={lang} signedIn={signedIn} mode={contactMode} onMode={setContactMode} onNavigate={navigate} arrow={<Icon name="arrow" size={18} />} />
        ) : isAbout ? (
          <AboutPage
            language={lang}
            mode={aboutMode}
            onMode={setAboutMode}
            onNavigate={navigate}
            arrow={<Icon name="arrow" size={18} />}
            renderMedia={(color, kind) => <Mockup color={color} kind={kind} />}
          />
        ) : isReturns ? (
          <ReturnsPage
            language={lang}
            signedIn={signedIn}
            mode={returnsMode}
            onMode={setReturnsMode}
            onPersian={() => {
              setLang(0)
              if (!demoMode) {
                router.replace(`/fa/returns${window.location.hash}`, { scroll: false })
                return
              }
              window.history.replaceState(
                { ...window.history.state, page: "/fa/returns" },
                "",
                `/fa/returns${window.location.hash}`,
              )
              setPage("/fa/returns")
            }}
            onNavigate={navigate}
            arrow={<Icon name="arrow" size={18} />}
          />
        ) : isTracking ? (
          <TrackingPage
            language={lang}
            mode={trackingMode}
            onNavigate={navigate}
            arrow={<Icon name="arrow" size={18} />}
          />
        ) : isFAQ ? (
          <FAQPage
            language={lang}
            mode={faqMode}
            onMode={setFaqMode}
            onNavigate={(name, route) => {
              if (route === "/account/downloads" && !signedIn) {
                navigate(
                  t("ورود برای دانلودهای من", "Sign in for My downloads"),
                  "/login?returnTo=%2Faccount%2Fdownloads",
                )
              } else navigate(name, route)
            }}
            onPersian={() => setLang(0)}
            arrow={<Icon name="arrow" size={18} />}
            searchIcon={<Icon name="search" size={21} />}
          />
        ) : isBuyingGuide ? (
          <BuyingGuide
            language={lang}
            mode={guideMode}
            onMode={setGuideMode}
            onNavigate={navigate}
            renderMedia={(color, kind) => <Mockup color={color} kind={kind} />}
            arrow={<Icon name="arrow" size={18} />}
          />
        ) : isCart ? (
          <Suspense
            fallback={
              <div className="container shopping-cart-page" aria-busy="true">
                <h1 className="sr-only">{t("بارگذاری سبد", "Loading cart")}</h1>
                <div className="skeleton cart-summary-skeleton" />
              </div>
            }
          >
            <CartPage
              snapshot={{
                products: cart,
                bundles: bundleCart,
                art: artCart,
                livePrices: cartLivePrices,
                liveStocks: cartLiveStocks,
              }}
              mode={cartMode}
              language={lang}
              couponCode={cartCoupon}
              onCoupon={setCartCoupon}
              onQuantity={changeCartQuantity}
              onRemove={removeCartItem}
              undoItem={cartUndo?.line || null}
              onUndo={restoreCartItem}
              onAcceptPrice={acceptCartPrice}
              onEdit={editCartItem}
              onDemo={() => loadCartDemo()}
              onRetry={() => {
                setCartMode("loading")
                retryTimer.current = setTimeout(
                  () => setCartMode("normal"),
                  500,
                )
              }}
              onNavigate={navigate}
              renderMedia={(color, kind, hero) => (
                <Mockup color={color} kind={kind} hero={hero} />
              )}
              arrow={<Icon name="arrow" size={19} />}
            />
          </Suspense>
        ) : isBundle ? (
          <Suspense
            fallback={
              <div className="container product-detail-page" aria-busy="true">
                <h1 className="sr-only">
                  {t("بارگذاری پکیج", "Loading bundle")}
                </h1>
                <div className="product-main-layout">
                  <div className="skeleton product-gallery-skeleton" />
                  <div className="skeleton product-gallery-skeleton" />
                </div>
              </div>
            }
          >
            <BundleDetailPage
              key={page}
              slug={page.split("/")[2] || ""}
              language={lang}
              mode={bundleMode}
              preset={bundlePreset}
              initialDraft={
                editingCartLine?.kind === "bundle"
                  ? {
                      selection: editingCartLine.data.selection,
                      quantity: String(editingCartLine.data.quantity),
                    }
                  : bundleDrafts[bundleSlug]
              }
              editing={editingCartLine?.kind === "bundle"}
              livePrices={liveCartPrices}
              liveStocks={liveCartStocks}
              onDraftChange={saveBundleDraft}
              onAdd={addBundleToDemoCart}
              onNavigate={navigate}
              onBack={() => demoMode ? window.history.back() : router.back()}
              canBack={!!window.history.state?.from}
              renderMedia={(color, kind, hero) => (
                <Mockup color={color} kind={kind} hero={hero} />
              )}
              renderDialog={(open, onClose, title, children, kind) => (
                <Modal open={open} onClose={onClose} title={title} kind={kind}>
                  {children}
                </Modal>
              )}
              arrow={<Icon name="arrow" size={19} />}
              heart={<Icon name="heart" size={19} />}
            />
          </Suspense>
        ) : isProduct ? (
          <Suspense
            fallback={
              <div className="container product-detail-page" aria-busy="true">
                <h1 className="sr-only">
                  {t("بارگذاری محصول", "Loading product")}
                </h1>
                <div className="product-main-layout">
                  <div className="skeleton product-gallery-skeleton" />
                  <div className="skeleton product-gallery-skeleton" />
                </div>
              </div>
            }
          >
            <ProductDetailPage
              key={page}
              slug={page.split("/")[2] || ""}
              language={lang}
              mode={productMode}
              preset={productPreset}
              initialDraft={
                editingCartLine?.kind === "product"
                  ? {
                      selection: editingCartLine.data.selection,
                      quantity: String(editingCartLine.data.quantity),
                    }
                  : undefined
              }
              editing={editingCartLine?.kind === "product"}
              livePrices={liveCartPrices}
              liveStocks={liveCartStocks}
              onNavigate={navigate}
              onAdd={addToDemoCart}
              favorites={favorites}
              onFavorite={toggleFavorite}
              signedIn={signedIn}
              renderMedia={(color, kind, hero) => (
                <Mockup color={color} kind={kind} hero={hero} />
              )}
              renderDialog={(open, onClose, title, children, kind) => (
                <Modal open={open} onClose={onClose} title={title} kind={kind}>
                  {children}
                </Modal>
              )}
              arrow={<Icon name="arrow" size={19} />}
              heart={<Icon name="heart" size={19} />}
            />
          </Suspense>
        ) : isShop && !demoMode ? (
          <LiveShopPage data={liveCatalog.data} status={liveCatalog.status} search={urlSearch} language={lang}
            retry={liveCatalog.retry} navigate={navigate} queryChange={updateShopQuery} />
        ) : isShop ? (
          <ShopPage
            key={page.split("/")[2] === "categories" ? page.split("/")[3] : "shop"}
            page={page} search={urlSearch} language={lang}
            onNavigate={navigate} onQueryChange={updateShopQuery}
            favorites={favorites} signedIn={signedIn} onFavorite={toggleFavorite}
            renderMedia={(color, kind, hero) => <Mockup color={color} kind={kind} hero={hero} />}
            renderSheet={(open, onClose, title, children) => <Modal open={open} onClose={onClose} title={title} sheet>{children}</Modal>}
            arrow={<Icon name="arrow" size={19}/>} heart={<Icon name="heart" size={19}/>}
          />
        ) : isDetail ? (
          <CollectionDetailPage
            key={page}
            slug={page.split("/")[2] || ""}
            search={urlSearch}
            language={lang}
            mode={demoMode ? detailMode : liveCatalog.status}
            collections={collections}
            categories={categories}
            products={demoMode ? undefined : liveCatalog.data.products}
            bundles={demoMode ? undefined : []}
            demo={demoMode}
            onNavigate={navigate}
            onQueryChange={updateDetailQuery}
            onRetry={demoMode ? retryDetail : liveCatalog.retry}
            favorites={favorites}
            signedIn={signedIn}
            onFavorite={toggleFavorite}
            renderMedia={(color, kind, hero) => (
              <Mockup color={color} kind={kind} hero={hero} />
            )}
            renderSheet={(open, onClose, title, children) => (
              <Modal open={open} onClose={onClose} title={title} sheet>
                {children}
              </Modal>
            )}
            arrow={<Icon name="arrow" size={19} />}
            heart={<Icon name="heart" size={19} />}
          />
        ) : isCollections ? (
          <CollectionsPage
            language={lang}
            mode={demoMode ? collectionsMode : liveCatalog.collectionsStatus}
            collections={collections}
            onNavigate={navigate}
            onRetry={demoMode ? retryCollections : liveCatalog.retry}
            renderMedia={(c) => (
              <Mockup
                color={c.color}
                kind={c.id === "love" ? "bookmark" : "book"}
              />
            )}
            arrow={<Icon name="arrow" size={19} />}
          />
        ) : (
          <>
            <section className="container hero">
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="tiny-line" />
                  {t("نیل‌آرت استودیو", "NILART STUDIO")}
                </div>
                <h1>
                  {t("دنیای کوچک هنر،", "A little world of art,")}
                  <br />
                  <span>{t("برای روزهای شما", "for your everyday life")}</span>
                </h1>
                <p>
                  {t(
                    "از دفتر و استیکر تا نقاشی و پکیج‌های هنری؛ کالکشن محبوبتان را پیدا کنید و هنر را به روزمره‌تان بیاورید.",
                    "From notebooks and stickers to paintings and art bundles, discover your favorite collection and bring art into everyday life.",
                  )}
                </p>
                <div className="hero-buttons">
                  {arrowLink(
                    t("کشف کالکشن‌ها", "Explore collections"),
                    "/collections",
                    "button primary",
                  )}
                  {link(
                    t("سفارش نقاشی", "Commission artwork"),
                    "/commissions/new",
                    "button secondary",
                  )}
                </div>
                {arrowLink(
                  t("مشاهده فروشگاه", "Browse the shop"),
                  "/shop",
                  "text-link hero-shop",
                )}
                <div className="hero-note">
                  <span className="small-spark">✳</span>
                  {t(
                    "یک طرح، چند انتخاب؛ یک دنیای هنری برای شما.",
                    "One design, many possibilities. A little world of your own.",
                  )}
                </div>
              </div>
              <div className="hero-visual">
                <div className="hero-art-label">
                  <span>THE EVERYDAY COLLECTION</span>
                  <span>01 — 05</span>
                </div>
                <Mockup hero color="sage" />
                <div className="image-caption">
                  <span>
                    {t(
                      "جایی برای ایده‌های کوچک و بزرگ",
                      "A place for ideas, big and small",
                    )}
                  </span>
                  <span className="handwritten">a little art, every day.</span>
                </div>
                <span className="asset-notice">
                  {t(
                    "ماکت نمایشی · تصاویر واقعی برند جایگزین می‌شوند",
                    "Sample mockup · awaiting original brand photography",
                  )}
                </span>
              </div>
            </section>

            <section
              className="container section collections-section"
              id="collections"
            >
              <SectionHeading
                number="01"
                title={t(
                  "کالکشن محبوبت را پیدا کن",
                  "Find your favorite collection",
                )}
                description={t(
                  "یک طرح، چند انتخاب؛ همه محصولات هر کالکشن را یکجا ببین.",
                  "One collection, many possibilities. Explore its products together.",
                )}
                action={t("همه کالکشن‌ها", "All collections")}
                route="/collections"
              />
              {!demoMode && homeCollectionsMode === "error" ? (
                <div className="empty-state" role="alert">
                  {t("بارگذاری کالکشن‌ها انجام نشد.", "We couldn't load the collections.")}
                  <button className="button secondary" onClick={liveCatalog.retry}>{t("دوباره تلاش کنید", "Try again")}</button>
                </div>
              ) : homeCollectionsMode === "empty" || (homeCollectionsMode !== "loading" && collections.length === 0) ? (
                <div className="empty-state">
                  {t(
                    "هنوز کالکشنی منتشر نشده است.",
                    "No collections are published yet.",
                  )}{" "}
                  {arrowLink(t("مشاهده فروشگاه", "Browse the shop"), "/shop")}
                </div>
              ) : (
                <div className="collection-grid">
                  {!demoMode && homeCollectionsMode === "loading" && Array.from({ length: 5 }, (_, i) => <CollectionSkeleton key={i} compact />)}
                  {collections
                    .filter((c) => c.published)
                    .map((c, i) =>
                      homeCollectionsMode === "loading" ? (
                        <CollectionSkeleton key={c.id} compact />
                      ) : (
                        <CollectionCard
                          key={c.id}
                          collection={c}
                          language={lang}
                          onNavigate={navigate}
                          compact
                          media={
                            <>
                              <Mockup
                                color={c.color}
                                kind={i === 4 ? "bookmark" : "book"}
                              />
                              <span className="collection-index">0{i + 1}</span>
                            </>
                          }
                          arrow={<Icon name="arrow" size={20} />}
                        />
                      ),
                    )}
                </div>
              )}
              <p className="data-disclaimer">
                {t(
                  "تصاویر و محصولات این صفحه نمونه طراحی هستند؛ طرح‌های اصلی کالکشن‌ها پس از دریافت جایگزین می‌شوند.",
                  "Images and products are design samples; original collection artwork will be added when supplied.",
                )}
              </p>
            </section>

            <section className="category-section">
              <div className="container section">
                <SectionHeading
                  number="02"
                  title={t(
                    "برای چه چیزی دنبال هنر می‌گردی؟",
                    "What are you looking for?",
                  )}
                  description={t(
                    "این بار از نوع محصول شروع کن، بعد طرح مورد علاقه‌ات را انتخاب کن.",
                    "Start with a product, then find the design you love.",
                  )}
                />
                <div className="category-grid">
                  {categories.map((c) =>
                    link(
                      local(c.name),
                      `/${lang === 0 ? "fa" : "en"}/categories/${c.id}`,
                      "category-card",
                      <>
                        <div className="category-art">
                          <Mockup color={c.color} kind={c.kind} />
                        </div>
                        <div>
                          <h3>{local(c.name)}</h3>
                          <span>
                            {t("کشف محصولات", "Discover products")}{" "}
                            <Icon name="arrow" size={17} />
                          </span>
                        </div>
                      </>,
                    ),
                  )}
                </div>
              </div>
            </section>

            <section className="container section">
              <SectionHeading
                number="03"
                title={t("انتخاب‌های نیل‌آرت", "NilArt picks")}
                description={t(
                  "محصولاتی برای نوشتن، طراحی کردن و همراه‌داشتن هنر.",
                  "Made for writing, drawing, and keeping art close.",
                )}
                action={t("مشاهده همه محصولات", "View all products")}
                route="/shop"
              />
              {homeMode === "error" ? (
                <div className="inline-error" role="alert">
                  <p>
                    {t(
                      "بارگذاری این بخش انجام نشد",
                      "This section couldn't be loaded",
                    )}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => demoMode ? setMode("normal") : liveCatalog.retry()}
                  >
                    {t("دوباره تلاش کنید", "Try again")}
                  </button>
                </div>
              ) : homeMode === "empty" || (homeMode !== "loading" && products.length === 0) ? (
                <div className="empty-state">
                  {t(
                    "محصول منتخبی برای نمایش نداریم.",
                    "No featured products to show.",
                  )}{" "}
                  {arrowLink(t("مشاهده فروشگاه", "Browse the shop"), "/shop")}
                </div>
              ) : (
                <div className="product-grid" aria-busy={homeMode === "loading"}>
                  {!demoMode && homeMode === "loading" && Array.from({ length: 4 }, (_, i) => <div className="skeleton-card" key={i}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /></div>)}
                  {products.map((p) =>
                    homeMode === "loading" ? (
                      <div className="skeleton-card" key={p.id}>
                        <div className="skeleton skeleton-image" />
                        <div className="skeleton skeleton-line" />
                        <div className="skeleton skeleton-line short" />
                        <div className="skeleton skeleton-line" />
                      </div>
                    ) : (
                      <ProductCard
                        key={p.id}
                        name={local(p.name)}
                        route={`/products/${p.id}`}
                        collection={
                          collections[p.collection] ? t("کالکشن ", "") +
                          local(collections[p.collection].name) +
                          t("", " collection") : ""
                        }
                        options={p.options}
                        price={p.available ? p.price : undefined}
                        language={lang}
                        media={
                          <Mockup
                            color={collections[p.collection]?.color || "sage"}
                            kind={p.kind}
                          />
                        }
                        arrow={<Icon name="arrow" size={19} />}
                        heart={<Icon name="heart" size={19} />}
                        onNavigate={navigate}
                        favorite={demoMode && favorites.includes(
                          p.id === productSlug ? "cat-sketch-127" : p.id,
                        )}
                        onFavorite={() =>
                          toggleFavorite(
                            p.id === productSlug ? "cat-sketch-127" : p.id,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </section>

            {(!demoMode || mode !== "empty") && (
              <section className="bundle-section">
                <div className="container section">
                  <SectionHeading
                    number="04"
                    title={t("کنار هم، دوست‌داشتنی‌تر", "Better together")}
                    description={t(
                      "چند محصول هماهنگ از کالکشن محبوبت، در یک پکیج.",
                      "Matching products from your favorite collection, in one bundle.",
                    )}
                    action={t("همه پکیج‌ها", "All bundles")}
                    route="/bundles"
                  />
                  <div className="bundle-grid">
                    {!demoMode && <div className="empty-state">{t("هنوز پکیجی منتشر نشده است.", "No bundles have been published yet.")}</div>}
                    {(demoMode ? [0, 1] : []).map((i) =>
                      mode === "loading" ? (
                        <div key={i} className="skeleton skeleton-bundle" />
                      ) : (
                        <article className="bundle-card" key={i}>
                          <div className="bundle-image">
                            {i === 0 ? (
                              <BundleStillLife
                                renderMedia={(color, kind) => (
                                  <Mockup color={color} kind={kind} />
                                )}
                              />
                            ) : (
                              <Mockup color={collections[i].color} hero />
                            )}
                          </div>
                          <div className="bundle-info">
                            <span className="eyebrow">A LITTLE SET OF JOY</span>
                            <h3>
                              {t(
                                `پکیج ${collections[i].name[0]}`,
                                `${collections[i].name[1]} bundle`,
                              )}
                            </h3>
                            <p>
                              {t(
                                "یک دفتر + دو استیکر + یک نشانک",
                                "1 notebook + 2 stickers + 1 bookmark",
                              )}
                            </p>
                            {i !== 0 || catsPreview ? (
                              <div className="bundle-prices">
                                <span>
                                  <s>
                                    {(i === 0
                                      ? catsPreview.separate
                                      : 255000
                                    ).toLocaleString(
                                      lang === 0 ? "fa-IR" : "en-US",
                                    )}
                                  </s>
                                  <small>
                                    {t("مجموع اجزا", "Separate total")}
                                  </small>
                                </span>
                                <span className="bundle-final">
                                  {i === 0 && <span>{t("از ", "From ")}</span>}
                                  <strong>
                                    {(i === 0
                                      ? catsPreview.price
                                      : 230000
                                    ).toLocaleString(
                                      lang === 0 ? "fa-IR" : "en-US",
                                    )}
                                  </strong>{" "}
                                  {t("تومان", "toman")}
                                </span>
                              </div>
                            ) : (
                              <p className="unavailable">
                                {t("ناموجود", "Out of stock")}
                              </p>
                            )}
                            <small className="demo-price">
                              {t(
                                "داده نمایشی · تخفیف پکیج: ",
                                "Demo data · bundle saving: ",
                              )}
                              {(i === 0 ? 30000 : 25000).toLocaleString(
                                lang === 0 ? "fa-IR" : "en-US",
                              )}{" "}
                              {t("تومان", "toman")}
                            </small>
                            {arrowLink(
                              t("مشاهده پکیج", "View bundle"),
                              i === 0
                                ? `/bundles/${bundleSlug}`
                                : `/bundles/${collections[i].id}`,
                              "text-link",
                            )}
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="container section artwork-section">
              <SectionHeading
                number="05"
                title={t("هنر، نزدیک‌تر به شما", "Art, made personal")}
                description={t(
                  "گاهی هنر را انتخاب می‌کنی، گاهی از داستان تو شروع می‌شود.",
                  "Sometimes you find your art. Sometimes it begins with your story.",
                )}
              />
              <div className="artwork-grid">
                <article className="artwork-card">
                  <div className="art-placeholder">
                    <div className="picture-frame">
                      <div className="abstract-art">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                    <small>
                      {t(
                        "جای‌نگهدار اثر · نه اثر واقعی برند",
                        "Artwork placeholder · not brand artwork",
                      )}
                    </small>
                  </div>
                  <div className="artwork-copy">
                    <span className="eyebrow">ORIGINAL ARTWORKS</span>
                    <h3>{t("نقاشی‌های آماده", "Original artworks")}</h3>
                    <p>
                      {t(
                        "آثاری برای دیدن، انتخاب‌کردن و داشتن.",
                        "Artworks to discover, choose, and make your own.",
                      )}
                    </p>
                    {arrowLink(
                      t("مشاهده نقاشی‌ها", "Explore artworks"),
                      "/artworks",
                      "text-link",
                    )}
                  </div>
                </article>
                <article className="commission-card">
                  <span className="commission-mark">
                    <Icon name="plus" size={42} />
                  </span>
                  <span className="eyebrow">YOUR STORY, ON CANVAS</span>
                  <h3>{t("نقاشی مخصوص شما", "Art made for you")}</h3>
                  <p>
                    {t(
                      "عکس یا ایده‌تان را به یک اثر اختصاصی تبدیل کنید. یک یادگاری، به زبان هنر.",
                      "Turn your photo or idea into a personal artwork. A keepsake, in the language of art.",
                    )}
                  </p>
                  {arrowLink(
                    t("شروع سفارش نقاشی", "Start a commission"),
                    "/commissions/new",
                    "button primary",
                  )}
                  <span className="commission-note">
                    {t(
                      "مسیر مستقل سفارش اختصاصی",
                      "A separate path for personal commissions",
                    )}
                  </span>
                </article>
              </div>
            </section>

            <section className="container trust-section">
              {([
                {
                  icon: "check",
                  title: ["انتخاب روشن", "Clear choices"],
                  desc: [
                    "سایز، تعداد برگ و مشخصات هر محصول را پیش از خرید ببین.",
                    "Review size, sheet count, and product details before buying.",
                  ],
                },
                {
                  icon: "box",
                  title: ["پیگیری سفارش", "Order tracking"],
                  desc: [
                    "وضعیت آماده‌سازی و ارسال سفارشت را دنبال کن.",
                    "Follow your order's preparation and delivery.",
                  ],
                },
                {
                  icon: "book",
                  title: ["راهنمای خرید", "Buying guidance"],
                  desc: [
                    "برای انتخاب کاغذ، سایز و جلد مناسب راهنما بخوان.",
                    "Get help choosing the right paper, size, and cover.",
                  ],
                },
              ] as TrustItem[]).map((item, i) => (
                <div className="trust-item" key={item.icon}>
                  <div className="trust-icon">
                    <Icon name={item.icon} size={27} />
                  </div>
                  <div>
                    <h3>{local(item.title)}</h3>
                    <p>{local(item.desc)}</p>
                    {i === 2 &&
                      arrowLink(
                        t("راهنمای انتخاب دفتر", "Notebook buying guide"),
                        "/guides/notebooks",
                      )}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>

      {!isCheckout && (
        <footer>
          <div className="container footer-main">
            <div className="footer-brand">
              <a
                className="wordmark"
                href="/"
                onClick={(e) => {
                  e.preventDefault()
                  navigate(t("خانه", "Home"), "/")
                }}
              >
                <span>
                  nilart<span className="wordmark-dot">.</span>
                </span>
                <small>ART & EVERYDAY</small>
              </a>
              <p>
                {t("محصولات هنری برای روزمره،", "Art for everyday life,")}
                <br />
                {t("و آثاری برای ماندن.", "and artworks to keep.")}
              </p>
              <span className="handwritten">made with a little love.</span>
            </div>
            {[
              {
                title: t("کشف", "Discover"),
                links: [
                  [t("کالکشن‌ها", "Collections"), "/collections"],
                  [t("فروشگاه", "Shop"), `/${lang === 0 ? "fa" : "en"}/shop`],
                  [t("پکیج‌ها", "Bundles"), "/bundles"],
                  [t("نقاشی‌ها", "Artworks"), "/artworks"],
                ],
              },
              {
                title: t("راهنما", "Help"),
                links: [
                  [t("راهنمای خرید", "Buying guide"), "/guides/buying"],
                  [t("سؤالات متداول", "FAQ"), "/faq"],
                  [
                    t("پیگیری سفارش", "Track order"),
                    `/${lang === 0 ? "fa" : "en"}/track-order`,
                  ],
                  [
                    t("لغو و مرجوعی", "Returns"),
                    `/${lang === 0 ? "fa" : "en"}/returns`,
                  ],
                ],
              },
              {
                title: t("نیل‌آرت", "NilArt"),
                links: [
                  [t("درباره ما", "About"), `/${lang === 0 ? "fa" : "en"}/about`],
                  [t("تماس", "Contact"), `/${lang === 0 ? "fa" : "en"}/contact`],
                  [t("قوانین خرید", "Terms"), `/${lang === 0 ? "fa" : "en"}/terms`],
                  [t("حریم خصوصی", "Privacy"), "/privacy"],
                ],
              },
            ].map((group) => (
              <div className="footer-group" key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map(([name, route]) => (
                  <div key={route}>{link(name, route)}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} NilArt Studio.{" "}
              {t("تمام حقوق محفوظ است.", "All rights reserved.")}
            </span>
            <button className="foundation-link" disabled={!demoMode} onClick={() => demoMode && setLab(true)}>
              {t("سیستم طراحی و حالت‌ها", "Design system & states")}
            </button>
            <button className="language-button" onClick={switchLanguage}>
              {lang === 0 ? "English / EN" : "فارسی / FA"} <span>↔</span>
            </button>
          </div>
        </footer>
      )}

      <Modal
        open={drawer}
        onClose={() => setDrawer(false)}
        title={t("دنیای نیل‌آرت", "The NilArt world")}
        drawer
      >
        <nav className="drawer-nav">
          {nav.map(([name, route]) => (
            <div key={route}>{arrowLink(name, route)}</div>
          ))}
        </nav>
        <div className="drawer-collections">
          {collections
            .filter((c) => c.published)
            .map((c) =>
              link(
                local(c.name),
                `/collections/${c.slug}`,
                `drawer-collection ${c.color}`,
              ),
            )}
        </div>
        <div className="drawer-bottom">
          <button
            className="button secondary"
            onClick={() =>
              navigate(
                t("حساب من", "My account"),
                signedIn ? "/account" : "/login",
              )
            }
          >
            <Icon name="user" />
            {t("حساب من", "My account")}
          </button>
          <button className="button secondary" onClick={switchLanguage}>
            {lang === 0 ? "English" : "فارسی"}
          </button>
        </div>
      </Modal>
      <Modal
        open={search}
        onClose={() => setSearch(false)}
        title={t("دنبال چه می‌گردی؟", "What are you looking for?")}
      >
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(
              t("نتایج جست‌وجو", "Search results"),
              `/search?q=${encodeURIComponent(query)}`,
            )
          }}
        >
          <label htmlFor="search-input">
            {t("جست‌وجوی محصول یا کالکشن", "Search products or collections")}
          </label>
          <div className="search-field">
            <Icon name="search" />
            <input
              id="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("مثلاً دفتر یا گربه…", "Try a notebook or Cats…")}
            />
            <button className="button primary" type="submit">
              {t("جست‌وجو", "Search")}
            </button>
          </div>
        </form>
        <div className="search-suggestions">
          {(query.trim()
            ? collections.filter((c) =>
                local(c.name).toLowerCase().includes(query.toLowerCase()),
              )
            : collections
          ).map((c) => (
            <div key={c.id}>
              {arrowLink(local(c.name), `/collections/${c.slug}`)}
            </div>
          ))}
        </div>
      </Modal>
      <Modal
        open={!!destination}
        onClose={closeDestination}
        title={destination?.name || ""}
      >
        <div className="destination">
          <span className="eyebrow">
            {t("مقصد پروتوتایپ", "PROTOTYPE DESTINATION")}
          </span>
          <p>
            {t(
              "این مسیر برای مرحله بعد مشخص شده است. صفحه مقصد در این نمونه طراحی نشده و خرید یا ورود واقعی انجام نمی‌شود.",
              "This route is defined for the next phase. Destination pages are not designed in this prototype; no real purchase or sign-in is performed.",
            )}
          </p>
          <code dir="ltr">{destination?.route}</code>
          <button className="button primary" onClick={closeDestination}>
            {isQuote
              ? t("بازگشت به پیشنهاد سفارش", "Back to order proposal")
              : isAssessment
              ? t("بازگشت به ارزیابی", "Back to assessment")
              : isPreferences
              ? t("بازگشت به سبک و اجرا", "Back to style and execution")
              : isReferences
              ? t("بازگشت به تصویر و توضیحات", "Back to references and brief")
              : isCommissions
              ? t("بازگشت به شروع سفارش", "Back to commission introduction")
              : isCollections
              ? t("بازگشت به کالکشن‌ها", "Back to collections")
              : t("بازگشت به هوم‌پیج", "Back to homepage")}
          </button>
        </div>
      </Modal>
      <Modal
        open={demoMode && lab}
        onClose={() => setLab(false)}
        title={t("پایه سیستم طراحی", "Design system foundation")}
      >
        <div className="foundation">
          {isTerms && (
            <div className="foundation-controls">
              <label htmlFor="terms-state">{t("حالت قوانین خرید · Demo", "Purchase terms state · Demo")}</label>
              <select id="terms-state" value={termsMode} onChange={event => setTermsMode(event.target.value)}>
                {[
                  ["normal", t("متن آموزشی نمونه", "Educational sample")],
                  ["loading", t("بارگذاری", "Loading")],
                  ["empty", t("شرایط منتشرنشده", "Unpublished terms")],
                  ["error", t("خطای دریافت", "Loading error")],
                  ["translation", t("ترجمه منتشرنشده", "Unpublished translation")],
                ].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p>{t("PUB-22 · داده حقوقی مصوب ارائه نشده است؛ متن آموزشی Demo است. خلاصه و متن کامل از یک منبع می‌آیند. نسخه و تاریخ فرضی، selector نسخه‌های ناموجود و کنترل پذیرش checkout ساخته نشده‌اند.", "PUB-22 · No approved legal document was supplied; copy is educational Demo content. Summary and full text share one source. No invented metadata, unsupported version selector or checkout acceptance control.")}</p>
            </div>
          )}
          {isContact && (
            <div className="foundation-controls">
              <label htmlFor="contact-state">{t("حالت تماس با ما · Demo", "Contact page state · Demo")}</label>
              <select id="contact-state" value={contactMode} onChange={event => setContactMode(event.target.value)}>
                {contactPreviewModes.map(item => <option key={item.id} value={item.id}>{item.label[lang]}</option>)}
              </select>
              <p>{t("PUB-19 · فرم عمومی بدون پیوست. کانال، آدرس، زمان پاسخ و شماره پیگیری فرضی ساخته نشده است. فرم، موضوع‌ها و روش‌های پاسخ Demo هستند؛ رسید موفقیت فقط نمایشی است و نتیجه نامشخص با همان درخواست بازیابی می‌شود.", "PUB-19 · Public form, no attachments. No invented channels, address, response time or message reference. Form, topics and reply methods are Demo-only; the receipt is simulated and an uncertain result is recovered using the same request.")}</p>
            </div>
          )}
          {isAbout && (
            <div className="foundation-controls">
              <label htmlFor="about-state">{t("حالت درباره ما · Demo", "About page state · Demo")}</label>
              <select id="about-state" value={aboutMode} onChange={event => setAboutMode(event.target.value)}>
                {[
                  ["normal", t("صفحه کامل؛ بدون داستان ساختگی", "Full page; no invented story")],
                  ["loading", t("بارگذاری محدود", "Partial loading")],
                  ["dynamic-error", t("خطای محتوای کالکشن‌ها", "Collection content error")],
                  ["image-error", t("تصویر ناموجود", "Image unavailable")],
                  ["story-slot", t("محل بخش داستان اختیاری", "Optional story slot")],
                  ["no-collections", t("بدون کالکشن منتخب", "No featured collections")],
                  ["translation", t("ترجمه منتشرنشده", "Unpublished translation")],
                ].map(([value,label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p>{t("PUB-18 · معرفی نمونه از متن brief. عکس واقعی برند، مؤسس یا کارگاه ارائه نشده؛ تصاویر جای‌نگهدارند. نام کالکشن‌ها و مسیرها از داده پروژه می‌آیند؛ برای qolche نام فارسی ساخته نشده است.", "PUB-18 · Sample introduction from the brief. No brand, founder or studio photography supplied; visuals are placeholders. Collection names and routes come from project data; no Persian name is invented for qolche.")}</p>
            </div>
          )}
          {isReturns && (
            <div className="foundation-controls">
              <label htmlFor="returns-state">
                {t(
                  "حالت شرایط لغو و مرجوعی · Demo",
                  "Returns policy state · Demo",
                )}
              </label>
              <select
                id="returns-state"
                value={returnsMode}
                onChange={(event) => setReturnsMode(event.target.value)}
              >
                {[
                  ["normal", t("نمونه کامل", "Full sample")],
                  ["loading", t("بارگذاری", "Loading")],
                  ["unpublished", t("سیاست منتشرنشده", "Unpublished policy")],
                  [
                    "empty-section",
                    t(
                      "شرایط نوع انتخاب‌شده منتشرنشده",
                      "Unpublished selected section",
                    ),
                  ],
                  ["network", t("خطای شبکه", "Network error")],
                  ["service", t("خطای سرویس", "Service error")],
                  [
                    "translation",
                    t("ترجمه منتشرنشده", "Unpublished translation"),
                  ],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p>
                {t(
                  "PUB-24 · راهنمای عمومی، نه فرم درخواست. هیچ مهلت، مبلغ، نسخه یا تاریخ فرضی منتشر نمی‌شود. شرط‌های قطعی باید از سیاست مصوب و توافق تاریخی همان خرید دریافت شوند.",
                  "PUB-24 · Public guide, not a request form. No invented deadlines, amounts, versions or dates. Definitive conditions must come from approved policy and the historical purchase agreement.",
                )}
              </p>
            </div>
          )}
          {isTracking && (
            <div className="foundation-controls">
              <label htmlFor="tracking-state">
                {t("حالت پیگیری سفارش · Demo", "Order tracking state · Demo")}
              </label>
              <select
                id="tracking-state"
                value={trackingMode}
                onChange={(event) => setTrackingMode(event.target.value)}
              >
                {trackingPreviewModes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label[lang]}
                  </option>
                ))}
              </select>
              <p>
                {t(
                  "PUB-17 · داده‌ها، کد 123456، کشورها و زمان‌ها فقط Demo هستند؛ هیچ پیامک یا تأیید سفارش واقعی انجام نمی‌شود. فرمت سفارش، طول کد، زمان انتظار، مجوز نتیجه و لینک حمل باید از سرویس معتبر دریافت شوند.",
                  "PUB-17 · Data, code 123456, countries and timings are Demo-only; no SMS or real order verification. The order format, code length, waiting period, result authorization and carrier link must come from a trusted service.",
                )}
              </p>
            </div>
          )}
          {isFAQ && (
            <div className="foundation-controls">
              <label htmlFor="faq-state">
                {t("حالت سؤالات متداول", "FAQ state")}
              </label>
              <select
                id="faq-state"
                value={faqMode}
                onChange={(event) => setFaqMode(event.target.value)}
              >
                {[
                  ["normal", t("عادی", "Normal")],
                  ["loading", t("بارگذاری", "Loading")],
                  ["error", t("خطای دریافت", "Loading error")],
                  ["empty", t("هیچ سؤال منتشر نشده", "Unpublished FAQ")],
                  ["topic-empty", t("موضوع خالی", "Empty topic")],
                  [
                    "translation",
                    t("ترجمه موجود نیست", "Translation unavailable"),
                  ],
                  ["removed", t("سؤال حذف‌شده", "Removed question")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p>
                {t(
                  "PUB-20 · متن نمونه از brief؛ فقط محتوای مصوب در نسخه واقعی منتشر می‌شود. جست‌وجو محلی است و داده خصوصی سفارش ندارد. موضوع، عبارت و پاسخ‌های باز مستقل‌اند.",
                  "PUB-20 · Sample brief content; publish only approved copy in production. Local search, no private order data. Topic, query and open answers are independent.",
                )}
              </p>
            </div>
          )}
          {isBuyingGuide && (
            <div className="foundation-controls">
              <label htmlFor="guide-state">
                {t("حالت راهنمای خرید", "Buying guide state")}
              </label>
              <select
                id="guide-state"
                value={guideMode}
                onChange={(event) => setGuideMode(event.target.value)}
              >
                {[
                  ["normal", t("محتوای کامل", "Complete guide")],
                  ["loading", t("بارگذاری", "Loading")],
                  ["error", t("خطای بارگذاری", "Loading error")],
                  ["empty", t("منتشرنشده", "Unpublished")],
                  [
                    "translation",
                    t("ترجمه موجود نیست", "Translation unavailable"),
                  ],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p>
                {t(
                  "PUB-21 · صفحه آموزشی عمومی. مثال‌ها نمایشی‌اند. کالکشن مستقل از دسته است؛ گرماژ، برگ و تعداد خرید مستقل‌اند. راهنمای تخصصی دفتر /guides/notebooks هنوز منتشر نشده و به FAQ هدایت می‌شود.",
                  "PUB-21 · Public educational page. Illustrative examples. Collections are independent of categories; paper weight, sheets and purchase quantity are independent. /guides/notebooks is unpublished and falls back to FAQ.",
                )}
              </p>
            </div>
          )}
          <p>
            {t(
              "نسخه نمایشی قابل تحویل · بدون اتصال به سرور یا پرداخت",
              "Handoff prototype · no backend or payment connection",
            )}
          </p>
          <h3>{t("رنگ‌ها", "Colors")}</h3>
          <div className="swatches">
            {[
              "canvas",
              "surface",
              "text",
              "muted",
              "border",
              "accent",
              "accent-hover",
              "success",
              "error",
              "warning",
            ].map((color) => (
              <div key={color}>
                <span className={`swatch swatch-${color}`} />
                <small>{color}</small>
              </div>
            ))}
          </div>
          <h3>Typography</h3>
          <h2>{t("هنر برای روزهای شما", "Art for your everyday")}</h2>
          <p>Vazirmatn / Inter · Body 16/28 · H1 48/60 · H2 32/40</p>
          <h3>Spacing / Radius / Grid</h3>
          <p dir="ltr">
            4 · 8 · 12 · 16 · 24 · 32 · 48 · 64
            <br />
            Radius: 8 / 14 / 24
            <br />
            Max width: 1280 · Grid: 4 / 3 / 2
          </p>
          <h3>{t("کامپوننت‌ها", "Components")}</h3>
          <div className="foundation-buttons">
            <button className="button primary">
              {t("دکمه اصلی", "Primary")}
            </button>
            <button className="button secondary">
              {t("دکمه ثانویه", "Secondary")}
            </button>
            <button className="button primary" disabled>
              {t("غیرفعال", "Disabled")}
            </button>
            <button className="button secondary" disabled aria-busy="true">
              {t("در حال بارگذاری…", "Loading…")}
            </button>
          </div>
          <h3>{t("حالت‌های صفحه", "Page states")}</h3>
          {isCart && (
            <>
              <label htmlFor="cart-state-select">
                {t("حالت سبد", "Cart state")}
              </label>
              <select
                id="cart-state-select"
                value={cartMode}
                onChange={(event) => {
                  const value = event.target.value
                  if (
                    [
                      "mixed",
                      "approved-quote",
                      "expired-quote",
                      "original-artwork",
                      "only-pending",
                      "empty",
                    ].includes(value)
                  )
                    loadCartDemo(value)
                  else {
                    if (value === "price-change") setCartLivePrices({})
                    if (
                      [
                        "stock-reduced",
                        "stock-conflict",
                        "bundle-unavailable",
                      ].includes(value)
                    )
                      setCartLiveStocks({})
                    setCartMode(value)
                  }
                }}
              >
                {[
                  ["normal", t("سبد فعلی", "Current cart")],
                  ["mixed", t("سبد مختلط — نمونه", "Mixed cart — demo")],
                  [
                    "expanded",
                    t("اجزای پکیج باز", "Bundle components expanded"),
                  ],
                  [
                    "stacking",
                    t("stacking مجاز — نمونه", "Stacking allowed — demo"),
                  ],
                  [
                    "price-change",
                    t("تغییر قیمت مشترک", "Shared price change"),
                  ],
                  ["stock-reduced", t("موجودی کاهش‌یافته", "Reduced stock")],
                  [
                    "stock-conflict",
                    t("تعارض SKU محصول و پکیج", "Product/bundle SKU conflict"),
                  ],
                  [
                    "bundle-unavailable",
                    t("جزء پکیج ناموجود", "Bundle component unavailable"),
                  ],
                  [
                    "approved-quote",
                    t(
                      "quote نهایی تأییدشده — نمونه",
                      "Approved final quote — demo",
                    ),
                  ],
                  [
                    "expired-quote",
                    t("quote منقضی — نمونه", "Expired quote — demo"),
                  ],
                  [
                    "original-artwork",
                    t("اثر آماده — نمونه", "Original artwork — demo"),
                  ],
                  [
                    "only-pending",
                    t(
                      "فقط درخواست منتظر — نمونه",
                      "Pending request only — demo",
                    ),
                  ],
                  [
                    "quantity-error",
                    t("خطای تعداد و rollback", "Quantity error & rollback"),
                  ],
                  [
                    "deleted",
                    t("قلم حذف‌شده از کاتالوگ", "Catalog item removed"),
                  ],
                  ["offline", t("قطع اتصال", "Offline")],
                  ["loading", t("بارگذاری", "Loading")],
                  ["load-error", t("خطای دریافت سبد", "Cart load error")],
                  ["empty", t("سبد خالی — نمونه", "Empty cart — demo")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p>
                {t(
                  "حالت‌های دارای «نمونه»، داده نمایشی جایگزین سبد می‌کنند. سایر حالت‌ها داده فعلی را حفظ می‌کنند.",
                  "States marked demo replace the local cart with sample data. Other states preserve current items.",
                )}
              </p>
              <p dir="ltr">Demo codes: NILART10 · EXPIRED · MINIMUM · USED</p>
              <button
                className="button secondary"
                onClick={() => {
                  loadCartDemo()
                  setLab(false)
                }}
              >
                {t("مشاهده سبد مختلط نمونه", "View mixed demo cart")}
              </button>
            </>
          )}
          {isBundle && (
            <>
              <label htmlFor="bundle-state-select">
                {t("حالت پکیج", "Bundle state")}
              </label>
              <select
                id="bundle-state-select"
                value={bundleMode}
                onChange={(e) => setBundleMode(e.target.value)}
              >
                {[
                  ["normal", t("عادی", "Normal")],
                  ["loading", t("بارگذاری اولیه", "Initial loading")],
                  ["recalculating", t("محاسبه قیمت", "Recalculating")],
                  [
                    "component-unavailable",
                    t(
                      "دفتر انتخاب‌شده ناموجود؛ جایگزین مجاز",
                      "Unavailable notebook; allowed alternative",
                    ),
                  ],
                  [
                    "all-unavailable",
                    t("همه ترکیب‌ها ناموجود", "All combinations unavailable"),
                  ],
                  [
                    "stock-change",
                    t("کاهش موجودی هنگام افزودن", "Stock changes on add"),
                  ],
                  [
                    "price-change",
                    t("تغییر قیمت هنگام افزودن", "Price changes on add"),
                  ],
                  ["add-error", t("خطای افزودن و Retry", "Add error & retry")],
                  ["not-found", t("پکیج یافت‌نشده", "Bundle not found")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <h3>{t("انتخاب‌های نمونه", "Sample combinations")}</h3>
              <div className="foundation-buttons">
                {[
                  ["incomplete", t("انتخاب ناقص", "Incomplete selection")],
                  [
                    "one",
                    t(
                      "A5 · ۵۰ برگ · ۲ میلی‌متر · ۱ پکیج",
                      "A5 · 50 sheets · 2 mm · 1 bundle",
                    ),
                  ],
                  [
                    "two",
                    t("همان ترکیب · ۲ پکیج", "Same selection · 2 bundles"),
                  ],
                  [
                    "unavailable",
                    t("جزء دفتر ناموجود", "Notebook out of stock"),
                  ],
                  ["incompatible", t("گزینه ناسازگار", "Unsupported option")],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className="button secondary"
                    onClick={() => {
                      setBundleMode("normal")
                      setBundlePreset(`${value}:${Date.now()}`)
                      setLab(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          {isProduct && (
            <>
              <label htmlFor="product-state-select">
                {t("وضعیت جزئیات محصول", "Product detail state")}
              </label>
              <select
                id="product-state-select"
                value={productMode}
                onChange={(e) => setProductMode(e.target.value)}
              >
                {[
                  ["normal", t("عادی", "Normal")],
                  ["loading", t("بارگذاری اولیه", "Initial loading")],
                  ["sku-loading", t("بارگذاری SKU", "SKU loading")],
                  [
                    "all-unavailable",
                    t("همه گزینه‌ها ناموجود", "All variants unavailable"),
                  ],
                  [
                    "stock-change",
                    t("کاهش موجودی هنگام افزودن", "Stock changes on add"),
                  ],
                  [
                    "price-change",
                    t("تغییر قیمت هنگام افزودن", "Price changes on add"),
                  ],
                  [
                    "add-error",
                    t("خطای افزودن؛ Retry مجاز", "Add error; retry available"),
                  ],
                  [
                    "favorite-error",
                    t("خطای علاقه‌مندی", "Favorite save error"),
                  ],
                  ["not-found", t("محصول یافت‌نشده", "Product not found")],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <h3>{t("ترکیب‌های نمونه", "Sample combinations")}</h3>
              <div className="foundation-buttons">
                {[
                  [
                    "incomplete",
                    t("بدون انتخاب اولیه", "No initial selection"),
                  ],
                  [
                    "one",
                    t(
                      "A5 · ۵۰ برگ · ۲ میلی‌متر · ۱ دفتر",
                      "A5 · 50 sheets · 2 mm · 1 notebook",
                    ),
                  ],
                  [
                    "three",
                    t("همان ترکیب · ۳ دفتر", "Same variant · 3 notebooks"),
                  ],
                  [
                    "unavailable",
                    t("ترکیب ناموجود", "Unavailable combination"),
                  ],
                  ["incompatible", t("گزینه ناسازگار", "Incompatible option")],
                ].map(([value, label]) => (
                  <button
                    className="button secondary"
                    key={value}
                    onClick={() => {
                      setProductMode("normal")
                      setProductPreset(`${value}:${Date.now()}`)
                      setLab(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
          {!isProduct && !isBundle && !isCart && (
            <>
              <label htmlFor="state-select">
                {t("وضعیت محتوا", "Content state")}
              </label>
              <select
                id="state-select"
                value={
                  isDetail ? detailMode : isCollections ? collectionsMode : mode
                }
                onChange={(e) => {
                  if (isDetail) {
                    if (retryTimer.current) clearTimeout(retryTimer.current)
                    setDetailMode(e.target.value)
                  } else if (isCollections) {
                    if (retryTimer.current) clearTimeout(retryTimer.current)
                    setCollectionsMode(e.target.value)
                  } else setMode(e.target.value)
                }}
              >
                {[
                  ["normal", t("عادی", "Normal")],
                  ["loading", t("بارگذاری", "Loading")],
                  [
                    "error",
                    isDetail
                      ? t("خطای نتایج", "Results error")
                      : isCollections
                        ? t("خطای فهرست کالکشن‌ها", "Collection list error")
                        : t("خطای بخش محصولات", "Product section error"),
                  ],
                  [
                    isDetail ? "unpublished" : "empty",
                    t("بدون محتوای منتشرشده", "No published content"),
                  ],
                  ...(isCollections
                    ? [["image-fallback", t("تصویر جایگزین", "Image fallback")]]
                    : []),
                  ...(isDetail
                    ? [
                        [
                          "results-loading",
                          t("بارگذاری نتایج", "Results loading"),
                        ],
                        [
                          "all-unavailable",
                          t("همه ناموجود", "All out of stock"),
                        ],
                        [
                          "not-found",
                          t("کالکشن یافت‌نشده", "Collection not found"),
                        ],
                        ["pagination", t("صفحه‌بندی نمایشی", "Demo pagination")],
                        [
                          "favorite-error",
                          t("خطای ذخیره علاقه‌مندی", "Favorite save error"),
                        ],
                      ]
                    : []),
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={signedIn}
              onChange={(e) => setSignedIn(e.target.checked)}
            />
            {t(
              "نمایش کاربر واردشده (صرفاً نمونه محلی)",
              "Signed-in user (local demo only)",
            )}
          </label>
          <button className="button primary" onClick={() => setLab(false)}>
            {t("مشاهده حالت انتخاب‌شده", "View selected state")}
          </button>
          <h3>{t("یادداشت تحویل", "Handoff notes")}</h3>
          {isCart && (
            <div className="detail-handoff">
              <p>
                {t(
                  "PUB-09 · نوع ردیف محصول، پکیج، اثر آماده و سفارش نقاشی جداست. نیاز به SKU بین محصول و همه اجزای پکیج تجمیع می‌شود. تعداد دفتر از تعداد برگ مستقل است. حذف پکیج همه اجزای همان ردیف را حذف می‌کند؛ حذف درخواست از سبد، سفارش ثبت‌شده را لغو نمی‌کند.",
                  "PUB-09 · Products, bundles, original artworks and commissions have distinct line types. Product and component SKU demand is aggregated. Notebook quantity is independent of sheets. Removing a bundle removes its grouped contents; removing a request from the cart doesn't cancel the registered commission.",
                )}
              </p>
              <p>
                {t(
                  "تخفیف پکیج یک‌بار از مبلغ پایه اجزا کم می‌شود. کد فقط روی اقلام آماده و واجد شرایط اعمال می‌شود؛ در variant stacking، مبلغ پس از تخفیف پکیج مبناست. pending، quote منقضی و اقلام نیازمند اصلاح خارج از جمع‌اند. Undo قیمت و موجودی فعلی را دوباره ارزیابی می‌کند.",
                  "Bundle discounts are deducted once from component base amounts. Codes apply only to ready eligible lines; stacking uses the post-bundle-discount amount. Pending, expired and invalid lines are excluded. Undo re-evaluates current prices and stock.",
                )}
              </p>
              <p>
                {t(
                  "همه داده‌ها، کدها و پاسخ‌ها نمایشی و محلی‌اند. سبد مهمان در طول پروتوتایپ حفظ می‌شود. بررسی checkout دوباره اقلام آماده و کد را ارزیابی می‌کند و فقط مقصد /checkout با شناسه همان اقلام را نشان می‌دهد؛ پرداخت یا رزرو موفق ادعا نمی‌شود. ارسال نامشخص و مالیات تنظیم‌نشده وارد مبلغ آماده نیستند.",
                  "All data, codes and responses are local demos. Guest cart state survives prototype navigation. Checkout revalidates ready lines and coupon and shows only a /checkout destination with those line IDs; no successful payment or reservation is claimed. Unknown shipping and unconfigured tax aren't included.",
                )}
              </p>
            </div>
          )}
          {isBundle && (
            <div className="detail-handoff">
              <p>
                {t(
                  "PUB-08 · اجزا و تعداد داخلی اجباری و ثابت‌اند. انتخاب دفتر فقط از SKUهای مجاز پکیج است؛ گزینه‌های محصول مستقل الزاماً مجاز نیستند. تعداد پکیج در همه اجزا ضرب می‌شود. SKUهای تکراری پیش از محاسبه ظرفیت تجمیع می‌شوند.",
                  "PUB-08 · Components and internal quantities are mandatory and fixed. Notebook choices use only bundle-allowed SKUs, not all standalone options. Bundle quantity multiplies every component. Repeated SKUs are aggregated before capacity checks.",
                )}
              </p>
              <p>
                {t(
                  "قیمت، تخفیف ثابت و ظرفیت از یک ترکیب واحد مشتق می‌شوند. قیمت «از» فقط از ترکیب کامل قابل خرید می‌آید. تغییر قیمت نیازمند تأیید است. تخفیف کد با این پکیج جمع نمی‌شود؛ این ممنوعیت به محصولات مستقل سبد تعمیم ندارد.",
                  "Price, fixed discount and capacity derive from the same composition. From prices use only complete purchasable combinations. New prices require consent. Discount-code stacking is disabled for this bundle, not standalone cart products.",
                )}
              </p>
              <p>
                {t(
                  "سبد نمایشی یک ردیف پکیج با اجزای خودش نگه می‌دارد. موجودی سبد مختلط محصول و پکیج هم بررسی می‌شود، ولی افزودن رزرو نیست. پاسخ‌ها و قیمت‌های تغییرکرده محلی‌اند، نه backend. برگشت از محصول مستقل، انتخاب‌های ذخیره‌شده پکیج و scroll را حفظ می‌کند. تصویر اصلی فقط اجزای خرید را به‌صورت جای‌نگهدار نمایش می‌دهد.",
                  "The demo cart keeps one bundle row with its own components and also validates mixed product/bundle demand. Adding never reserves stock. Simulated responses are local, not backend operations. Back from a standalone product restores saved bundle selections and scroll. The main placeholder shows only included items.",
                )}
              </p>
            </div>
          )}
          {isProduct && (
            <div className="detail-handoff">
              <p>
                {t(
                  "PUB-06 · هر ترکیب تعریف‌شده سایز، برگ و جلد یک SKU است. تعداد دفتر مستقل است. قیمت و موجودی اولیه از همان کاتالوگ مشترک کالکشن خوانده می‌شوند. گزینه ناسازگار غیرفعال است؛ ناموجود قابل بررسی است ولی قابل خرید نیست.",
                  "PUB-06 · Each defined size/sheet/cover combination is an SKU. Notebook quantity is independent. Initial prices and stock come from the shared collection catalog. Unsupported combinations are disabled; unavailable ones can be inspected but not bought.",
                )}
              </p>
              <p>
                {t(
                  "این سبد و پاسخ‌های تغییر قیمت/موجودی نمایشی و محلی‌اند. افزایش موجودی یا رزرو واقعی انجام نمی‌شود. قیمت جدید فقط با رضایت اعمال می‌شود. موجودی هنگام افزودن و مجموع تعداد SKU در سبد بررسی می‌شود. فایل چاپ و هزینه‌های داخلی عمومی نیستند. پکیج مرتبط تنها در صورت وجود داده منتشرشده مرتبط نمایش داده می‌شود.",
                  "This cart and simulated price/stock responses are local demos. No real reservation or purchase occurs. New prices require consent. Adding checks combined SKU quantities against stock. Print files and internal costs are never public. Related bundles appear only when published matching data exists.",
                )}
              </p>
              <p>
                {t(
                  "گالری ۴:۵، تصاویر جای‌نگهدار، RTL/LTR واقعی و بدون آینه‌کردن تصویر. دیالوگ‌ها با Escape بسته می‌شوند و focus را بازمی‌گردانند. نوار خرید موبایل safe-area دارد و هنگام دیالوگ یا ویرایش تعداد پنهان می‌شود.",
                  "The gallery uses 4:5 placeholders. RTL/LTR never mirrors images. Dialogs close with Escape and restore focus. The mobile buy bar respects safe areas and hides during dialogs or quantity editing.",
                )}
              </p>
            </div>
          )}
          {isDetail && (
            <div className="detail-handoff">
              <p>
                {t(
                  "PUB-03 · کالکشن ثابت است؛ دسته و سایز فقط نتایج همین کالکشن را محدود می‌کنند. سایز فیلتر است، نه انتخاب SKU. قیمت از ارزان‌ترین گزینه موجودِ سازگار می‌آید. موجودی محصول میان کالکشن‌ها مشترک و موجودی پکیج از ترکیب کامل اجزا مشتق است.",
                  "PUB-03 · The collection remains fixed. Category and size narrow only this collection. Size is a filter, not an SKU selection. From prices use the cheapest matching purchasable option. Product inventory is shared across collections; bundle stock derives from complete component combinations.",
                )}
              </p>
              <p>
                {t(
                  "پارامترهای URL صرفاً قرارداد محلی پروتوتایپ‌اند، نه API. فیلتر، tab، sort، صفحه و موقعیت پیمایش با Back بازیابی می‌شوند. فقط محصولات و پکیج‌های منتشرشده نمایش داده می‌شوند. Retry و علاقه‌مندی‌ها نمایشی و محلی‌اند.",
                  "URL parameters are local prototype state, not an API contract. Back restores filters, tab, sort, page and scroll. Only published products and bundles are shown. Retry and favorites are local demonstrations.",
                )}
              </p>
              <p>
                {t(
                  "دسکتاپ: Sidebar در شروع مسیر خواندن + سه ستون. موبایل: دو ستون و sheet فیلتر با draft/apply. عرض ۳۲۰: یک ستون. تصاویر در RTL آینه نمی‌شوند.",
                  "Desktop: a leading-edge sidebar and three result columns. Mobile: two columns and a draft/apply filter sheet. At 320px: one column. RTL never mirrors images.",
                )}
              </p>
              <h3>{t("انتخاب‌های نمونه", "Sample selections")}</h3>
              <div className="foundation-buttons">
                <button
                  className="button secondary"
                  onClick={() => {
                    setDetailMode("normal")
                    updateDetailQuery("category=sketchbooks&size=A5&stock=1")
                    setLab(false)
                  }}
                >
                  {t("دفتر طراحی + A5 + موجود", "Sketchbooks + A5 + in stock")}
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setDetailMode("normal")
                    updateDetailQuery("tab=bundles")
                    setLab(false)
                  }}
                >
                  {t("تب پکیج‌ها", "Bundles tab")}
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setDetailMode("normal")
                    updateDetailQuery("min=999999")
                    setLab(false)
                  }}
                >
                  {t("نتیجه خالی با فیلتر", "Empty filtered results")}
                </button>
              </div>
            </div>
          )}
          {!isDetail && !isProduct && !isBundle && !isCart && (
            <>
              <p>
                {t(
                  isCollections
                    ? "کالکشن هویت تصویری است، دسته نوع محصول. فقط داده منتشرشده نمایش داده می‌شود. تمام کارت یک لینک است. تصویر مفقود با جای‌نگهدار هم‌اندازه جایگزین می‌شود و نام تأییدشده در نبود ترجمه حفظ می‌شود. بازگشت مرورگر، موقعیت پیمایش فهرست را بازیابی می‌کند. Retry یک بارگذاری نمایشی محلی است، نه درخواست سرور."
                    : "قیمت «از» باید از کم‌قیمت‌ترین SKU موجود محاسبه شود. بدون SKU موجود، فقط وضعیت ناموجود نمایش داده می‌شود. موجودی پکیج از اجزا محاسبه می‌شود. انتخاب گزینه‌ها فقط در صفحه جزئیات است. تصاویر و نام‌های تأییدنشده از داده برند جایگزین می‌شوند.",
                  isCollections
                    ? "A collection is a visual identity; a category is a product type. Only published records are rendered. The entire card is one link. Missing images use a same-size placeholder; missing translations use the approved original name. Browser Back restores list scroll position. Retry simulates local loading, not a server request."
                    : "“From” prices must use the cheapest purchasable SKU. Without an available SKU, show unavailable instead of a price. Bundle availability derives from its components. Options belong on detail pages. Replace sample assets and unconfirmed names with brand data.",
                )}
              </p>
              <p>
                {t(
                  isCollections
                    ? "PUB-02 · فهرست کالکشن‌ها: دسکتاپ ۳ ستون، تبلت و موبایل ۲ ستون و در ۳۲۰ پیکسل ۱ ستون. نسبت تصویر ۴:۳ است. RTL/LTR ترتیب و فلش‌ها را تغییر می‌دهد، نه تصاویر را. حالت‌ها از کنترل بالا قابل انتخاب‌اند."
                    : "در موبایل ۲، تبلت ۳ و دسکتاپ ۴ ستون محصول؛ کالکشن‌ها ۲ و ۵ ستون. دیالوگ‌ها focus را نگه می‌دارند و با Escape بسته می‌شوند. تغییر زبان ارز را تغییر نمی‌دهد.",
                  isCollections
                    ? "PUB-02 · Collections: 3 desktop columns, 2 tablet/mobile columns, 1 at 320px. Images use a 4:3 ratio. RTL/LTR changes reading order and arrows, never images. Use the controls above to preview states."
                    : "Products: 2 mobile, 3 tablet, 4 desktop columns. Collections: 2 and 5 columns. Dialogs trap focus and close with Escape. Language changes never change currency.",
                )}
              </p>
            </>
          )}
        </div>
      </Modal>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </div>
  )
}
