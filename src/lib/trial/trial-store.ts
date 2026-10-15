import {
  DEFAULT_PREFERENCES,
  type FridgeItem,
  type ItemEvent,
  type ItemEventType,
  type ItemPatch,
  type NewItemInput,
  type Preferences,
  type ShoppingItem,
} from "@/lib/domain/fridge";

/**
 * 비로그인 체험 데이터. 브라우저 localStorage에 통째로 저장한다.
 * 로그인하면 한 번에 계정으로 올리고 지운다 (upload.ts).
 */
export interface TrialData {
  version: 1;
  items: FridgeItem[];
  events: ItemEvent[];
  shopping: ShoppingItem[];
  preferences: Preferences;
}

export const TRIAL_STORAGE_KEY = "naengteol:trial:v1";

export function emptyTrial(): TrialData {
  return {
    version: 1,
    items: [],
    events: [],
    shopping: [],
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

// ─────────────────────────────────────────────
// 저장소 입출력. 사생활 보호 모드나 저장 공간 부족에서도 앱이 멈추지 않게 한다.
// ─────────────────────────────────────────────

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadTrial(storage: KeyValueStorage | null = browserStorage()): TrialData {
  try {
    const raw = storage?.getItem(TRIAL_STORAGE_KEY);
    if (!raw) return emptyTrial();
    const parsed = JSON.parse(raw) as Partial<TrialData>;
    if (parsed.version !== 1) return emptyTrial();
    return {
      ...emptyTrial(),
      ...parsed,
      preferences: { ...DEFAULT_PREFERENCES, ...parsed.preferences },
    } as TrialData;
  } catch {
    return emptyTrial();
  }
}

/** 저장에 성공하면 true. 실패해도 메모리 상태는 유지된다. */
export function saveTrial(data: TrialData, storage: KeyValueStorage | null = browserStorage()) {
  try {
    storage?.setItem(TRIAL_STORAGE_KEY, JSON.stringify(data));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearTrial(storage: KeyValueStorage | null = browserStorage()) {
  try {
    storage?.removeItem(TRIAL_STORAGE_KEY);
  } catch {
    // 지우지 못해도 다음 업로드 시 중복 방지 로직이 막는다.
  }
}

export function hasTrialData(data: TrialData): boolean {
  return data.items.length > 0 || data.shopping.length > 0 || data.preferences.onboardedAt !== null;
}

// ─────────────────────────────────────────────
// 변경 함수: 모두 새 TrialData를 돌려준다 (불변).
// ─────────────────────────────────────────────

interface Clock {
  now: () => Date;
  id: () => string;
}

const systemClock: Clock = { now: () => new Date(), id: () => crypto.randomUUID() };

function event(
  clock: Clock,
  itemId: string,
  type: ItemEventType,
  quantityDelta: number | null,
  recipeId: string | null = null,
): ItemEvent {
  return {
    id: clock.id(),
    itemId,
    type,
    quantityDelta,
    recipeId,
    createdAt: clock.now().toISOString(),
  };
}

export function addItems(data: TrialData, inputs: NewItemInput[], clock = systemClock): TrialData {
  const now = clock.now().toISOString();
  const created: FridgeItem[] = inputs.map((input) => ({
    id: clock.id(),
    ingredientId: input.ingredientId,
    customName: input.customName?.trim() || null,
    slot: input.slot ?? null,
    storage: input.storage,
    quantity: input.quantity,
    unit: input.unit,
    purchasedAt: input.purchasedAt,
    expiresAt: input.expiresAt,
    expiresManual: input.expiresManual ?? false,
    memo: input.memo ?? null,
    status: "active",
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  }));
  for (const item of created) {
    if (!item.ingredientId && !item.customName) {
      throw new Error("사전에 없는 재료는 이름이 필요합니다.");
    }
    if (item.quantity < 0) throw new Error("수량은 0 이상이어야 합니다.");
  }
  return {
    ...data,
    items: [...data.items, ...created],
    events: [...data.events, ...created.map((i) => event(clock, i.id, "added", i.quantity))],
  };
}

export function updateItem(
  data: TrialData,
  itemId: string,
  patch: ItemPatch,
  clock = systemClock,
): TrialData {
  const before = data.items.find((i) => i.id === itemId);
  if (!before) throw new Error("재료를 찾을 수 없습니다.");
  if (patch.quantity !== undefined && patch.quantity < 0)
    throw new Error("수량은 0 이상이어야 합니다.");

  const after: FridgeItem = { ...before, ...patch, updatedAt: clock.now().toISOString() };
  const moved = patch.slot !== undefined && patch.slot !== before.slot;
  const delta =
    patch.quantity !== undefined && patch.quantity !== before.quantity
      ? patch.quantity - before.quantity
      : null;
  const type: ItemEventType = moved ? "moved" : delta !== null && delta < 0 ? "used" : "edited";

  return {
    ...data,
    items: data.items.map((i) => (i.id === itemId ? after : i)),
    events: [...data.events, event(clock, itemId, type, delta)],
  };
}

/** 다 씀 / 버림 */
export function closeItem(
  data: TrialData,
  itemId: string,
  status: "used_up" | "discarded",
  clock = systemClock,
): TrialData {
  const before = data.items.find((i) => i.id === itemId);
  if (!before) throw new Error("재료를 찾을 수 없습니다.");
  if (before.status !== "active") return data;
  const now = clock.now().toISOString();
  const after: FridgeItem = {
    ...before,
    status,
    quantity: status === "used_up" ? 0 : before.quantity,
    closedAt: now,
    updatedAt: now,
  };
  return {
    ...data,
    items: data.items.map((i) => (i.id === itemId ? after : i)),
    events: [
      ...data.events,
      event(clock, itemId, status === "used_up" ? "used" : "discarded", -before.quantity),
    ],
  };
}

/** 요리에 쓴 재료. amount가 null이면 남은 양을 모두 쓴다. */
export interface CookUsage {
  itemId: string;
  amount: number | null;
}

/**
 * 요리 완료 (서버 cook_recipe와 같은 규칙).
 * 하나라도 잘못되면 아무것도 바꾸지 않고 예외를 던진다.
 */
export function cookRecipe(
  data: TrialData,
  recipeId: string,
  usages: CookUsage[],
  clock = systemClock,
): TrialData {
  const now = clock.now().toISOString();
  const items = new Map(data.items.map((i) => [i.id, i]));
  const newEvents: ItemEvent[] = [];

  for (const usage of usages) {
    const item = items.get(usage.itemId);
    if (!item || item.status !== "active") throw new Error("냉장고에 없는 재료입니다.");
    if (usage.amount !== null && usage.amount <= 0) throw new Error("사용량은 0보다 커야 합니다.");
    const used = Math.min(usage.amount ?? item.quantity, item.quantity);
    const quantity = item.quantity - used;
    items.set(item.id, {
      ...item,
      quantity,
      status: quantity === 0 ? "used_up" : item.status,
      closedAt: quantity === 0 ? now : item.closedAt,
      updatedAt: now,
    });
    newEvents.push(event(clock, item.id, "cooked", -used, recipeId));
  }

  return {
    ...data,
    items: data.items.map((i) => items.get(i.id) ?? i),
    events: [...data.events, ...newEvents],
  };
}

export function updatePreferences(data: TrialData, patch: Partial<Preferences>): TrialData {
  return { ...data, preferences: { ...data.preferences, ...patch } };
}

export function activeItems(data: TrialData): FridgeItem[] {
  return data.items.filter((i) => i.status === "active");
}
