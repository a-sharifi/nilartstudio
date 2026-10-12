import { useEffect, useId, useState, type ReactNode } from "react"
import { priceDigits, priceError } from "./shop"
import { categories } from "./data"
import { emptyFilters, normalizeFilters, type Filters } from "./catalog"

export default function FilterPanel({
  filters,
  onChange,
  language,
  sizes,
  weights,
  onClear,
  draftOnly = false,
  hasPrices = true,
  hideCategory = false,
  beforeCategory,
  afterAttributes,
  purchasableOnly = false,
}: {
  filters: Filters
  onChange: (filters: Filters) => void
  language: 0 | 1
  sizes: string[]
  weights: number[]
  onClear?: () => void
  draftOnly?: boolean
  hasPrices?: boolean
  hideCategory?: boolean
  beforeCategory?: ReactNode
  afterAttributes?: ReactNode
  purchasableOnly?: boolean
}) {
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  const id = useId()
  const [priceDraft, setPriceDraft] = useState({
    min: filters.min,
    max: filters.max,
  })
  useEffect(
    () => setPriceDraft({ min: filters.min, max: filters.max }),
    [filters.min, filters.max],
  )
  const problem = priceError(priceDraft.min, priceDraft.max)
  const invalid = !!problem
  const update = (patch: Partial<Filters>) =>
    onChange(normalizeFilters({ ...filters, ...patch }))
  return (
    <div className="filter-panel">
      <div className="filter-title">
        <h2>{t("فیلترها", "Filters")}</h2>
        <button
          className="filter-clear"
          onClick={() => {
            setPriceDraft({ min: "", max: "" })
            ;(onClear || (() => onChange({ ...emptyFilters })))()
          }}
        >
          {t("پاک‌کردن", "Clear")}
        </button>
      </div>
      {beforeCategory}
      {!hideCategory && (
        <fieldset>
          <legend>{t("دسته محصول", "Product category")}</legend>
          <label className="filter-choice">
            <input
              type="radio"
              name={`${id}-category`}
              checked={!filters.category}
              onChange={() => update({ category: "" })}
            />
            {t("همه دسته‌ها", "All categories")}
          </label>
          {categories.map((category) => (
            <label className="filter-choice" key={category.id}>
              <input
                type="radio"
                name={`${id}-category`}
                checked={filters.category === category.id}
                onChange={() => update({ category: category.id })}
              />
              {category.name[language]}
            </label>
          ))}
        </fieldset>
      )}
      {["sketchbooks", "notebooks"].includes(filters.category) &&
        sizes.length > 0 && (
          <fieldset>
            <legend>{t("سایز", "Size")}</legend>
            <div className="size-filter">
              {["", ...sizes].map((size) => (
                <label
                  className={`size-choice ${
                    filters.size === size ? "active" : ""
                  }`}
                  key={size}
                >
                  <input
                    type="radio"
                    name={`${id}-size`}
                    checked={filters.size === size}
                    onChange={() => update({ size })}
                  />
                  <span>{size || t("همه", "All")}</span>
                </label>
              ))}
            </div>
            <small>
              {t(
                "سایز، فیلتر است؛ انتخاب نهایی در جزئیات محصول.",
                "A filter, not your final SKU selection.",
              )}
            </small>
          </fieldset>
        )}
      {["sketchbooks", "notebooks"].includes(filters.category) &&
        weights.length > 0 && (
          <fieldset>
            <legend>{t("گرماژ کاغذ", "Paper weight")}</legend>
            <select
              aria-label={t("گرماژ کاغذ", "Paper weight")}
              value={filters.weight}
              onChange={(e) => update({ weight: e.target.value })}
            >
              <option value="">{t("همه گرماژها", "All weights")}</option>
              {weights.map((weight) => (
                <option key={weight} value={weight}>
                  {weight.toLocaleString(language === 0 ? "fa-IR" : "en-US")}{" "}
                  {t("گرم", "gsm")}
                </option>
              ))}
            </select>
          </fieldset>
        )}
      {afterAttributes}
      {hasPrices && (
        <fieldset>
          <legend>
            {t("محدوده قیمت", "Price range")}{" "}
            <span className="filter-unit">{t("تومان", "toman")}</span>
          </legend>
          <div className="price-inputs">
            {(["min", "max"] as const).map((key) => (
              <label key={key}>
                {key === "min" ? t("از", "Min") : t("تا", "Max")}
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  value={priceDraft[key]}
                  onChange={(e) => {
                    const next = {
                      ...priceDraft,
                      [key]: priceDigits(e.target.value),
                    }
                    setPriceDraft(next)
                    if (draftOnly) update(next)
                  }}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? `${id}-price-error` : undefined}
                />
              </label>
            ))}
          </div>
          {invalid && (
            <p className="filter-error" id={`${id}-price-error`} role="alert">
              {problem === "number"
                ? t(
                    "قیمت را با ارقام معتبر و بدون مقدار منفی وارد کنید.",
                    "Enter a valid, non-negative price.",
                  )
                : t(
                    "حداقل قیمت نباید بیشتر از حداکثر باشد.",
                    "Minimum price cannot exceed maximum.",
                  )}
            </p>
          )}
          {!draftOnly && (
            <button
              className="price-apply"
              disabled={invalid}
              onClick={() => update(priceDraft)}
            >
              {t("ثبت بازه قیمت", "Set price range")}
            </button>
          )}
        </fieldset>
      )}
      <fieldset>
        <legend>{t("موجودی", "Availability")}</legend>
        <label className="filter-choice">
          <input
            type="checkbox"
            checked={filters.stock}
            onChange={(e) => update({ stock: e.target.checked })}
          />
          {purchasableOnly
            ? t("فقط قابل خرید", "Purchasable only")
            : t("فقط موجودها", "In stock only")}
        </label>
        <small>
          {t(
            "فقط گزینه‌ها و ترکیب‌های قابل خرید",
            "Purchasable options and complete bundles",
          )}
        </small>
      </fieldset>
    </div>
  )
}
