import type { IngredientCategory } from "../../lib/domain/types.ts";
import { CATEGORY_ART, INGREDIENT_ART } from "./specs.ts";

/**
 * 재료 일러스트 (결정 D8 개정: 이모지 → 직접 그린 입체 일러스트).
 * SVG를 한 번만 만들어 data URL로 기억해 두고 <img>로 쓴다.
 * 같은 재료가 냉장고에 여러 번 나와도 브라우저가 한 번만 해석한다.
 */
const cache = new Map<string, string>();

function toUrl(key: string, draw: () => string): string {
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(draw())}`;
    cache.set(key, url);
  }
  return url;
}

/** 재료 그림 주소. 사전에 없으면 분류 그림, 분류도 없으면 장바구니 봉지. */
export function ingredientArtUrl(
  ingredientId: string | null | undefined,
  category: IngredientCategory | null | undefined,
): string {
  if (ingredientId && INGREDIENT_ART[ingredientId])
    return toUrl(ingredientId, INGREDIENT_ART[ingredientId]);
  const key = category ?? "custom";
  return toUrl(`category:${key}`, CATEGORY_ART[key] ?? CATEGORY_ART.custom);
}

/** 테스트·미리보기용: 그림 원본 SVG */
export function ingredientArtSvg(ingredientId: string): string | null {
  return INGREDIENT_ART[ingredientId]?.() ?? null;
}

export { CATEGORY_ART, INGREDIENT_ART };
