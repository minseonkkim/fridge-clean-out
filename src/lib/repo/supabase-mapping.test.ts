import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/lib/domain/fridge";
import {
  CompartmentMap,
  itemFromRow,
  preferencesFromRow,
  rowFromNewItem,
  rowFromPatch,
  rowFromPreferences,
  type FridgeItemRow,
} from "./supabase-mapping";

const compartments = new CompartmentMap([
  { id: "c-veg", slot: "veg_drawer" },
  { id: "c-pantry", slot: "pantry" },
]);

const row: FridgeItemRow = {
  id: "item-1",
  fridge_id: "f-1",
  ingredient_id: "onion",
  custom_name: null,
  compartment_id: "c-pantry",
  storage: "room",
  quantity: "2.50",
  unit: "ea",
  purchased_at: "2026-10-15",
  expires_at: "2026-11-14",
  expires_manual: false,
  memo: null,
  status: "active",
  closed_at: null,
  created_at: "2026-10-15T00:00:00Z",
  updated_at: "2026-10-15T00:00:00Z",
};

describe("Supabase 행 변환", () => {
  it("DB 행을 앱 재료로 바꾸고 칸 id를 slot으로, numeric 문자열을 숫자로 바꾼다", () => {
    expect(itemFromRow(row, compartments)).toMatchObject({
      id: "item-1",
      ingredientId: "onion",
      slot: "pantry",
      quantity: 2.5,
      expiresAt: "2026-11-14",
    });
  });

  it("모르는 칸 id는 slot 없음으로 둔다", () => {
    expect(itemFromRow({ ...row, compartment_id: "c-unknown" }, compartments).slot).toBeNull();
  });

  it("새 재료를 DB 행으로 바꾸고 slot을 칸 id로 바꾼다", () => {
    expect(
      rowFromNewItem(
        {
          ingredientId: null,
          customName: "  할머니 반찬 ",
          slot: "veg_drawer",
          storage: "fridge",
          quantity: 1,
          unit: "pack",
          purchasedAt: "2026-10-15",
          expiresAt: "2026-10-22",
        },
        "f-1",
        compartments,
      ),
    ).toEqual({
      fridge_id: "f-1",
      ingredient_id: null,
      custom_name: "할머니 반찬",
      compartment_id: "c-veg",
      storage: "fridge",
      quantity: 1,
      unit: "pack",
      purchased_at: "2026-10-15",
      expires_at: "2026-10-22",
      expires_manual: false,
      memo: null,
    });
  });

  it("수정 내용은 바뀐 필드만 담는다", () => {
    expect(rowFromPatch({ quantity: 1 }, compartments)).toEqual({ quantity: 1 });
    expect(rowFromPatch({ slot: "pantry", storage: "room" }, compartments)).toEqual({
      compartment_id: "c-pantry",
      storage: "room",
    });
    expect(rowFromPatch({ slot: null }, compartments)).toEqual({ compartment_id: null });
  });

  it("설정 행이 없으면 기본값, 있으면 양방향으로 같은 값이다", () => {
    expect(preferencesFromRow(null)).toEqual(DEFAULT_PREFERENCES);
    const prefs = {
      ...DEFAULT_PREFERENCES,
      mealsPerDay: 1,
      tools: ["oven"],
      disabledPantry: ["gochujang"],
      onboardedAt: "2026-10-15T00:00:00Z",
    };
    expect(preferencesFromRow(rowFromPreferences("u-1", prefs))).toEqual(prefs);
  });
});
