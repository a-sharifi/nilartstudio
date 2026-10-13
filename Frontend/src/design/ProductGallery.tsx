import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  gallery as defaultGallery,
  notebookCopy,
  type GalleryImage,
} from "./product"

export type ProductDialog = (
  open: boolean,
  close: () => void,
  title: string,
  children: ReactNode,
  kind: "lightbox" | "guide" | "cart",
) => ReactNode
export default function ProductGallery({
  language,
  media,
  renderDialog,
  imageIndex,
  images = defaultGallery,
  productName,
  renderView,
}: {
  language: 0 | 1
  media: ReactNode
  renderDialog: ProductDialog
  imageIndex?: number
  images?: GalleryImage[]
  productName?: string
  renderView?: (index: number) => ReactNode
}) {
  const gallery = images
  const name = productName || notebookCopy.name[language]
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState(false)
  const zoomTarget = useRef<HTMLButtonElement>(null)
  const startX = useRef<number | null>(null)
  const swiped = useRef(false)
  const t = (fa: string, en: string) => (language === 0 ? fa : en)
  useEffect(() => {
    if (imageIndex !== undefined && gallery[imageIndex]) setActive(imageIndex)
  }, [imageIndex])
  const next = (direction: number) =>
    setActive((index) => (index + direction + gallery.length) % gallery.length)
  const gesture = {
    onTouchStart: (e: React.TouchEvent) => {
      swiped.current = false
      startX.current = e.touches[0]?.clientX ?? null
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current !== null) {
        const delta = (e.changedTouches[0]?.clientX || 0) - startX.current
        if (Math.abs(delta) > 45) {
          swiped.current = true
          next(delta < 0 ? 1 : -1)
        }
      }
      startX.current = null
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault()
        next(e.key === "ArrowRight" ? 1 : -1)
      }
    },
  }
  const controls = (
    <div className="gallery-controls">
      <button
        className="icon-button"
        onClick={() => next(-1)}
        aria-label={t("تصویر قبلی", "Previous image")}
      >
        ‹
      </button>
      <span>
        {(active + 1).toLocaleString(language === 0 ? "fa-IR" : "en-US")}{" "}
        {t("از", "of")}{" "}
        {gallery.length.toLocaleString(language === 0 ? "fa-IR" : "en-US")}
      </span>
      <button
        className="icon-button"
        onClick={() => next(1)}
        aria-label={t("تصویر بعدی", "Next image")}
      >
        ›
      </button>
    </div>
  )
  return (
    <div className="product-gallery">
      <div className="gallery-main" {...gesture}>
        <button
          className="gallery-zoom-target"
          ref={zoomTarget}
          onClick={() => {
            if (swiped.current) {
              swiped.current = false
              return
            }
            setZoom(true)
          }}
          aria-label={
            t("بزرگ‌نمایی تصویر: ", "Enlarge image: ") +
            gallery[active].label[language]
          }
        >
          <GallerySurface
            index={active}
            language={language}
            media={media}
            images={images}
            name={name}
            renderView={renderView}
          />
        </button>
        <span className="gallery-editorial">
          NILART STUDIO / EVERYDAY OBJECTS
        </span>
        <span className="zoom-hint">
          {t("برای بزرگ‌نمایی کلیک کن", "Click to take a closer look")}{" "}
          <ZoomIcon />
        </span>
      </div>
      <div className="gallery-footer">
        <span>
          {gallery[active].label[language]} ·{" "}
          {t("جای‌نگهدار تصویر", "Image placeholder")}
        </span>
        {controls}
      </div>
      <div
        className="gallery-thumbnails"
        role="group"
        aria-label={t("تصاویر محصول", "Product images")}
      >
        {gallery.map((image, index) => (
          <button
            key={image.view}
            className={index === active ? "selected" : ""}
            aria-pressed={index === active}
            onClick={() => setActive(index)}
            aria-label={image.label[language]}
          >
            <div aria-hidden="true">
              <GallerySurface
                index={index}
                language={language}
                media={media}
                images={images}
                name={name}
                renderView={renderView}
                thumbnail
              />
            </div>
            <span>{image.label[language]}</span>
          </button>
        ))}
      </div>
      <p className="gallery-disclaimer">
        {t(
          "ماکت طراحی است؛ تصویر و طرح اصلی برند پس از دریافت جایگزین می‌شود.",
          "Design mockups only; approved brand artwork and photography will replace these images.",
        )}
      </p>
      {renderDialog(
        zoom,
        () => {
          swiped.current = false
          setZoom(false)
          requestAnimationFrame(() => zoomTarget.current?.focus())
        },
        gallery[active].label[language],
        <div className="product-lightbox" {...gesture}>
          <GallerySurface
            index={active}
            language={language}
            media={media}
            images={images}
            name={name}
            renderView={renderView}
          />
          {controls}
        </div>,
        "lightbox",
      )}
    </div>
  )
}
function ZoomIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6M7 10h6M10 7v6" />
    </svg>
  )
}
function GallerySurface({
  index,
  language,
  media,
  thumbnail = false,
  images = defaultGallery,
  name = notebookCopy.name[language],
  renderView,
}: {
  index: number
  language: 0 | 1
  media: ReactNode
  thumbnail?: boolean
  images?: GalleryImage[]
  name?: string
  renderView?: (index: number) => ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const image = images[index]
  useEffect(() => setFailed(false), [index])
  return (
    <div
      className={`gallery-surface gallery-view-${image.view}`}
      role="img"
      aria-label={`${name} — ${image.label[language]} — ${
        language === 0 ? "تصویر نمونه" : "sample image"
      }`}
    >
      {image.src && !failed ? (
        <img src={image.src} alt="" onError={() => setFailed(true)} />
      ) : (
        <>
          <div className="gallery-object" aria-hidden="true">
            {renderView ? (
              renderView(index)
            ) : index === 0 ? (
              media
            ) : index === 1 ? (
              <div className="sample-back">
                <span>nilart.</span>
                <small>A LITTLE WORLD OF ART</small>
              </div>
            ) : index === 2 ? (
              <div className="sample-spread">
                <span />
                <span />
              </div>
            ) : (
              <div className="sample-paper">
                <span />
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          {!thumbnail && (
            <span className="gallery-sample-tag">
              {language === 0
                ? "تصویر نمونه — نه دارایی واقعی برند"
                : "Sample mockup — not brand photography"}
            </span>
          )}
        </>
      )}
    </div>
  )
}
