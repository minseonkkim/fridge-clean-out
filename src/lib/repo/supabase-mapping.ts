import {
  DEFAULT_PREFERENCES,
  type CompartmentSlot,
  type FridgeItem,
  type ItemPatch,
  type ItemStatus,
  type NewItemInput,
  type Preferences,
  type ShoppingItem,
} from "@/lib/domain/fridge";
import type { Storage, Unit } from "@/lib/domain/types";

/** DB 행 모양 (PostgREST가 돌려주는 JSON) */
export interface FridgeItemRow {
  id: string;
  fridge_id: string;
  ingredient_id: string | null;
  custom_name: string | null;
  compartment_id: string | null;
  storage: Storage;
  quantity: number | string;
  unit: Unit;
  purchased_at: string;
  expires_at: string;
  expires_manual: boolean;
  memo: string | null;
  status: ItemStatus;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItemRow {
  id: string;
  fridge_id: string;
  ingredient_id: string | null;
  name: string;
  quantity: number | string | null;
  unit: Unit | null;
  checked: boolean;
  from_recipe_id: string | null;
  created_at: string;
}

export interface PreferencesRow {
  user_id: string;
  household_size: number;
  meals_per_day: number;
  excluded_ingredient_ids: string[];
  tools: string[];
  pantry_overrides: { disabled_pantry?: string[] } | null;
  onboarded_at: string | null;
}

export interface CompartmentRow {
  id: string;
  slot: CompartmentSlot;
}

/** 칸 id ↔ slot 변환표 */
export class CompartmentMap {
  private readonly slotById = new Map<string, CompartmentSlot>();
  private readonly idBySlot = new Map<CompartmentSlot, string>();

  constructor(rows: CompartmentRow[]) {
    for (const row of rows) {
      this.slotById.set(row.id, row.slot);
      this.idBySlot.set(row.slot, row.id);
    }
  }

  slot(id: string | null): CompartmentSlot | null {
    return id ? (this.slotById.get(id) ?? null) : null;
  }

  id(slot: CompartmentSlot | null | undefined): string | null {
    return slot ? (this.idBySlot.get(slot) ?? null) : null;
  }
}

// numeric 컬럼은 문자열로 올 수도 있다.
const num = (v: number | string) => (typeof v === "string" ? Number(v) : v);

export function itemFromRow(row: FridgeItemRow, compartments: CompartmentMap): FridgeItem {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    customName: row.custom_name,
    slot: compartments.slot(row.compartment_id),
    storage: row.storage,
    quantity: num(row.quantity),
    unit: row.unit,
    purchasedAt: row.purchased_at,
    expiresAt: row.expires_at,
    expiresManual: row.expires_manual,
    memo: row.memo,
    status: row.status,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowFromNewItem(
  input: NewItemInput,
  fridgeId: string,
  compartments: CompartmentMap,
): Omit<FridgeItemRow, "id" | "status" | "closed_at" | "created_at" | "updated_at"> {
  return {
    fridge_id: fridgeId,
    ingredient_id: input.ingredientId,
    custom_name: input.customName?.trim() || null,
    compartment_id: compartments.id(input.slot),
    storage: input.storage,
    quantity: input.quantity,
    unit: input.unit,
    purchased_at: input.purchasedAt,
    expires_at: input.expiresAt,
    expires_manual: input.expiresManual ?? false,
    memo: input.memo ?? null,
  };
}

export function rowFromPatch(patch: ItemPatch, compartments: CompartmentMap) {
  const row: Partial<FridgeItemRow> = {};
  if (patch.slot !== undefined) row.compartment_id = compartments.id(patch.slot);
  if (patch.storage !== undefined) row.storage = patch.storage;
  if (patch.quantity !== undefined) row.quantity = patch.quantity;
  if (patch.unit !== undefined) row.unit = patch.unit;
  if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt;
  if (patch.expiresManual !== undefined) row.expires_manual = patch.expiresManual;
  if (patch.memo !== undefined) row.memo = patch.memo;
  if (patch.customName !== undefined) row.custom_name = patch.customName?.trim() || null;
  return row;
}

export function shoppingFromRow(row: ShoppingItemRow): ShoppingItem {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    name: row.name,
    quantity: row.quantity === null ? null : num(row.quantity),
    unit: row.unit,
    checked: row.checked,
    fromRecipeId: row.from_recipe_id,
    createdAt: row.created_at,
  };
}

export function preferencesFromRow(row: PreferencesRow | null): Preferences {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return {
    householdSize: row.household_size,
    mealsPerDay: row.meals_per_day,
    excludedIngredientIds: row.excluded_ingredient_ids ?? [],
    tools: row.tools ?? [],
    disabledPantry: row.pantry_overrides?.disabled_pantry ?? [],
    onboardedAt: row.onboarded_at,
  };
}

export function rowFromPreferences(userId: string, p: Preferences): PreferencesRow {
  return {
    user_id: userId,
    household_size: p.householdSize,
    meals_per_day: p.mealsPerDay,
    excluded_ingredient_ids: p.excludedIngredientIds,
    tools: p.tools,
    pantry_overrides: { disabled_pantry: p.disabledPantry },
    onboarded_at: p.onboardedAt,
  };
}
