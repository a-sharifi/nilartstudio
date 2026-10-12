import type { ReactNode } from "react"
type Props = {
  language: 0 | 1
  onNavigate: (name: string, route: string) => void
}
export function CheckoutLink({
  language,
  onNavigate,
  fa,
  en,
  route,
}: Props & {
  fa: string
  en: string
  route: string
}) {
  const name = language === 0 ? fa : en
  return (
    <a
      className="text-link"
      href={route}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onNavigate(name, route)
      }}
    >
      {name}
    </a>
  )
}
export function CheckoutHeader({
  language,
  onNavigate,
  onLanguage,
}: Props & { onLanguage: () => void }) {
  return (
    <header className="checkout-header">
      <div className="container checkout-header-inner">
        <a
          className="wordmark"
          href="/"
          onClick={(e) => {
            e.preventDefault()
            onNavigate("NilArt Studio", "/")
          }}
          aria-label="NilArt Studio — Home"
        >
          <span>
            nilart<span className="wordmark-dot">.</span>
          </span>
          <small>ART & EVERYDAY</small>
        </a>
        <nav
          aria-label={
            language === 0 ? "ناوبری checkout" : "Checkout navigation"
          }
        >
          <CheckoutLink
            language={language}
            onNavigate={onNavigate}
            fa="بازگشت به سبد"
            en="Back to cart"
            route="/cart"
          />
          <span className="checkout-header-divider" />
          <CheckoutLink
            language={language}
            onNavigate={onNavigate}
            fa="پشتیبانی"
            en="Support"
            route="/contact"
          />
          <button className="language-button" onClick={onLanguage}>
            {language === 0 ? "EN" : "فارسی"}
          </button>
        </nav>
      </div>
    </header>
  )
}
export function CheckoutStepper({
  language,
  onNavigate,
  current,
  digital = false,
}: Props & {
  current: number
  digital?: boolean
}) {
  const allSteps = [
    ["هویت و مرور", "Account & review", "/checkout"],
    ["آدرس", "Address", "/checkout/address"],
    ["ارسال", "Delivery", "/checkout/delivery"],
    ["پرداخت", "Payment", "/checkout/payment"],
  ]
  const steps = digital ? [allSteps[0], allSteps[3]] : allSteps
  const active = digital ? 1 : current
  return (
    <ol
      className={`checkout-progress ${digital ? "digital" : ""}`}
      aria-label={language === 0 ? "مراحل خرید" : "Checkout progress"}
    >
      {steps.map(([fa, en, route], i) => (
        <li
          key={route}
          aria-current={i === active ? "step" : undefined}
          className={i < active ? "address-step-done" : ""}
        >
          <span className="checkout-step-number">
            {i < active
              ? "✓"
              : (i + 1).toLocaleString(language === 0 ? "fa-IR" : "en-US")}
          </span>
          <span>
            {i < active ? (
              <CheckoutLink
                language={language}
                onNavigate={onNavigate}
                fa={fa}
                en={en}
                route={route}
              />
            ) : language === 0 ? (
              fa
            ) : (
              en
            )}
            <small>
              {language === 0
                ? i < active
                  ? "تکمیل‌شده"
                  : i === active
                    ? "مرحله فعلی"
                    : "مرحله بعد"
                : i < active
                  ? "Completed"
                  : i === active
                    ? "Current"
                    : "Upcoming"}
            </small>
          </span>
        </li>
      ))}
    </ol>
  )
}
export function CheckoutFooter({
  language,
  onNavigate,
  children,
}: Props & { children?: ReactNode }) {
  return (
    <footer className="checkout-footer">
      <div className="container">
        <span>© {new Date().getFullYear()} NilArt Studio</span>
        <nav>
          {[
            ["قوانین", "Terms", "/terms"],
            ["حریم خصوصی", "Privacy", "/privacy"],
            ["پشتیبانی", "Support", "/contact"],
          ].map(([fa, en, route]) => (
            <CheckoutLink
              key={route}
              language={language}
              onNavigate={onNavigate}
              fa={fa}
              en={en}
              route={route}
            />
          ))}
        </nav>
        {children}
      </div>
    </footer>
  )
}
