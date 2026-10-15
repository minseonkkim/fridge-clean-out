import { calcExpiry, type ExpiryResult } from "./expiry";
import type { IsoDate, NewItemInput } from "./fridge";
import { defaultSlot } from "./placement";
import type { Ingredient, Storage, Unit } from "./types";

/**
 * 재료 추가 시트의 상태와 규칙 (기획서 F1, 4장 재료 추가 시트).
 * - 재료를 고르면 기본 보관 방식·단위·1회 사용량이 채워지고 기한이 계산된다.
 * - 보관 방식이나 구매일을 바꾸면 기한을 다시 계산한다. 단, 사용자가 기한을 직접 고쳤으면 유지한다.
 * - 사전에 없는 이름은 그대로 사전 외 재료(custom_name)로 등록한다.
 */
export interface AddItemFormState {
  query: string;
  ingredient: Ingredient | null;
  storage: Storage;
  quantity: string;
  unit: Unit;
  purchasedAt: IsoDate;
  expiresAt: IsoDate;
  expiresManual: boolean;
  expiry: ExpiryResult;
}

export type AddItemAction =
  /** exact: 입력값과 이름·별칭이 정확히 같은 사전 재료 (있으면 자동 선택) */
  | { type: "query"; value: string; exact?: Ingredient }
  | { type: "select"; ingredient: Ingredient }
  | { type: "storage"; value: Storage }
  | { type: "quantity"; value: string }
  | { type: "unit"; value: Unit }
  | { type: "purchasedAt"; value: IsoDate }
  | { type: "expiresAt"; value: IsoDate }
  | { type: "resetExpiry" }
  | { type: "reset"; today: IsoDate };

export function initialAddItemForm(today: IsoDate): AddItemFormState {
  const expiry = calcExpiry(null, "fridge", today);
  return {
    query: "",
    ingredient: null,
    storage: "fridge",
    quantity: "1",
    unit: "ea",
    purchasedAt: today,
    expiresAt: expiry.expiresAt,
    expiresManual: false,
    expiry,
  };
}

function withExpiry(state: AddItemFormState): AddItemFormState {
  const expiry = calcExpiry(state.ingredient, state.storage, state.purchasedAt);
  return {
    ...state,
    expiry,
    expiresAt: state.expiresManual ? state.expiresAt : expiry.expiresAt,
  };
}

/** 소수 둘째 자리까지만 */
function formatAmount(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function addItemFormReducer(
  state: AddItemFormState,
  action: AddItemAction,
): AddItemFormState {
  switch (action.type) {
    case "query": {
      // 사전 이름을 그대로 입력했으면 고른 것으로 본다 (입력한 글자는 그대로 둔다).
      if (action.exact && action.exact.id !== state.ingredient?.id) {
        return { ...selectIngredient(state, action.exact), query: action.value };
      }
      // 이름을 다시 고치기 시작하면 고른 재료를 해제한다 (사전 외 재료로 바뀔 수 있다).
      const keep = state.ingredient && action.exact?.id === state.ingredient.id;
      return withExpiry({
        ...state,
        query: action.value,
        ingredient: keep ? state.ingredient : null,
      });
    }
    case "select":
      return selectIngredient(state, action.ingredient);
    case "storage":
      return withExpiry({ ...state, storage: action.value });
    case "quantity":
      return { ...state, quantity: action.value };
    case "unit":
      return { ...state, unit: action.value };
    case "purchasedAt":
      return withExpiry({ ...state, purchasedAt: action.value });
    case "expiresAt":
      return { ...state, expiresAt: action.value, expiresManual: true };
    case "resetExpiry":
      return withExpiry({ ...state, expiresManual: false });
    case "reset":
      return initialAddItemForm(action.today);
  }
}

function selectIngredient(state: AddItemFormState, ingredient: Ingredient): AddItemFormState {
  return withExpiry({
    ...state,
    query: ingredient.name,
    ingredient,
    storage: ingredient.defaultStorage,
    unit: ingredient.defaultUnit,
    quantity: formatAmount(
      ingredient.defaultUnit === "g" || ingredient.defaultUnit === "ml"
        ? ingredient.usePerRecipe
        : Math.max(1, Math.ceil(ingredient.usePerRecipe)),
    ),
  });
}

export type AddItemValidation = { ok: true; input: NewItemInput } | { ok: false; error: string };

export function validateAddItem(state: AddItemFormState): AddItemValidation {
  const name = state.query.trim();
  if (!state.ingredient && !name) return { ok: false, error: "재료 이름을 입력해 주세요." };

  const quantity = Number(state.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "수량은 0보다 커야 해요." };
  }
  if (state.expiresAt < state.purchasedAt) {
    return { ok: false, error: "기한이 구매일보다 빨라요." };
  }

  const ingredient = state.ingredient;
  return {
    ok: true,
    input: {
      ingredientId: ingredient?.id ?? null,
      customName: ingredient ? null : name,
      slot: defaultSlot(ingredient?.category ?? null, state.storage, ingredient?.id),
      storage: state.storage,
      quantity,
      unit: state.unit,
      purchasedAt: state.purchasedAt,
      expiresAt: state.expiresAt,
      expiresManual: state.expiresManual,
    },
  };
}
