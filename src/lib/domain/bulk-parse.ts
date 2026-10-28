import { calcExpiry } from "./expiry";
import type { IsoDate, NewItemInput } from "./fridge";
import { defaultSlot } from "./placement";
import type { IngredientIndex } from "./search";
import type { Ingredient, Unit } from "./types";

/**
 * 여러 재료 한 번에 등록 (기획서 F1-2): "양파 3, 두부 1, 계란 10"
 * - 쉼표·줄바꿈·가운뎃점으로 나눈다.
 * - 수량 뒤 단위(g, kg, ml, L, 개, 팩, 단, 모, 봉, 병)를 알아듣고 재료 기본 단위로 바꾼다.
 * - 모르는 단위가 붙은 g·ml 재료는 개수로 받는다 ("간장 1병"이 1ml가 되지 않게).
 * - 수량이 없으면 1, 사전에 없는 이름은 사전 외 재료로 둔다.
 */

export interface BulkEntry {
  raw: string;
  name: string;
  ingredient: Ingredient | null;
  quantity: number;
  unit: Unit;
}

const UNIT_WORDS: Record<string, { unit: Unit; factor: number }> = {
  g: { unit: "g", factor: 1 },
  그램: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  킬로: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  l: { unit: "ml", factor: 1000 },
  리터: { unit: "ml", factor: 1000 },
  개: { unit: "ea", factor: 1 },
  알: { unit: "ea", factor: 1 },
  마리: { unit: "ea", factor: 1 },
  통: { unit: "ea", factor: 1 },
  팩: { unit: "pack", factor: 1 },
  봉: { unit: "pack", factor: 1 },
  봉지: { unit: "pack", factor: 1 },
  모: { unit: "pack", factor: 1 },
  캔: { unit: "ea", factor: 1 },
  병: { unit: "ea", factor: 1 },
  단: { unit: "bunch", factor: 1 },
};

// "양파 3", "양파3개", "돼지고기 600g", "우유 1.5L", "두부"
const ENTRY_PATTERN = /^(.*?)\s*(\d+(?:\.\d+)?)?\s*([a-zA-Z가-힣]*)$/;

export function splitBulk(text: string): string[] {
  return text
    .split(/[,，\n·;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseOne(raw: string, index: IngredientIndex): BulkEntry {
  const match = ENTRY_PATTERN.exec(raw);
  let name = raw;
  let amount = 1;
  let unitWord = "";
  if (match && match[2]) {
    name = match[1].trim();
    amount = Number(match[2]);
    unitWord = match[3].toLowerCase();
  }
  // 숫자 없이 "깻잎 한 팩"처럼 쓴 경우는 이름 전체를 이름으로 본다.
  if (!name) name = raw;

  const ingredient = index.exact(name) ?? null;
  const said = UNIT_WORDS[unitWord];
  const base: Unit = ingredient?.defaultUnit ?? said?.unit ?? "ea";

  // 수량 없이 g·ml 재료를 쓰면 1g이 되지 않도록 1회 사용량을 기본값으로 쓴다.
  const amountGiven = Boolean(match?.[2]);
  let quantity =
    !amountGiven && ingredient && (base === "g" || base === "ml")
      ? ingredient.usePerRecipe
      : amount;
  let unit: Unit = base;
  // 모르는 단위(예: 참기름 2줄)를 g·ml 재료에 붙였으면 1ml·1g이 아니라 그 묶음 개수로 본다.
  const unknownWord = amountGiven && unitWord !== "" && !said;
  if (unknownWord && ingredient && (base === "g" || base === "ml")) {
    quantity = amount;
    unit = "ea";
  }
  if (said) {
    if (said.unit === base) {
      quantity = amount * said.factor;
    } else if (ingredient) {
      // 기본 단위와 맞지 않는 단위(예: 계란 1팩)는 말한 단위를 그대로 쓴다.
      quantity = amount * said.factor;
      unit = said.unit;
    }
  }
  return { raw, name, ingredient, quantity, unit };
}

export function parseBulk(text: string, index: IngredientIndex): BulkEntry[] {
  return splitBulk(text).map((raw) => parseOne(raw, index));
}

/** 파싱 결과를 오늘 산 재료로 등록할 입력으로 바꾼다 (기본 보관 방식·권장 기한). */
export function bulkToInputs(entries: BulkEntry[], today: IsoDate): NewItemInput[] {
  return entries.map((e) => {
    const storage = e.ingredient?.defaultStorage ?? "fridge";
    return {
      ingredientId: e.ingredient?.id ?? null,
      customName: e.ingredient ? null : e.name,
      slot: defaultSlot(e.ingredient?.category ?? null, storage, e.ingredient?.id),
      storage,
      quantity: e.quantity,
      unit: e.unit,
      purchasedAt: today,
      expiresAt: calcExpiry(e.ingredient, storage, today).expiresAt,
    };
  });
}
