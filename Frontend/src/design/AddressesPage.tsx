import {useNavigationGuard} from "../features/navigation/NavigationGuardProvider"
import {sessionLifecycle} from "../features/identity/session-lifecycle"
import type {addressApi} from "../features/customer/api"
import { useEffect, useRef, useState, type MouseEvent } from "react"
import DashboardPage, { Glyph } from "./DashboardPage"
import { AddressDetails, AddressForm } from "./AddressFields"
import { demoAddresses, emptyAddress, type Address } from "./address"
import {
  saveAccountAddress,
  defaultAccountAddress,
  deleteAccountAddress,
  checkoutReturnTarget,
  type AddressesMode,
} from "./account-addresses"
import "./account-addresses.css"
type DialogKind = "form" | "delete" | "destination" | null
const modes: [AddressesMode, string, string][] = [
  ["normal", "فهرست آدرس‌ها", "Saved addresses"],
  ["empty", "بدون آدرس", "No addresses"],
  ["loading", "بارگذاری", "Loading"],
  ["network", "خطای شبکه", "Network error"],
  ["save-error", "خطای ذخیره", "Save error"],
  ["delete-error", "خطای حذف", "Delete error"],
  ["default-error", "خطای پیش‌فرض", "Default error"],
  ["conflict", "تعارض نسخه", "Version conflict"],
  ["city-error", "خطای شهرها", "City list error"],
  ["unsupported", "خارج از پوشش نمونه", "Demo unsupported destination"],
  ["denied", "عدم دسترسی", "Access denied"],
]
export default function AddressesPage({
  page,
  search,
  navigate,
  liveApi,
}: {
  page: string
  liveApi?: typeof addressApi
  search: string
  navigate: (route: string) => void
}) {
  const en = page.startsWith("/en/"),
    language = en ? 1 : 0,
    t = (fa: string, english: string) => (en ? english : fa)
  const prefix = en ? "/en" : "/fa",
    account = `${prefix}/account`
  const [mode, setMode] = useState<AddressesMode>(liveApi?"loading":"normal"),
    [addresses, setAddresses] = useState<Address[]>(() => liveApi?[]:demoAddresses().addresses)
  const [dialogKind, setDialogKind] = useState<DialogKind>(null),
    [initial, setInitial] = useState<Address | null>(null),
    [deleting, setDeleting] = useState<Address | null>(null)
  const [busy, setBusy] = useState(false),
    [pendingId, setPendingId] = useState<string | null>(null),
    [saveError, setSaveError] = useState("")
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({}),
    [live, setLive] = useState(""),
    [retrying, setRetrying] = useState(false)
  const [cityLoading, setCityLoading] = useState(false),
    [cityFailure, setCityFailure] = useState(false),
    [conflict, setConflict] = useState<Address | null>(null)
  const [destination, setDestination] = useState(""),
    [formKey, setFormKey] = useState(0)
  const [demoCheckout, setDemoCheckout] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null),
    origin = useRef<HTMLElement | null>(null),
    heading = useRef<HTMLHeadingElement>(null)
  const mutationLock = useRef(false),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>()),
    cityGeneration = useRef(0),
    latest = useRef(addresses)
  const conflictInjected = useRef(false)
  latest.current = addresses
  const permitted = mode !== "denied",
    loaded = permitted && mode !== "loading" && mode !== "network"
  const checkoutTarget =
    checkoutReturnTarget(search) || (demoCheckout ? "/checkout/address" : null)
  const later = (fn: () => void, ms = 700) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer)
      fn()
    }, ms)
    timers.current.add(timer)
  }
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      mutationLock.current = false
    },
    [],
  )
  useEffect(() => {
    if (dialogKind && !dialog.current?.open) dialog.current?.showModal()
    else if (!dialogKind && dialog.current?.open) dialog.current.close()
  }, [dialogKind])
  const formDirty=useRef(false),leaveAction=useRef<(()=>void)|null>(null),leaveDialog=useRef<HTMLDialogElement>(null),registerGuard=useNavigationGuard()
  const [leaving,setLeaving]=useState(false)
  const guard=(proceed:()=>void)=>{if(mutationLock.current)return false;if(!liveApi || !formDirty.current){proceed();return true};leaveAction.current=proceed;setLeaving(true);return false}
  useEffect(()=>{if(!liveApi)return;registerGuard(guard);const unload=(event:BeforeUnloadEvent)=>{if(formDirty.current || mutationLock.current){event.preventDefault();event.returnValue=""}};window.addEventListener("beforeunload",unload);return()=>{registerGuard(null);window.removeEventListener("beforeunload",unload)}},[liveApi,registerGuard])
  useEffect(()=>{if(leaving)leaveDialog.current?.showModal();else leaveDialog.current?.close()},[leaving])
  const navigateLive=(route:string)=>guard(()=>navigate(route))
  const close = () => {
    formDirty.current=false
    setDialogKind(null)
    setInitial(null)
    setDeleting(null)
    setConflict(null)
    setSaveError("")
    requestAnimationFrame(() => {
      const control = origin.current
      if (control?.isConnected) control.focus()
      else heading.current?.focus()
    })
  }
  const requestClose = () => {
    if (busy) return
    if (dialogKind === "form")
      dialog.current
        ?.querySelector<HTMLFormElement>("form")
        ?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        )
    else close()
  }
  const openForm = (address: Address, event?: MouseEvent<HTMLElement>) => {
    if (mutationLock.current || !loaded) return
    origin.current =
      event?.currentTarget || document.activeElement as HTMLElement
    conflictInjected.current = false
    setInitial({ ...address, id: address.id || (liveApi ? crypto.randomUUID() : "") })
    setSaveError("")
    setConflict(null)
    setCityFailure(mode === "city-error")
    setCityLoading(false)
    setFormKey((value) => value + 1)
    setDialogKind("form")
  }
  const liveGeneration=useRef(0)
  const loadLive=async()=>{
    if(!liveApi)return
    const stamp=++liveGeneration.current;setMode("loading")
    try {const values=await liveApi.load();if(stamp===liveGeneration.current){setAddresses(values);setMode("normal")}}
    catch {if(stamp===liveGeneration.current)setMode("network")}
  }
  useEffect(()=>{if(!liveApi)return;void loadLive();const clear=sessionLifecycle.registerPrivateCache(()=>{liveGeneration.current++;setAddresses([]);setInitial(null);setDeleting(null);setDialogKind(null);setMode("denied");setSaveError("");setLeaving(false);leaveAction.current=null;formDirty.current=false});return()=>{liveGeneration.current++;clear()}},[liveApi])
  const liveMutation=async(address:Address,remove=false)=>{
    if(!liveApi || mutationLock.current)return
    mutationLock.current=true;setBusy(true);setSaveError("");const stamp=liveGeneration.current
    try {const values=await (remove?liveApi.remove(address):liveApi.save(address));if(stamp!==liveGeneration.current)return;setAddresses(values);close();setLive(t("تغییر آدرس ذخیره شد.","Address change saved."))}
    catch(error){if(stamp!==liveGeneration.current)return;const message=error instanceof Error && error.message==="record_version_conflict"?t("نسخه آدرس تغییر کرده است؛ دوباره فهرست را دریافت کنید.","Address version changed; reload the list."):t("تغییر تأیید نشد؛ ورودی‌ها حفظ شده‌اند. پیش از تکرار، فهرست را بررسی کنید.","Change unconfirmed; inputs retained. Check the list before retrying.");setSaveError(message);setCardErrors(previous=>({...previous,[address.id]:message}))}
    finally {mutationLock.current=false;setBusy(false)}
  }
  const follow = (route: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (liveApi || route === account || route.includes("/auth/")) navigateLive(route)
    else {
      origin.current = event.currentTarget
      setDestination(route)
      setDialogKind("destination")
    }
  }
  const save = (draft: Address) => {
    if(liveApi){void liveMutation(draft);return}
    if (mutationLock.current || !loaded) return
    mutationLock.current = true
    setBusy(true)
    setSaveError("")
    later(() => {
      mutationLock.current = false
      setBusy(false)
      if (mode === "save-error") {
        setSaveError(
          t(
            "آدرس ذخیره نشد؛ ورودی‌ها حفظ شده‌اند. دوباره تلاش کنید.",
            "The address was not saved; your inputs were preserved. Try again.",
          ),
        )
        setLive(
          t(
            "ذخیره تأیید نشد؛ پاسخ نمونه خطاست.",
            "Save was not confirmed; the fixture response is an error.",
          ),
        )
        return
      }
      if (mode === "conflict" && draft.id && !conflictInjected.current) {
        conflictInjected.current = true
        const newer = {
          ...draft,
          street: t(
            "نشانی به‌روزشده نمونه — خیابان هنر، ساختمان نمونه، واحد ۳. برای ارسال واقعی استفاده نشود.",
            "Updated demo address — Art Street, sample building, unit 3. Do not use for actual shipping.",
          ),
          version: draft.version + 1,
        }
        setAddresses((previous) =>
          previous.map((address) =>
            address.id === newer.id ? newer : address,
          ),
        )
        setConflict(newer)
        setSaveError(
          t(
            "این آدرس تغییر کرده است. اطلاعات جدید را بررسی کنید. ورودی‌های شما بی‌اطلاع بازنویسی نشده‌اند.",
            "This address has changed. Review the latest details. Your inputs were not silently overwritten.",
          ),
        )
        return
      }
      const result = saveAccountAddress(
        latest.current,
        draft,
        `demo-address-${crypto.randomUUID()}`,
      )
      if (result.error) {
        setSaveError(
          t(
            "این آدرس تغییر کرده است. اطلاعات جدید را بررسی کنید.",
            "This address has changed. Review the latest details.",
          ),
        )
        setConflict(
          latest.current.find((address) => address.id === draft.id) || null,
        )
        return
      }
      setAddresses(result.addresses)
      close()
      setLive(
        t(
          "آدرس ذخیره شد · Demo؛ ذخیره واقعی سرویس انجام نشده است. نشانی سفارش و انتخاب checkout تغییر نکردند.",
          "Address saved · Demo; no real service save occurred. Order addresses and checkout selection were not changed.",
        ),
      )
    })
  }
  const setDefault = (address: Address) => {
    if(liveApi){void liveMutation({...address,default:true});return}
    if (mutationLock.current || !loaded) return
    mutationLock.current = true
    setPendingId(address.id)
    setCardErrors((previous) => {
      const next = { ...previous }
      delete next[address.id]
      return next
    })
    later(() => {
      mutationLock.current = false
      setPendingId(null)
      if (mode === "default-error") {
        setCardErrors((previous) => ({
          ...previous,
          [address.id]: t(
            "تغییر پیش‌فرض ممکن نشد؛ پیش‌فرض قبلی حفظ شده است.",
            "Unable to change the default; the previous default is preserved.",
          ),
        }))
        setLive(
          t("تغییر پیش‌فرض تأیید نشد.", "Default update was not confirmed."),
        )
        return
      }
      const result = defaultAccountAddress(
        latest.current,
        address.id,
        address.version,
      )
      if (result.error) {
        setCardErrors((previous) => ({
          ...previous,
          [address.id]: t(
            "این آدرس تغییر کرده است. اطلاعات جدید را بررسی کنید.",
            "This address has changed. Review the latest details.",
          ),
        }))
        return
      }
      setAddresses(result.addresses)
      setLive(
        t(
          "آدرس پیش‌فرض تغییر کرد · Demo؛ ذخیره واقعی انجام نشده و انتخاب این خرید تغییر نکرده است.",
          "Default address changed · Demo; no actual save occurred and the checkout selection did not change.",
        ),
      )
    })
  }
  const remove = () => {
    if(liveApi && deleting){void liveMutation(deleting,true);return}
    if (!deleting || mutationLock.current || !loaded) return
    mutationLock.current = true
    setBusy(true)
    const target = deleting
    later(() => {
      mutationLock.current = false
      setBusy(false)
      if (mode === "delete-error") {
        setCardErrors((previous) => ({
          ...previous,
          [target.id]: t(
            "حذف آدرس ممکن نشد؛ کارت باقی می‌ماند. دوباره تلاش کنید.",
            "Unable to delete the address; the card remains. Try again.",
          ),
        }))
        setLive(
          t(
            "حذف تأیید نشد؛ آدرس باقی ماند.",
            "Deletion was not confirmed; the address remains.",
          ),
        )
        return
      }
      const result = deleteAccountAddress(
        latest.current,
        target.id,
        target.version,
      )
      if (result.error) {
        setCardErrors((previous) => ({
          ...previous,
          [target.id]: t(
            "این آدرس تغییر کرده است. اطلاعات جدید را بررسی کنید.",
            "This address has changed. Review the latest details.",
          ),
        }))
        return
      }
      setAddresses(result.addresses)
      setDialogKind(null)
      setDeleting(null)
      setLive(
        target.default
          ? t(
              "آدرس پیش‌فرض حذف شد · Demo؛ پیش‌فرض جایگزین انتخاب نشد. سفارش‌ها تغییر نکردند.",
              "Default address deleted · Demo; no replacement default was selected. Orders were not changed.",
            )
          : t(
              "آدرس حذف شد · Demo؛ حذف واقعی سرویس انجام نشده و سفارش‌ها تغییر نکردند.",
              "Address deleted · Demo; no real service deletion occurred and orders were not changed.",
            ),
      )
      requestAnimationFrame(() => {
        const next = document.querySelector<HTMLElement>("[data-address-edit]")
        if (next) next.focus()
        else heading.current?.focus()
      })
    })
  }
  const loadCities = () => {
    if(liveApi){setCityLoading(false);setCityFailure(false);return}
    const stamp = ++cityGeneration.current
    setCityLoading(true)
    later(() => {
      if (stamp === cityGeneration.current) {
        setCityLoading(false)
        setCityFailure(mode === "city-error")
      }
    }, 500)
  }
  const retryCities = () => {
    const stamp = ++cityGeneration.current
    setCityLoading(true)
    setCityFailure(false)
    later(() => {
      if (stamp === cityGeneration.current) {
        setCityLoading(false)
        setLive(
          t(
            "فهرست محدود شهرها از داده نمونه دریافت شد؛ سرویس واقعی متصل نیست.",
            "Limited city list loaded from fixture data; no real service is connected.",
          ),
        )
      }
    }, 500)
  }
  const preview = (value: AddressesMode) => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
    mutationLock.current = false
    cityGeneration.current++
    setMode(value)
    setAddresses(value === "empty" ? [] : demoAddresses().addresses)
    setDialogKind(null)
    setInitial(null)
    setDeleting(null)
    setBusy(false)
    setPendingId(null)
    setCardErrors({})
    setSaveError("")
    setLive("")
    setConflict(null)
    setCityLoading(false)
    setCityFailure(false)
    setRetrying(false)
  }
  const retry = () => {
    if(liveApi){void loadLive();return}
    if (retrying) return
    setRetrying(true)
    later(() => {
      setRetrying(false)
      setLive(
        t(
          "دریافت آدرس‌ها ممکن نشد؛ سرویس متصل نیست.",
          "Unable to load your addresses; no service is connected.",
        ),
      )
    })
  }
  return (
    <DashboardPage
      page={page}
      navigate={navigateLive}
      renderMedia={() => null}
      liveMode={!!liveApi}
      activeSection="addresses"
      panelTitle={t("آدرس‌های شما", "Your addresses")}
    >
      <div className="account-addresses-page">
        <nav
          className="account-addresses-breadcrumb"
          aria-label={t("مسیر صفحه", "Breadcrumb")}
        >
          <a href={account} onClick={follow(account)}>
            {t("حساب", "Account")}
          </a>
          <span>/</span>
          <span aria-current="page">{t("آدرس‌ها", "Addresses")}</span>
        </nav>
        <div className="account-addresses-heading">
          <div>
            <span className="account-addresses-eyebrow">
              YOUR ACCOUNT · USER-11
            </span>
            <h1 ref={heading} tabIndex={-1}>
              {t("آدرس‌های شما", "Your addresses")}
            </h1>
            <p>
              {t(
                "آدرس‌های ارسال را برای انتخاب سریع‌تر هنگام خرید مدیریت کنید.",
                "Manage delivery addresses for quicker selection at checkout.",
              )}
            </p>
          </div>
          <button
            className="button primary"
            disabled={!loaded || busy || !!pendingId}
            onClick={(event) => openForm(emptyAddress(), event)}
          >
            <Glyph name="plus" size={18} />
            {t("افزودن آدرس", "Add address")}
          </button>
        </div>
        {!liveApi && <div className="account-addresses-demo">
          <span>Demo</span>
          <p>
            {t(
              "نشانی‌ها، شماره‌ها، فهرست مناطق و پاسخ‌ها نمونه‌اند؛ سرویس واقعی متصل نیست. از این آدرس‌ها برای ارسال واقعی استفاده نکنید.",
              "Addresses, phone numbers, region lists and responses are fixtures; no real service is connected. Do not use these addresses for actual shipping.",
            )}
          </p>
        </div>}
        <div
          className="account-addresses-live"
          role="status"
          aria-live="polite"
        >
          {live}
        </div>
        {mode === "denied" ? (
          <section className="account-addresses-state">
            <Glyph name="shield" size={36} />
            <h2>
              {t(
                "دسترسی به آدرس‌های این حساب مجاز نیست.",
                "This account’s addresses are not accessible.",
              )}
            </h2>
            <p>
              {t(
                "تا بررسی مالکیت و نشست، اطلاعات خصوصی نمایش داده نمی‌شوند.",
                "Private details remain hidden pending ownership and session checks.",
              )}
            </p>
          </section>
        ) : mode === "loading" ? (
          <div
            className="account-addresses-grid"
            aria-busy="true"
            aria-label={t("در حال دریافت آدرس‌ها", "Loading addresses")}
          >
            {[0, 1].map((i) => (
              <div key={i} className="skeleton account-address-skeleton" />
            ))}
          </div>
        ) : mode === "network" ? (
          <section className="account-addresses-state">
            <Glyph name="pin" size={36} />
            <h2>
              {t("دریافت آدرس‌ها ممکن نشد.", "Unable to load your addresses.")}
            </h2>
            <p>
              {t(
                "این خطا به معنی حذف آدرس‌های ذخیره‌شده نیست.",
                "This error does not mean your saved addresses were deleted.",
              )}
            </p>
            <button
              className="button primary"
              disabled={retrying}
              onClick={retry}
            >
              {retrying
                ? t("در حال تلاش…", "Trying…")
                : t("تلاش دوباره", "Try again")}
            </button>
          </section>
        ) : (
          <>
            <div className="account-addresses-list-title">
              <h2>{t("دفترچه آدرس شما", "Your address book")}</h2>
              <span>
                {addresses.length.toLocaleString(en ? "en" : "fa")}{" "}
                {liveApi ? t("آدرس", "addresses") : t("آدرس نمونه", "sample addresses")}
              </span>
            </div>
            {!addresses.length ? (
              <section className="account-addresses-state">
                <span className="account-addresses-empty-icon">
                  <Glyph name="pin" size={34} />
                </span>
                <h2>
                  {t(
                    "هنوز آدرسی ذخیره نکرده‌اید.",
                    "You haven’t saved an address yet.",
                  )}
                </h2>
                <p>
                  {t(
                    "آدرس برای خرید فیزیکی قابل انتخاب است؛ نداشتن آدرس، حساب یا دانلودهای دیجیتال را محدود نمی‌کند.",
                    "An address can be selected for physical purchases; having none does not restrict your account or digital downloads.",
                  )}
                </p>
                <button
                  className="button primary"
                  onClick={(event) => openForm(emptyAddress(), event)}
                >
                  {t("افزودن آدرس", "Add address")}
                  <Glyph name="plus" size={18} />
                </button>
              </section>
            ) : (
              <div className="account-addresses-grid">
                {addresses.map((address) => (
                  <article
                    className={`account-address-card ${
                      address.default ? "is-default" : ""
                    }`}
                    key={address.id}
                  >
                    <header>
                      <span className="account-address-symbol">
                        <Glyph
                          name={address.label === "محل کار" ? "box" : "pin"}
                          size={23}
                        />
                      </span>
                      <div>
                        <h3 dir="auto">
                          {address.label === "خانه"
                            ? t("خانه", "Home")
                            : address.label === "محل کار"
                              ? t("محل کار", "Work")
                              : address.label ||
                                t("آدرس بدون عنوان", "Untitled address")}
                        </h3>
                        <span>
                          {t(
                            "عنوان ذخیره‌شده، نه نام گیرنده",
                            "Saved label, not recipient name",
                          )}
                        </span>
                      </div>
                      {address.default && (
                        <span className="account-address-default">
                          <Glyph name="check" size={13} />
                          {t("پیش‌فرض", "Default")}
                        </span>
                      )}
                    </header>
                    <AddressDetails address={address} language={language} demo={!liveApi} />
                    {mode === "unsupported" && address.id === "demo-work" && (
                      <p className="account-address-coverage">
                        {t(
                          "ارسال به این مقصد در حال حاضر پشتیبانی نمی‌شود · Demo. نگهداری این آدرس در قرارداد نمونه مجاز است.",
                          "Delivery to this destination is currently unsupported · Demo. Saving it is permitted by the fixture contract.",
                        )}
                      </p>
                    )}
                    <footer>
                      <div>
                        <button
                          className="text-link"
                          data-address-edit={address.id}
                          disabled={busy || !!pendingId}
                          onClick={(event) => openForm(address, event)}
                        >
                          {t("ویرایش", "Edit")}
                        </button>
                        <button
                          className="account-address-delete"
                          disabled={busy || !!pendingId}
                          onClick={(event) => {
                            origin.current = event.currentTarget
                            setDeleting({ ...address })
                            setCardErrors((previous) => {
                              const next = { ...previous }
                              delete next[address.id]
                              return next
                            })
                            setDialogKind("delete")
                          }}
                        >
                          {t("حذف", "Delete")}
                        </button>
                      </div>
                      {!address.default && (
                        <button
                          className="account-address-set-default"
                          disabled={busy || !!pendingId}
                          onClick={() => setDefault(address)}
                        >
                          {pendingId === address.id
                            ? t("در حال ثبت…", "Submitting…")
                            : t("انتخاب به‌عنوان پیش‌فرض", "Set as default")}
                        </button>
                      )}
                    </footer>
                    {cardErrors[address.id] && (
                      <p className="account-address-card-error" role="alert">
                        {cardErrors[address.id]}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
            <section className="account-addresses-order-note">
              <Glyph name="shield" size={24} />
              <div>
                <h2>
                  {t(
                    "دفترچه آدرس، مستقل از سفارش‌ها",
                    "Your address book is separate from orders",
                  )}
                </h2>
                <p>
                  {t(
                    "ویرایش آدرس ذخیره‌شده، نشانی سفارش ثبت‌شده را تغییر نمی‌دهد. آدرس پیش‌فرض فقط پیشنهاد اولیه هنگام خرید است.",
                    "Editing a saved address does not change an already placed order. The default is only an initial suggestion at checkout.",
                  )}
                </p>
                <a
                  className="text-link"
                  href={`${account}/orders`}
                  onClick={follow(`${account}/orders`)}
                >
                  {t("مشاهده سفارش‌ها", "View orders")}
                  <Glyph name="arrow" size={15} />
                </a>
              </div>
            </section>
            {checkoutTarget && (
              <section className="account-addresses-checkout-note">
                <div>
                  <h2>
                    {t(
                      "برای ادامه خرید آماده‌اید؟",
                      "Ready to continue checkout?",
                    )}
                  </h2>
                  <p>
                    {t(
                      "ذخیره به معنی انتخاب نهایی برای سفارش نیست؛ در checkout آدرس و روش حمل را دوباره انتخاب کنید. هزینه ارسال باید دوباره بررسی شود.",
                      "Saving does not select an address for the order; review the address and shipping method at checkout. Shipping costs must be rechecked.",
                    )}
                  </p>
                </div>
                <a
                  className="button secondary"
                  href={checkoutTarget}
                  onClick={(event) => {
                    if (
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    )
                      return
                    event.preventDefault()
                    navigate(checkoutTarget)
                  }}
                >
                  {t("بازگشت به ادامه خرید", "Return to checkout")}
                  <Glyph name="arrow" size={16} />
                </a>
              </section>
            )}
          </>
        )}
        <footer className="account-addresses-footer">
          <span>
            {t(
              "با دقت در جزئیات، برای تحویلی آرام‌تر.",
              "Thoughtful details, for a calmer delivery.",
            )}
          </span>
          <span>{liveApi?"Nilart":"Nilart · Demo"}</span>
        </footer>
        {!liveApi && <details className="dash-preview">
          <summary>
            {t("حالت‌های پیش‌نمایش", "Preview states")} <bdi>USER-11 · Demo</bdi>
          </summary>
          <div>
            {modes.map(([value, fa, english]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => preview(value)}
              >
                {en ? english : fa}
              </button>
            ))}
            <button
              aria-pressed={demoCheckout}
              onClick={() => setDemoCheckout(!demoCheckout)}
            >
              {t(
                "زمینه بازگشت به checkout · Demo",
                "Checkout return context · Demo",
              )}
            </button>
            <a
              href={`${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`}
              onClick={follow(
                `${prefix}/auth/session-expired?returnTo=${encodeURIComponent(page)}`,
              )}
            >
              {t("نشست منقضی", "Expired session")}
            </a>
          </div>
        </details>}
        <dialog
          ref={dialog}
          className={`address-dialog account-address-dialog ${
            dialogKind === "form"
              ? "account-address-form-dialog"
              : "account-address-confirm-dialog"
          }`}
          aria-labelledby="account-address-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            requestClose()
          }}
        >
          <div className="address-dialog-heading account-address-dialog-heading">
            <div>
              <span className="account-addresses-eyebrow">
                NILART · ADDRESS BOOK
              </span>
              <h2 id="account-address-dialog-title">
                {dialogKind === "form"
                  ? initial?.id
                    ? t("ویرایش آدرس", "Edit address")
                    : t("افزودن آدرس جدید", "Add a new address")
                  : dialogKind === "delete"
                    ? t("این آدرس حذف شود؟", "Delete this address?")
                    : t(
                        "مقصد مستقل پروتوتایپ",
                        "Independent prototype destination",
                      )}
              </h2>
            </div>
            <button
              className="icon-button"
              disabled={busy}
              onClick={requestClose}
              aria-label={t("بستن", "Close")}
            >
              <Glyph name="close" />
            </button>
          </div>
          {dialogKind === "form" && initial && permitted && (
            <>
              {!liveApi && <p className="account-address-form-demo">
                Demo ·{" "}
                {t(
                  "ذخیره نمونه، نه سرویس واقعی؛ تلفن گیرنده شماره ورود را تغییر نمی‌دهد.",
                  "Fixture saving, not a real service; recipient phone does not change the sign-in number.",
                )}
              </p>}
              {conflict && (
                <div className="account-address-conflict" role="alert">
                  <strong>
                    {t("نسخه جدید برای بررسی", "New version for review")}
                  </strong>
                  <AddressDetails address={conflict} language={language} demo={!liveApi} />
                  <p>
                    {t(
                      "بارگذاری نسخه جدید، ورودی‌های فعلی فرم را جایگزین می‌کند؛ این کار فقط با انتخاب صریح شما انجام می‌شود.",
                      "Loading the new version replaces your current form entries; this happens only with your explicit choice.",
                    )}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setInitial({ ...conflict })
                      setFormKey((value) => value + 1)
                      setSaveError("")
                      setConflict(null)
                    }}
                  >
                    {t(
                      "بارگذاری نسخه جدید در فرم",
                      "Load the new version into the form",
                    )}
                  </button>
                </div>
              )}
              <AddressForm
                key={formKey}
                initial={initial}
                live={!!liveApi}
                onDirtyChange={value=>{formDirty.current=value}}
                language={language}
                busy={busy}
                offline={false}
                cityFailure={cityFailure}
                cityLoading={cityLoading}
                context="account"
                onProvinceChange={loadCities}
                onRetry={retryCities}
                onSave={save}
                onCancel={close}
                saveError={saveError}
              />
            </>
          )}
          {dialogKind === "delete" && deleting && permitted && (
            <div className="account-address-delete-content">
              <p>
                {t(
                  "از فهرست آدرس‌های ذخیره‌شده حذف می‌شود. نشانی ثبت‌شده سفارش‌های قبلی تغییر نمی‌کند.",
                  "It will be removed from your saved addresses. Existing order addresses will not change.",
                )}
              </p>
              <div className="account-address-delete-summary">
                <strong dir="auto">
                  {deleting.label || t("آدرس بدون عنوان", "Untitled address")}
                </strong>
                <AddressDetails address={deleting} language={language} demo={!liveApi} />
              </div>
              {deleting.default && (
                <p className="account-address-delete-default-note">
                  {t(
                    "در پاسخ نمونه، پیش‌فرض جایگزین انتخاب نمی‌شود؛ حساب بدون آدرس پیش‌فرض باقی می‌ماند.",
                    "The fixture does not select a replacement default; the account will have no default address.",
                  )}
                </p>
              )}
              {cardErrors[deleting.id] && (
                <p className="account-address-card-error" role="alert">
                  {cardErrors[deleting.id]}
                </p>
              )}
              <div className="account-address-delete-actions">
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={remove}
                >
                  {busy
                    ? t("در حال حذف…", "Deleting…")
                    : t("حذف آدرس", "Delete address")}
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={close}
                >
                  {t("انصراف", "Cancel")}
                </button>
              </div>
              <small>
                {t(
                  liveApi?"این آدرس از حساب حذف می‌شود؛ نشانی سفارش‌های قبلی تغییر نمی‌کند.":"حذف و پاسخ فقط Demo هستند؛ سفارش یا مرسله لغو نمی‌شود.",
                  liveApi?"This address is removed from your account; historical order addresses remain unchanged.":"Deletion and response are Demo only; no order or shipment is cancelled.",
                )}
              </small>
            </div>
          )}
          {dialogKind === "destination" && (
            <div className="account-address-destination">
              <p>
                {t(
                  "این مقصد مستقل است و در این مرحله بازطراحی نشده است. تغییر نشانی سفارش فقط با مجوز جریان مربوط انجام می‌شود.",
                  "This is an independent destination, not redesigned here. Order address changes require the relevant flow’s permission.",
                )}
              </p>
              <code dir="ltr">{destination}</code>
              <button className="button secondary" onClick={close}>
                {t("بازگشت به آدرس‌ها", "Back to addresses")}
              </button>
              <a
                className="text-link"
                href={destination}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return
                  event.preventDefault()
                  navigate(destination)
                }}
              >
                {t("بازکردن صفحه موجود", "Open the existing page")}
                <Glyph name="arrow" size={15} />
              </a>
            </div>
          )}
        </dialog>
      </div>
      <dialog ref={leaveDialog} className="account-address-dialog account-address-confirm-dialog" aria-labelledby="address-leave-title" onCancel={()=>{leaveAction.current=null;setLeaving(false)}}><h2 id="address-leave-title">{t("تغییرات ذخیره نشده","Unsaved changes")}</h2><p>{t("تغییرات ذخیره نشده کنار گذاشته شوند؟","Discard your unsaved changes?")}</p><button className="button secondary" onClick={()=>{leaveAction.current=null;setLeaving(false)}}>{t("ادامه ویرایش","Keep editing")}</button><button className="button primary" onClick={()=>{const proceed=leaveAction.current;leaveAction.current=null;formDirty.current=false;setLeaving(false);close();proceed?.()}}>{t("کنار گذاشتن تغییرات","Discard changes")}</button></dialog>
    </DashboardPage>
  )
}
