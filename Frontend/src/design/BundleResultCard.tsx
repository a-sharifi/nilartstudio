import ProductCard, { type ProductCardProps } from "./ProductCard"

export default function BundleResultCard(
  props: ProductCardProps & { bundleSummary: string },
) {
  return <ProductCard {...props} onFavorite={undefined} />
}
