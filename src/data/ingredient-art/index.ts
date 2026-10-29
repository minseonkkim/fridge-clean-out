import type { IngredientCategory } from "../../lib/domain/types.ts";
import { drawArt } from "./draw.ts";
import { CATEGORY_SPEC, INGREDIENT_SPEC, type ArtSpec } from "./specs.ts";

/**
 * 재료 그림 (결정 D8). 설계도(specs.ts)는 2D 일러스트와 3D 장난감 모델이 함께 쓴다.
 * 2D는 SVG를 한 번만 만들어 data URL로 기억해 두고 <img>로 쓴다.
 */
const cache = new Map<string, string>();

/** 재료의 설계도. 사전에 없으면 분류 설계도, 분류도 없으면 장바구니 봉지. */
export function ingredientSpec(
  ingredientId: string | null | undefined,
  category: IngredientCategory | null | undefined,
): { key: string; spec: ArtSpec } {
  if (ingredientId && INGREDIENT_SPEC[ingredientId])
    return { key: ingredientId, spec: INGREDIENT_SPEC[ingredientId] };
  const key = category && CATEGORY_SPEC[category] ? category : "custom";
  return { key: `category:${key}`, spec: CATEGORY_SPEC[key] };
}

/** 재료 그림 주소 (2D) */
export function ingredientArtUrl(
  ingredientId: string | null | undefined,
  category: IngredientCategory | null | undefined,
): string {
  const { key, spec } = ingredientSpec(ingredientId, category);
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawArt(spec))}`;
    cache.set(key, url);
  }
  return url;
}

/** 테스트·미리보기용: 그림 원본 SVG */
export function ingredientArtSvg(ingredientId: string): string | null {
  const spec = INGREDIENT_SPEC[ingredientId];
  return spec ? drawArt(spec) : null;
}

export { CATEGORY_SPEC, INGREDIENT_SPEC, type ArtSpec };
