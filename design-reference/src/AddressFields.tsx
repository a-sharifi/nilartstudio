import { useRef, useState } from "react"
import {
  addressCountry,
  addressErrors,
  cleanAddress,
  type Address,
} from "./address"
import "./address.css"

export function AddressDetails({
  address,
  language,
}: {
  address: Address
  language: 0 | 1
}) {
  const province = addressCountry.provinces.find(
    (p) => p.id === address.province,
  )
  const city = province?.cities.find((c) => c.id === address.city)
  return (
    <div className="address-details">
      <strong dir="auto">{address.name}</strong>
      <span dir="ltr">
        {addressCountry.code}{" "}
        {address.phone.startsWith("900000")
          ? "9•• ••• •••• · DEMO"
          : address.phone}
      </span>
      <p>
        {province?.name[language]}، {city?.name[language]}
      </p>
      <p dir="auto">{address.street}</p>
      <small>
        {language === 0 ? "کد پستی" : "Postal code"}:{" "}
        <bdi dir="ltr">
          {address.postal.startsWith("000000")
            ? "•••••••••• · DEMO"
            : address.postal}
        </bdi>
      </small>
    </div>
  )
}

export function AddressForm({
  initial,
  language,
  busy,
  cityFailure,
  onRetry,
  onSave,
  onCancel,
  saveError,
  offline,
  context = "checkout",
  cityLoading = false,
  onProvinceChange,
}: {
  initial: Address
  language: 0 | 1
  busy: boolean
  cityFailure: boolean
  onRetry: () => void
  onSave: (a: Address) => void
  onCancel: () => void
  saveError: string
  offline: boolean
  context?: "checkout" | "account"
  cityLoading?: boolean
  onProvinceChange?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<ReturnType<typeof addressErrors>>({})
  const form = useRef<HTMLFormElement>(null)
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)
  const [discard, setDiscard] = useState(false)
  const change = (key: keyof Address, value: string | boolean) => {
    setDraft((d) => ({
      ...d,
      [key]: value,
      ...(key === "province" ? { city: "" } : {}),
    }))
    setErrors((e) => ({
      ...e,
      [key]: undefined,
      ...(key === "province" ? { city: undefined } : {}),
    }))
    if (key === "province") onProvinceChange?.()
  }
  const submit = () => {
    const found = addressErrors(draft)
    setErrors(found)
    if (Object.keys(found).length) {
      form.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`)
        ?.focus()
      return
    }
    if (!cityFailure && !cityLoading) onSave(cleanAddress(draft))
  }
  const field = (
    key: "name" | "phone" | "postal" | "label",
    label: string,
    auto: string,
    direction?: "ltr",
  ) => (
    <div className="checkout-field">
      <label htmlFor={`address-${key}`}>
        {label}
        {key !== "label" && " *"}
      </label>
      <input
        id={`address-${key}`}
        name={key}
        value={draft[key]}
        onChange={(e) => change(key, e.target.value)}
        onBlur={() =>
          setErrors((e) => ({ ...e, [key]: addressErrors(draft)[key] }))
        }
        autoComplete={auto}
        type={key === "phone" ? "tel" : "text"}
        inputMode={key === "postal" ? "numeric" : undefined}
        dir={direction}
        disabled={busy}
        aria-required={key !== "label"}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
        placeholder={
          key === "name"
            ? t("نام گیرنده را وارد کنید.", "Enter the recipient's name.")
            : key === "phone"
              ? "09… / +98…"
              : key === "label"
                ? t("مثلاً خانه یا محل کار", "e.g. Home or Work")
                : t("۱۰ رقم", "10 digits")
        }
      />
      {error(key)}
    </div>
  )
  const error = (key: keyof Address) =>
    errors[key] && (
      <p className="checkout-field-error" id={`error-${key}`}>
        {errors[key] === "phone"
          ? t("شماره تلفن معتبر وارد کنید.", "Enter a valid phone number.")
          : errors[key] === "postal"
            ? t(
                "کد پستی را بررسی کنید؛ قرارداد نمونه ایران ۱۰ رقم می‌خواهد.",
                "Check the postal code; the demo Iran contract requires 10 digits.",
              )
            : key === "name"
              ? t("نام گیرنده را وارد کنید.", "Enter the recipient's name.")
              : key === "city"
                ? t("شهر را انتخاب کنید.", "Choose a city.")
                : key === "street"
                  ? t("نشانی را وارد کنید.", "Enter the address.")
                  : t("این فیلد الزامی است.", "This field is required.")}
      </p>
    )
  return (
    <form
      ref={form}
      className="address-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault()
          if (!busy) dirty ? setDiscard(true) : onCancel()
        }
      }}
    >
      <p className="address-form-intro">
        {initial.id
          ? t(
              "ویرایش، دفترچه آدرس شما را به‌روزرسانی می‌کند؛ نشانی سفارش‌های قبلی تغییر نمی‌کند.",
              "This updates your saved address. Previously placed orders keep their original delivery address.",
            )
          : t(
              "اطلاعات گیرنده و نشانی را وارد کن.",
              "Enter the recipient and address details.",
            )}
      </p>
      <p className="checkout-demo-note">
        {t(
          "فیلدهای * الزامی‌اند. گیرنده و شماره او مستقل از حساب ورود هستند.",
          "Fields marked * are required. Recipient details are independent of your sign-in account.",
        )}
      </p>
      <fieldset disabled={busy} className="address-form-fields">
        {field(
          "name",
          t("نام و نام خانوادگی گیرنده", "Recipient full name"),
          "shipping name",
        )}
        {field(
          "phone",
          t("شماره تلفن گیرنده", "Recipient phone number"),
          "shipping tel",
          "ltr",
        )}
        <div className="address-country">
          <span>{t("کشور", "Country")}</span>
          <strong>{addressCountry.name[language]}</strong>
          <small>
            {t(
              "مقصدهای نمونه این فروشگاه در ایران هستند.",
              "Demo delivery destinations are in Iran.",
            )}
          </small>
        </div>
        <div className="address-form-grid">
          {(["province", "city"] as const).map((key) => (
            <div className="checkout-field" key={key}>
              <label htmlFor={`address-${key}`}>
                {key === "province"
                  ? t("استان *", "Province *")
                  : t("شهر *", "City *")}
              </label>
              <select
                id={`address-${key}`}
                name={key}
                value={draft[key]}
                disabled={
                  key === "city" &&
                  (!draft.province || cityFailure || cityLoading)
                }
                onChange={(e) => change(key, e.target.value)}
                aria-required="true"
                aria-invalid={!!errors[key]}
                aria-describedby={
                  errors[key]
                    ? `error-${key}`
                    : key === "city"
                      ? "city-helper"
                      : undefined
                }
                autoComplete={
                  key === "province"
                    ? "shipping address-level1"
                    : "shipping address-level2"
                }
              >
                <option value="">
                  {key === "province"
                    ? t("انتخاب استان", "Select province")
                    : t("انتخاب شهر", "Select city")}
                </option>
                {(key === "province"
                  ? addressCountry.provinces
                  : addressCountry.provinces.find(
                      (p) => p.id === draft.province,
                    )?.cities || []
                ).map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name[language]}
                  </option>
                ))}
              </select>
              {error(key)}
              {key === "city" && (
                <small
                  id="city-helper"
                  role={cityLoading ? "status" : undefined}
                >
                  {cityLoading
                    ? t("در حال دریافت شهرها… • Demo", "Loading cities… • Demo")
                    : !draft.province
                      ? t(
                          "ابتدا استان را انتخاب کنید.",
                          "Select a province first.",
                        )
                      : t(
                          "فهرست محدود و نمایشی شهرها؛ شهر قبلی جایگزین نمی‌شود.",
                          "Limited demo city list; the previous city is not silently replaced.",
                        )}
                </small>
              )}
            </div>
          ))}
        </div>
        {cityFailure && (
          <p className="checkout-notice warning" role="alert">
            {t("بارگذاری شهرها انجام نشد.", "We couldn't load the cities.")}{" "}
            <button type="button" className="text-link" onClick={onRetry}>
              {t("دوباره تلاش کنید", "Try again")}
            </button>
          </p>
        )}
        <div className="checkout-field">
          <label htmlFor="address-street">
            {t("نشانی کامل *", "Full address *")}
          </label>
          <textarea
            id="address-street"
            name="street"
            value={draft.street}
            onChange={(e) => change("street", e.target.value)}
            autoComplete="shipping street-address"
            rows={3}
            dir="auto"
            placeholder={t("نشانی کامل را بنویسید.", "Enter the full address.")}
            aria-required="true"
            aria-invalid={!!errors.street}
            aria-describedby={`street-helper${
              errors.street ? " error-street" : ""
            }`}
          />
          <small id="street-helper">
            {t(
              "خیابان، کوچه، پلاک و جزئیات لازم برای تحویل.",
              "Street, building number, and details needed for delivery.",
            )}
          </small>
          {error("street")}
        </div>
        <div className="address-form-grid">
          {field(
            "postal",
            t("کد پستی", "Postal code"),
            "shipping postal-code",
            "ltr",
          )}
          {field(
            "label",
            t("عنوان آدرس (اختیاری)", "Address label (optional)"),
            "off",
          )}
        </div>
        <label className="checkout-checkbox">
          <input
            type="checkbox"
            checked={draft.default}
            onChange={(e) => change("default", e.target.checked)}
          />
          <span>
            {t("استفاده به‌عنوان آدرس پیش‌فرض", "Set as default address")}
          </span>
        </label>
      </fieldset>
      {saveError && (
        <p className="checkout-field-error" role="alert">
          {saveError}
        </p>
      )}
      {discard && (
        <div className="checkout-notice warning" role="alert">
          <p>
            {t(
              "تغییرات هنوز ذخیره نشده‌اند.",
              "Your changes haven't been saved.",
            )}
          </p>
          <button type="button" className="text-link" onClick={onCancel}>
            {t("صرف‌نظر و بستن", "Discard and close")}
          </button>
          <button
            type="button"
            className="text-link"
            onClick={() => setDiscard(false)}
          >
            {t("ادامه ویرایش", "Keep editing")}
          </button>
        </div>
      )}
      <div className="address-form-actions">
        <button
          type="submit"
          className="button primary"
          disabled={busy || cityFailure || cityLoading || offline}
        >
          {busy
            ? t("در حال ذخیره…", "Saving…")
            : context === "account"
              ? t("ذخیره آدرس", "Save address")
              : initial.id
                ? t("ذخیره تغییرات", "Save changes")
                : t("ذخیره و انتخاب آدرس", "Save and select address")}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => (dirty ? setDiscard(true) : onCancel())}
        >
          {context === "account" ? t("انصراف", "Cancel") : t("لغو", "Cancel")}
        </button>
      </div>
    </form>
  )
}
