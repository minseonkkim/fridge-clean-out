/** 보관 방식 */
export type Storage = "fridge" | "freezer" | "room";

export const STORAGES: readonly Storage[] = ["fridge", "freezer", "room"] as const;

export const STORAGE_LABEL: Record<Storage, string> = {
  fridge: "냉장",
  freezer: "냉동",
  room: "실온",
};

/** 기본 단위 */
export type Unit = "ea" | "g" | "ml" | "pack" | "bunch";

export const UNIT_LABEL: Record<Unit, string> = {
  ea: "개",
  g: "g",
  ml: "ml",
  pack: "팩",
  bunch: "단",
};

export type IngredientCategory =
  | "vegetable"
  | "fruit"
  | "meat"
  | "seafood"
  | "egg_dairy"
  | "tofu_bean"
  | "grain_noodle"
  | "processed"
  | "side_kimchi"
  | "sauce"
  | "beverage"
  | "etc";

export const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  vegetable: "채소",
  fruit: "과일",
  meat: "육류",
  seafood: "해산물",
  egg_dairy: "계란·유제품",
  tofu_bean: "두부·콩",
  grain_noodle: "곡류·면",
  processed: "가공식품",
  side_kimchi: "김치·반찬",
  sauce: "양념·소스",
  beverage: "음료",
  etc: "기타",
};

/** 보관 기한 출처 코드 (docs/데이터 출처 확인.md) */
export type IngredientSource = "mfds" | "usda-foodkeeper" | "seoul-nutri" | "manual";

/** 가스레인지·냄비·프라이팬은 있다고 가정한다. 이 셋만 온보딩에서 묻는다. */
export type Tool = "microwave" | "air_fryer" | "oven";

export const TOOL_LABEL: Record<Tool, string> = {
  microwave: "전자레인지",
  air_fryer: "에어프라이어",
  oven: "오븐",
};

export interface RecipeStep {
  text: string;
  timerSec?: number;
}

/** 레시피 재료 한 줄. 같은 groupNo끼리는 서로 대체할 수 있다. */
export interface RecipeIngredient {
  groupNo: number;
  ingredientId: string;
  required: boolean;
  amount: number;
  unit: Unit;
}

/** 레시피 (DB recipes + recipe_ingredients) */
export interface Recipe {
  id: string;
  name: string;
  minutes: number;
  difficulty: 1 | 2 | 3;
  servings: number;
  tools: Tool[];
  steps: RecipeStep[];
  ingredients: RecipeIngredient[];
  imageKey: string | null;
  source: string;
}

/** 재료 사전 항목 (DB ingredients 테이블과 1:1) */
export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  aliases: string[];
  defaultUnit: Unit;
  /** 요리 1회 평균 사용량 (기본 단위 기준) */
  usePerRecipe: number;
  /** 보관 방식별 권장 일수. 0이면 그 방식은 권장하지 않는다. */
  shelfDays: Record<Storage, number>;
  defaultStorage: Storage;
  iconKey: string;
  source: IngredientSource;
  /** 기본 양념: 있다고 가정하고 플래너가 부족 재료로 치지 않는다. */
  isPantryStaple: boolean;
}
