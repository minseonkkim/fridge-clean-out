import type { Storage, Unit } from "./types";

/** 칸의 고정 키 (DB compartments.slot, 기획서 3.1절) */
export type CompartmentSlot =
  | "fridge_top"
  | "fridge_middle"
  | "fridge_bottom"
  | "veg_drawer"
  | "fridge_door"
  | "freezer_upper"
  | "freezer_lower"
  | "pantry";

export const COMPARTMENT_SLOTS: readonly CompartmentSlot[] = [
  "fridge_top",
  "fridge_middle",
  "fridge_bottom",
  "veg_drawer",
  "fridge_door",
  "freezer_upper",
  "freezer_lower",
  "pantry",
] as const;

export const SLOT_STORAGE: Record<CompartmentSlot, Storage> = {
  fridge_top: "fridge",
  fridge_middle: "fridge",
  fridge_bottom: "fridge",
  veg_drawer: "fridge",
  fridge_door: "fridge",
  freezer_upper: "freezer",
  freezer_lower: "freezer",
  pantry: "room",
};

export type ItemStatus = "active" | "used_up" | "discarded";

/** 날짜는 'YYYY-MM-DD' (사용자 기기 기준 날짜) */
export type IsoDate = string;

/** 냉장고 안의 재료 하나 (DB fridge_items) */
export interface FridgeItem {
  id: string;
  ingredientId: string | null;
  customName: string | null;
  slot: CompartmentSlot | null;
  storage: Storage;
  quantity: number;
  unit: Unit;
  purchasedAt: IsoDate;
  expiresAt: IsoDate;
  expiresManual: boolean;
  memo: string | null;
  status: ItemStatus;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewItemInput {
  ingredientId: string | null;
  customName?: string | null;
  slot?: CompartmentSlot | null;
  storage: Storage;
  quantity: number;
  unit: Unit;
  purchasedAt: IsoDate;
  expiresAt: IsoDate;
  expiresManual?: boolean;
  memo?: string | null;
}

export type ItemPatch = Partial<
  Pick<
    FridgeItem,
    "slot" | "storage" | "quantity" | "unit" | "expiresAt" | "expiresManual" | "memo" | "customName"
  >
>;

export type ItemEventType = "added" | "used" | "cooked" | "discarded" | "moved" | "edited";

export interface ItemEvent {
  id: string;
  itemId: string;
  type: ItemEventType;
  quantityDelta: number | null;
  recipeId: string | null;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  ingredientId: string | null;
  name: string;
  quantity: number | null;
  unit: Unit | null;
  checked: boolean;
  fromRecipeId: string | null;
  createdAt: string;
}

export interface NewShoppingInput {
  ingredientId: string | null;
  name: string;
  quantity?: number | null;
  unit?: Unit | null;
  fromRecipeId?: string | null;
}

/**
 * 이미 목록에 있는(아직 사지 않은) 같은 재료는 다시 담지 않는다.
 * 사전 재료는 id로, 사전 외 재료는 이름으로 비교한다.
 */
export function dedupeShopping(
  existing: Pick<ShoppingItem, "ingredientId" | "name" | "checked">[],
  inputs: NewShoppingInput[],
): NewShoppingInput[] {
  const key = (x: { ingredientId: string | null; name: string }) =>
    x.ingredientId ?? `name:${x.name.trim()}`;
  const seen = new Set(existing.filter((s) => !s.checked).map(key));
  const result: NewShoppingInput[] = [];
  for (const input of inputs) {
    const k = key(input);
    if (seen.has(k)) continue;
    seen.add(k);
    result.push(input);
  }
  return result;
}

export interface Preferences {
  householdSize: number;
  mealsPerDay: number;
  excludedIngredientIds: string[];
  tools: string[];
  /** 끈 기본 양념 id 목록 */
  disabledPantry: string[];
  onboardedAt: string | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  householdSize: 1,
  mealsPerDay: 2,
  excludedIngredientIds: [],
  tools: [],
  disabledPantry: [],
  onboardedAt: null,
};

/** 재료의 표시 이름 */
export function itemDisplayName(
  item: Pick<FridgeItem, "ingredientId" | "customName">,
  lookup: (id: string) => { name: string } | undefined,
): string {
  if (item.customName) return item.customName;
  if (item.ingredientId) return lookup(item.ingredientId)?.name ?? item.ingredientId;
  return "이름 없는 재료";
}
