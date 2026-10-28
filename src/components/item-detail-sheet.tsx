"use client";

import { useId, useState } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { dDayLabel, daysLeft, todayIso } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem, type ItemPatch } from "@/lib/domain/fridge";
import { SLOT_LABEL, slotOf } from "@/lib/domain/fridge-view";
import { diffPatch, stepQuantity, storageChangePatch } from "@/lib/domain/item-edit";
import { fillReference } from "@/lib/domain/quantity-visual";
import { STORAGE_LABEL, STORAGES, UNIT_LABEL, type Storage } from "@/lib/domain/types";
import { josa } from "@/lib/korean";
import { useFridge } from "@/lib/repo/fridge-context";
import { BottomSheet } from "./bottom-sheet";
import { Segmented } from "./segmented";
import { QuantityGlyph } from "./fridge/quantity-glyph";
import { Stepper } from "./stepper";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const STORAGE_OPTIONS = STORAGES.map((s) => ({ value: s, label: STORAGE_LABEL[s] }));

/** 재료 상세 시트 (기획서 4장): D-day, 수량 스테퍼, 보관 방식 변경, 메모 */
export function ItemDetailSheet({
  item,
  onClose,
  onClosed,
}: {
  item: FridgeItem;
  onClose: () => void;
  /** 다 씀·버림으로 냉장고에서 뺐을 때 알림 문구 */
  onClosed?: (message: string) => void;
}) {
  const { updateItem, closeItem } = useFridge();
  const ingredient = item.ingredientId ? lookup(item.ingredientId) : undefined;
  const today = todayIso();
  const ids = { memo: useId(), exp: useId() };

  const [quantity, setQuantity] = useState(item.quantity);
  // 시트를 연 시점의 양을 기준으로 채움을 그려, 줄이면 줄어드는 게 바로 보이게 한다.
  const [glyphReference] = useState(() => fillReference(item.quantity, ingredient?.usePerRecipe));
  const [storage, setStorage] = useState<Storage>(item.storage);
  const [memo, setMemo] = useState(item.memo ?? "");
  const [manualExpiry, setManualExpiry] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storagePatch = storageChangePatch(item, storage, ingredient, today);
  const expiresAt = manualExpiry ?? storagePatch.expiresAt ?? item.expiresAt;
  const slot = storagePatch.slot ?? slotOf(item, lookup);
  const left = daysLeft(expiresAt, today);

  const draft: ItemPatch = {
    ...storagePatch,
    quantity,
    memo: memo.trim() || null,
    expiresAt,
    ...(manualExpiry ? { expiresManual: true } : {}),
  };
  const patch = diffPatch(item, draft);
  const dirty = Object.keys(patch).length > 0;

  async function finish(status: "used_up" | "discarded") {
    setSaving(true);
    setError(null);
    try {
      await closeItem(item.id, status);
      const name = itemDisplayName(item, lookup);
      onClosed?.(
        status === "used_up"
          ? `${josa(name, "을", "를")} 다 썼어요.`
          : `${josa(name, "을", "를")} 버렸어요.`,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function save() {
    if (!dirty) return onClose();
    setSaving(true);
    setError(null);
    try {
      await updateItem(item.id, patch);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={itemDisplayName(item, lookup)}
      footer={
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
        >
          {saving ? "저장 중…" : dirty ? "저장" : "닫기"}
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <p className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{dDayLabel(left)}</span>
          <span className="text-sm text-neutral-500">
            {expiresAt}까지 · {SLOT_LABEL[slot]}
          </span>
        </p>

        <div className="flex flex-col items-center gap-2">
          <span data-testid="quantity-glyph" className="flex min-h-14 items-end">
            <QuantityGlyph
              quantity={quantity}
              unit={item.unit}
              reference={glyphReference}
              category={ingredient?.category ?? null}
              size="lg"
            />
          </span>
          <Stepper
            label="수량"
            value={`${quantity}${UNIT_LABEL[item.unit]}`}
            onDecrement={() => setQuantity((q) => stepQuantity(item.unit, q, -1))}
            onIncrement={() => setQuantity((q) => stepQuantity(item.unit, q, 1))}
          />
          {quantity === 0 && (
            <p className="text-sm text-amber-700">
              수량이 0이에요. 다 썼다면 &lsquo;다 씀&rsquo;으로 정리해 주세요.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">보관 방식</span>
          <Segmented
            label="보관 방식"
            value={storage}
            options={STORAGE_OPTIONS}
            onChange={setStorage}
          />
          {storage !== item.storage && (
            <p role="status" className="text-sm text-sky-700 dark:text-sky-300">
              {item.expiresManual
                ? "직접 정한 기한은 그대로 둬요."
                : `${STORAGE_LABEL[storage]} 보관 기준으로 기한이 ${expiresAt}(${dDayLabel(left)})로 바뀌어요.`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.exp} className="text-sm font-semibold">
            기한
          </label>
          <input
            id={ids.exp}
            type="date"
            value={expiresAt}
            onChange={(e) => e.target.value && setManualExpiry(e.target.value)}
            className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.memo} className="text-sm font-semibold">
            메모
          </label>
          <textarea
            id={ids.memo}
            rows={2}
            value={memo}
            placeholder="예: 반 남음, 국 끓일 때 쓰기"
            onChange={(e) => setMemo(e.target.value)}
            className="rounded-xl border border-neutral-300 p-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => finish("used_up")}
            className="min-h-12 rounded-xl bg-emerald-50 font-semibold text-emerald-800 disabled:opacity-50 dark:bg-emerald-950 dark:text-emerald-200"
          >
            🍽 다 씀
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => finish("discarded")}
            className="min-h-12 rounded-xl bg-neutral-100 font-semibold text-neutral-700 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300"
          >
            🗑 버림
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}
