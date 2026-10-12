import { AddressDetails, AddressForm } from './AddressFields'
export { AddressDetails } from './AddressFields'
import { CheckoutHeader, CheckoutStepper } from "./CheckoutChrome"
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { addressErrors, demoAddresses, emptyAddress, saveDestination, selectDestination, type Address, type AddressCheckout } from './address'
import { checkoutAmounts, checkoutRows, physicalCheckout, type CheckoutSession } from './checkout'
import { evaluateCart, type CartSnapshot } from './cart'
import CheckoutAmounts from './CheckoutAmounts'
import './address.css'
interface Props {
  language: 0 | 1; onLanguage: () => void; snapshot: CartSnapshot; selectedIds: string[] | null;
  cartMode: string; couponCode: string; session: CheckoutSession; blocked: boolean;
  state: AddressCheckout; onState: (s: AddressCheckout) => void;
  onNavigate: (name: string, route: string) => void; onDemo: (mode: string) => void;
  onSession: (s: CheckoutSession) => void; arrow: ReactNode;
}


export default function CheckoutAddressPage(props: Props) {
  const { language, onLanguage, snapshot, selectedIds, cartMode, couponCode, session, state, onState, onNavigate, onDemo, onSession, arrow } = props
  const t = (fa: string, en: string) => language === 0 ? fa : en
  const [fallbackIds] = useState(() => evaluateCart(snapshot, cartMode).filter(r => !r.issue).map(r => r.line.id))
  const ids = selectedIds ?? fallbackIds
  const rows = checkoutRows(snapshot, ids, cartMode)
  const ready = rows.filter(r => !r.issue)
  const physical = physicalCheckout(ready)
  const digital = ready.some(r => r.line.kind !== 'product' && r.line.kind !== 'bundle' && r.line.data.delivery === 'digital')
  const [mode, setMode] = useState('normal')
  const [draft, setDraft] = useState<Address | null>(null)
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')
  const [cityFailure, setCityFailure] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const alive = useRef(true)
  const latest = useRef(props); latest.current = props
  const verified = session.status === 'verified'
  const selected = state.addresses.find(a => a.id === state.selectedAddressId)
  const valid = !!selected && !Object.keys(addressErrors(selected)).length
  const blocked = props.blocked || rows.length !== ids.length || rows.some(r => r.issue) || !!checkoutAmounts(rows, couponCode, cartMode === 'stacking').coupon.error
  const canContinue = verified && physical && valid && !busy && !checking && !blocked && !['offline', 'loading', 'stale'].includes(mode)
  useEffect(() => { alive.current = true; title.current?.focus(); return () => { alive.current = false } }, [])
  useEffect(() => { if (verified && rows.length && !physical && !blocked) onNavigate(t('این سفارش به آدرس تحویل نیاز ندارد.', "This order doesn't require a delivery address."), '/checkout/payment') }, [verified, physical, blocked])
  useEffect(() => { if (draft && verified) dialog.current?.showModal(); else dialog.current?.close() }, [draft, verified])
  const link = (fa: string, en: string, route: string) => <a className="text-link" href={route} onClick={e => { if (e.ctrlKey || e.metaKey) return; e.preventDefault(); onNavigate(t(fa, en), route) }}>{t(fa, en)}</a>
  const edit = (a: Address) => { setSaveError(''); setDraft({ ...a }) }
  const save = async (a: Address) => {
    if (busy || !verified || mode === 'offline') return
    setBusy(true); setSaveError('')
    await new Promise(r => setTimeout(r, 650))
    if (!alive.current) return
    setBusy(false)
    if (latest.current.session.status !== 'verified') return
    if (mode === 'save-error') { setSaveError(t('آدرس ذخیره نشد؛ اطلاعات واردشده حفظ شده‌اند. دوباره تلاش کنید.', "The address wasn't saved; your input has been kept. Try again.")); setMode('normal'); return }
    const old = latest.current.state.addresses.find(item => item.id === a.id)
    if (a.id && (!old || old.version !== a.version)) { setSaveError(t('این آدرس تغییر کرده است؛ دوباره بررسی کنید.', 'This address has changed; please review it again.')); return }
    onState(saveDestination(latest.current.state, a)); setDraft(null)
    setMessage(a.id && a.id !== state.selectedAddressId ? t('تغییرات آدرس ذخیره شد؛ مقصد این خرید تغییر نکرد.', 'Address updated; this checkout destination is unchanged.') : t('آدرس ذخیره و انتخاب شد — فقط در این نمونه.', 'Address saved and selected — in this demo only.'))
  }
  const proceed = async () => {
    if (!canContinue) return
    setChecking(true)
    const fingerprint = JSON.stringify([state, rows, couponCode])
    await new Promise(r => setTimeout(r, 500))
    if (!alive.current) return
    setChecking(false)
    const p = latest.current
    if (p.session.status !== 'verified' || p.blocked || fingerprint !== JSON.stringify([p.state, checkoutRows(p.snapshot, ids, p.cartMode), p.couponCode])) { setMessage(t('اطلاعات تغییر کرده‌اند؛ دوباره بررسی کنید.', 'Information changed. Please review again.')); return }
    onNavigate(t('روش ارسال — مقصد پروتوتایپ', 'Delivery — prototype destination'), '/checkout/delivery')
  }
  const form = (initial: Address) => <AddressForm key={initial.id || 'create'} initial={initial} language={language} busy={busy} offline={mode === 'offline'} cityFailure={cityFailure} onRetry={() => setCityFailure(false)} onSave={save} onCancel={() => setDraft(null)} saveError={saveError || (mode === 'offline' ? t('اتصال قطع است؛ اطلاعات فرم حفظ می‌شوند.', "You're offline; form data is preserved.") : '')} />
  const reason = !verified ? t('برای ادامه دوباره وارد شوید.', 'Sign in again to continue.') : mode === 'offline' ? t('اتصال برقرار نیست؛ ادامه غیرفعال است.', "You're offline. Continuing is disabled.") : mode === 'stale' ? t('این آدرس تغییر کرده است؛ دوباره بررسی کنید.', 'This address has changed; please review it again.') : blocked || !physical ? t('اقلام این خرید را دوباره مرور کنید.', 'Review the items in this checkout again.') : !valid ? t('یک آدرس تحویل معتبر انتخاب کنید.', 'Choose a valid delivery address.') : t('ادامه، پرداخت یا رزرو قطعی موجودی نیست.', 'Continuing does not pay or reserve stock.')
  const cta = <button className="button primary checkout-continue-button" disabled={!canContinue} onClick={proceed} aria-busy={checking}>{checking ? t('در حال بررسی…', 'Checking…') : t('ادامه به روش ارسال', 'Continue to delivery')}{arrow}</button>
  return <div className="checkout-page address-page">
    <CheckoutHeader language={language} onLanguage={onLanguage} onNavigate={onNavigate} />
    <div className="container checkout-content"><CheckoutStepper language={language} onNavigate={onNavigate} current={1} />
    <div className="checkout-page-heading"><span className="eyebrow">NILART STUDIO / DELIVERY ADDRESS</span><h1 ref={title} id="checkout-title" tabIndex={-1}>{t('سفارش را کجا تحویل بگیری؟', 'Where should we deliver your order?')}</h1><p>{t('یک آدرس انتخاب کن یا آدرس جدیدی اضافه کن. اطلاعات گیرنده را پیش از ادامه بررسی کن.', 'Choose an address or add a new one. Check the recipient details before continuing.')}</p></div>
    <p className="checkout-demo-banner">{t('نمونه تعاملی — نشانی‌ها و ذخیره‌سازی محلی و نمایشی‌اند؛ سفارش، پرداخت یا رزرو موجودی انجام نمی‌شود.', 'Interactive demo — addresses and saving are local simulations. No order, payment or stock reservation is made.')}</p>
    <div className="checkout-layout"><div className="checkout-main-column">
      {!verified ? <section className="address-section"><h2>{t('ورود مجدد لازم است', 'Please sign in again')}</h2><p>{t('داده خصوصی تا تأیید مجدد پنهان است. پس از ورود، ذخیره یا ادامه خودکار انجام نمی‌شود.', 'Private information is hidden until you sign in again. Saving or continuing will not run automatically.')}</p>{link('بازگشت به هویت و مرور', 'Back to account & review', '/checkout')}</section> : <>
      {mode === 'returned' && <p className="checkout-notice warning">{t('با تغییر آدرس، روش و هزینه ارسال دوباره بررسی می‌شوند.', 'Changing the address requires delivery options and cost to be checked again.')}</p>}
      {mode === 'stale' && <div className="checkout-notice warning" role="alert">{reason}<button className="text-link" onClick={() => { setMode('normal'); onState({ ...state, selectedAddressId: null, shippingQuote: null }) }}>{t('بازبینی و انتخاب مجدد', 'Review and select again')}</button></div>}
      <section className="address-section" aria-labelledby="address-list-title"><div className="address-section-heading"><div><span className="eyebrow">02 / {t('مقصد سفارش', 'YOUR DESTINATION')}</span><h2 id="address-list-title">{state.addresses.length ? t('آدرس‌های شما', 'Your saved addresses') : t('افزودن آدرس تحویل', 'Add a delivery address')}</h2></div>{state.addresses.length > 0 && <span className="address-count">{state.addresses.length.toLocaleString(language === 0 ? 'fa-IR' : 'en-US')} {t('آدرس', 'addresses')}</span>}</div>
      {mode === 'loading' ? <div className="address-cards" aria-busy="true" aria-label={t('بارگذاری آدرس‌ها', 'Loading addresses')}><div className="skeleton address-skeleton" /><div className="skeleton address-skeleton" /></div> : state.addresses.length ? <><div className="address-cards" role="radiogroup" aria-label={t('آدرس تحویل', 'Delivery address')}>{state.addresses.map(a => <article className={`address-card ${a.id === state.selectedAddressId ? 'selected' : ''}`} key={a.id}><label className="address-card-choice"><input type="radio" name="destination" checked={a.id === state.selectedAddressId} disabled={busy || checking || mode === 'offline'} onChange={() => { onState(selectDestination(state, a.id)); setMessage(t('مقصد به‌روز شد؛ روش و هزینه ارسال دوباره محاسبه می‌شوند.', 'Destination updated; delivery options and cost will be recalculated.')) }} /><span className="address-card-title"><span dir="auto">{a.label === 'خانه' ? t('خانه', 'Home') : a.label === 'محل کار' ? t('محل کار', 'Work') : a.label || t('آدرس تحویل', 'Delivery address')}</span>{a.default && <small className="address-default">{t('آدرس پیش‌فرض', 'Default address')}</small>}{a.id === state.selectedAddressId && <small className="address-selected-label">{t('انتخاب این خرید', 'Selected for this order')}</small>}</span><AddressDetails address={a} language={language} /></label><button className="text-link address-edit" onClick={() => edit(a)} disabled={busy || checking}>{t('ویرایش', 'Edit')}</button></article>)}</div><button className="button secondary address-add" disabled={busy || checking} onClick={() => edit(emptyAddress())}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>{t('افزودن آدرس جدید', 'Add new address')}</button></> : form(emptyAddress())}
      <p className="address-footnote">{t('انتخاب آدرس برای این خرید، آدرس پیش‌فرض حساب را تغییر نمی‌دهد.', 'Selecting an address for this checkout does not change your account default.')}</p></section>
      <section className="address-destination"><div className="address-section-heading"><h2>{t('تحویل به', 'Deliver to')}</h2>{selected && <button className="text-link" onClick={() => edit(selected)} disabled={busy || checking}>{t('ویرایش', 'Edit')}</button>}</div>{selected && mode !== 'stale' ? <AddressDetails address={selected} language={language} /> : <p>{t('یک آدرس تحویل انتخاب کنید.', 'Choose a delivery address.')}</p>}<p className="address-footnote">{t('یک مقصد مشترک برای همه اقلام فیزیکی؛ زمان تحویل آن‌ها ممکن است متفاوت باشد.', 'One destination for all physical items; their delivery times may differ.')}</p></section>
      </>}
      <p className="address-feedback" role="status" aria-live="polite">{message}</p>
    </div><aside className="checkout-summary-column"><section className="checkout-summary"><span className="eyebrow">YOUR ORDER, AT A GLANCE</span><h2>{t('خلاصه این خرید', 'Your order summary')}</h2><p className="checkout-summary-count">{ready.length.toLocaleString(language === 0 ? 'fa-IR' : 'en-US')} {t('قلم آماده', 'ready items')}</p>{verified ? <><details className="address-order-items"><summary>{t('مشاهده اقلام سفارش', 'View order items')}</summary>{ready.map(r => <div key={r.line.id}><span>{r.name[language]} <small>× {r.quantity} · {r.line.kind !== 'product' && r.line.kind !== 'bundle' && r.line.data.delivery === 'digital' ? t('دیجیتال', 'Digital') : t('فیزیکی', 'Physical')}</small></span></div>)}</details><CheckoutAmounts rows={ready} code={couponCode} stacking={cartMode === 'stacking'} language={language} /></> : <p className="checkout-notice">{t('خلاصه خصوصی پس از ورود مجدد نمایش داده می‌شود.', 'Private order details appear after sign-in.')}</p>}<p className="checkout-shipping-note"><strong>{t('ارسال: در مرحله بعد', 'Shipping: next step')}</strong><br />{t('هزینه ارسال پس از انتخاب روش مشخص می‌شود. این مبلغ نهایی پرداخت نیست.', 'Shipping cost is shown after you choose a delivery method. This is not the final payment amount.')}</p><small>{t('مالیات تنظیم نشده؛ مبلغ فرضی اضافه نشده است.', 'Tax is not configured; no assumed amount is added.')}</small>{digital && <p className="address-digital-note">{t('فایل دیجیتال در حساب شما تحویل داده می‌شود؛ این آدرس فقط برای کالاهای فیزیکی است.', 'Digital files are delivered through your account; this address is only for physical items.')}</p>}{cta}<p className="checkout-continue-reason">{reason}</p>{link('بازگشت به مرور سفارش', 'Back to order review', '/checkout')}</section></aside></div></div>
    <footer className="checkout-footer"><div className="container"><span>© {new Date().getFullYear()} NilArt Studio</span><nav>{link('قوانین', 'Terms', '/terms')}{link('حریم خصوصی', 'Privacy', '/privacy')}{link('پشتیبانی', 'Support', '/contact')}</nav><details className="address-demo-states"><summary>{t('حالت‌های نمایشی · PUB-11', 'Prototype states · PUB-11')}</summary><div>{[['normal', 'دو آدرس / Saved addresses'], ['empty', 'اولین آدرس / First address'], ['unselected', 'بدون انتخاب / No selection'], ['loading', 'بارگذاری / Loading'], ['add', 'افزودن / Add'], ['edit', 'ویرایش / Edit'], ['city-error', 'خطای شهر / City error'], ['save-error', 'خطای ذخیره / Save error'], ['returned', 'بازگشت از ارسال / Changed destination'], ['stale', 'آدرس تغییرکرده / Stale'], ['offline', 'قطع اتصال / Offline'], ['expired', 'نشست منقضی / Expired'], ['mixed', 'سفارش مختلط / Mixed'], ['digital', 'فقط دیجیتال / Digital only']].map(([value, label]) => <button key={value} className="button secondary" onClick={() => {
      setMessage(''); setSaveError(''); setCityFailure(value === 'city-error'); setDraft(null)
      if (value === 'expired') { onSession({ status: 'expired', demo: true }); return }
      onDemo(value === 'digital' ? 'digital' : 'verified')
      const fixture = demoAddresses(); onState(value === 'empty' ? { addresses: [], selectedAddressId: null, shippingQuote: null } : value === 'unselected' ? { ...fixture, selectedAddressId: null } : fixture)
      setMode(['loading', 'save-error', 'returned', 'stale', 'offline'].includes(value) ? value : 'normal')
      if (['add', 'city-error', 'save-error'].includes(value)) setDraft(emptyAddress())
      if (value === 'edit') setDraft(fixture.addresses[0])
    }}>{label}</button>)}</div><p>{t('قواعد ایران و فهرست شهرها نمونه و محدودند. گیرنده مستقل از حساب است؛ آدرس سفارش‌های قبلی immutable است. تغییر مقصد، quote ارسال را نامعتبر می‌کند. ذخیره فقط محلی است.', 'Iran rules and city list are limited demos. Recipient is independent of the account; previous order addresses are immutable. Destination changes invalidate delivery quotes. Saving is local only.')}</p></details></div></footer>
    {!draft && <div className="address-mobile-continue">{cta}<p className="checkout-continue-reason">{reason}</p></div>}
    <dialog ref={dialog} className="address-dialog" onCancel={e => { e.preventDefault(); dialog.current?.querySelector<HTMLFormElement>('form')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) }}><div className="address-dialog-heading"><span className="eyebrow">NILART / ADDRESS BOOK</span><h2>{draft?.id ? t('ویرایش آدرس', 'Edit address') : t('افزودن آدرس جدید', 'Add new address')}</h2></div>{draft && verified && form(draft)}</dialog>
  </div>
}
