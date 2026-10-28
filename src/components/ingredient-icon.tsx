import { ingredientArtUrl } from "@/data/ingredient-art";
import type { IngredientCategory } from "@/lib/domain/types";

/**
 * 재료 일러스트. 이름이 늘 옆에 함께 있으므로 그림은 장식(aria-hidden)이다.
 * 그림은 data URL이라 next/image의 최적화가 필요 없다.
 */
export function IngredientIcon({
  ingredientId,
  category,
  className = "size-8",
}: {
  ingredientId: string | null | undefined;
  category: IngredientCategory | null | undefined;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 코드로 만든 SVG data URL
    <img
      src={ingredientArtUrl(ingredientId, category)}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      data-ingredient-art={ingredientId ?? category ?? "custom"}
      className={`pointer-events-none inline-block shrink-0 select-none ${className}`}
    />
  );
}
