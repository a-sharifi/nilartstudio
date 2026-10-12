import { useState, type ReactNode } from "react"
import { collectionName, type Collection } from "./data"

type Props = {
  collection: Collection
  language: 0 | 1
  onNavigate: (name: string, route: string) => void
  media: ReactNode
  arrow: ReactNode
  compact?: boolean
  forceFallback?: boolean
}

export function CollectionSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact ? "skeleton-card" : "collection-detail-card collection-skeleton"
      }
      aria-hidden="true"
    >
      <div
        className={`skeleton ${
          compact ? "collection-image" : "collection-detail-image"
        }`}
      />
      <div className="collection-detail-copy">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
      </div>
    </div>
  )
}

export default function CollectionCard({
  collection,
  language,
  onNavigate,
  media,
  arrow,
  compact = false,
  forceFallback = false,
}: Props) {
  const [failedSource, setFailedSource] = useState<string>()
  const name = collectionName(collection, language)
  const route = `/collections/${collection.slug}`
  const fallback =
    forceFallback || !collection.image || failedSource === collection.image
  return (
    <a
      className={compact ? "collection-card" : "collection-detail-card"}
      href={route}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        event.preventDefault()
        onNavigate(name, route)
      }}
    >
      <div
        className={`${
          compact ? "collection-image" : "collection-detail-image"
        } ${collection.color}`}
      >
        {fallback ? (
          <div className="collection-placeholder">
            <div aria-hidden="true" className="collection-placeholder-art">
              {media}
            </div>
            {!compact && (
              <>
                <span className="collection-placeholder-name" dir="auto">
                  {name}
                </span>
                <span className="collection-placeholder-note">
                  {language === 0
                    ? "جای‌نگهدار تصویر کالکشن"
                    : "Collection image placeholder"}
                </span>
              </>
            )}
          </div>
        ) : (
          <img
            src={collection.image}
            alt={collection.imageAlt[language] || name}
            onError={() => setFailedSource(collection.image)}
          />
        )}
      </div>
      <div className={compact ? "" : "collection-detail-copy"}>
        <div className="collection-info">
          <h3>
            <bdi>{name}</bdi>
          </h3>
          {compact && arrow}
        </div>
        {!compact && <p>{collection.caption[language]}</p>}
        <span className={compact ? "collection-link" : "collection-detail-cta"}>
          {language === 0 ? "مشاهده کالکشن" : "Explore collection"}
          {!compact && arrow}
        </span>
      </div>
    </a>
  )
}
