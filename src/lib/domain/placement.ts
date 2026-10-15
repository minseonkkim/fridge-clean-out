import type { CompartmentSlot } from "./fridge";
import type { IngredientCategory, Storage } from "./types";

/**
 * 칸별 기본 배치 규칙 (기획서 3.1절)
 * - 채소·과일 → 채소칸
 * - 육류·해산물 → 아래 선반
 * - 계란 → 문 선반, 유제품 → 위 선반
 * - 소스·음료 → 문 선반
 * - 반찬·김치·가공품·그 밖 → 가운데 선반
 * - 냉동: 육류·해산물·가공품은 아래 서랍, 나머지는 위 서랍
 * - 실온: 팬트리 선반
 */
export function defaultSlot(
  category: IngredientCategory | null,
  storage: Storage,
  ingredientId?: string | null,
): CompartmentSlot {
  if (storage === "room") return "pantry";

  if (storage === "freezer") {
    return category === "meat" || category === "seafood" || category === "processed"
      ? "freezer_lower"
      : "freezer_upper";
  }

  switch (category) {
    case "vegetable":
    case "fruit":
      return "veg_drawer";
    case "meat":
    case "seafood":
      return "fridge_bottom";
    case "egg_dairy":
      return ingredientId === "egg" || ingredientId === "quail_egg" ? "fridge_door" : "fridge_top";
    case "sauce":
    case "beverage":
      return "fridge_door";
    default:
      return "fridge_middle";
  }
}
