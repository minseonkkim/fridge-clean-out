"use client";

import { useState } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { todayIso } from "@/lib/domain/expiry";
import { UNIT_LABEL } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";
import { shoppingToFridgeInputs } from "@/lib/shopping/to-fridge";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

/** 내 장보기 목록: 체크하며 장을 보고, 필요 없는 항목은 뺀다. */
export function ShoppingList({ onMoved }: { onMoved?: (message: string) => void }) {
  const { snapshot, setShoppingChecked, removeShopping, addItems } = useFridge();
  const [moving, setMoving] = useState(false);
  const shopping = snapshot?.shopping ?? [];
  const checked = shopping.filter((s) => s.checked);

  /** 체크한(산) 항목을 냉장고에 넣고 목록에서 뺀다. */
  async function moveToFridge() {
    setMoving(true);
    try {
      await addItems(shoppingToFridgeInputs(checked, lookup, todayIso()));
      await removeShopping(checked.map((s) => s.id));
      onMoved?.(`${checked.length}개를 냉장고에 넣었어요. 기한은 오늘 기준 권장값이에요.`);
    } finally {
      setMoving(false);
    }
  }

  return (
    <section aria-labelledby="list-heading" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h2 id="list-heading" className="font-semibold">
          내 장보기 목록{" "}
          <span className="font-normal text-neutral-500">
            {checked.length}/{shopping.length}
          </span>
        </h2>
      </div>
      {/* 자주 누르는 버튼이라 엄지가 닿는 화면 아래에 띄운다 */}
      {checked.length > 0 && (
        <>
          <button
            type="button"
            onClick={moveToFridge}
            disabled={moving}
            className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 mx-auto min-h-14 max-w-md rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-lg disabled:opacity-50"
          >
            {moving ? "넣는 중…" : `체크한 ${checked.length}개 냉장고에 넣기`}
          </button>
        </>
      )}
      {shopping.length === 0 ? (
        <p className="text-sm text-neutral-500">위 추천에서 담거나, 필요한 재료를 담아 두세요.</p>
      ) : (
        <ul
          aria-label="장보기 목록"
          className="divide-y divide-neutral-100 dark:divide-neutral-800"
        >
          {shopping.map((s) => (
            <li key={s.id} className="flex min-h-12 items-center gap-3">
              <label className="flex flex-1 cursor-pointer items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={(e) => void setShoppingChecked(s.id, e.target.checked)}
                  className="size-5 accent-emerald-600"
                />
                <span className={s.checked ? "text-neutral-400 line-through" : ""}>
                  {s.name}
                  {s.quantity !== null && s.unit && (
                    <span className="ml-1 text-sm text-neutral-500">
                      {s.quantity}
                      {UNIT_LABEL[s.unit]}
                    </span>
                  )}
                  {s.fromRecipeId && (
                    <span className="ml-2 text-xs text-neutral-400">
                      {RECIPE_BY_ID.get(s.fromRecipeId)?.name}용
                    </span>
                  )}
                </span>
              </label>
              <button
                type="button"
                aria-label={`${s.name} 목록에서 빼기`}
                onClick={() => void removeShopping([s.id])}
                className="grid size-11 place-items-center text-xl text-neutral-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* 아래에 뜬 버튼이 목록 끝을 가리지 않게 */}
      {checked.length > 0 && <div aria-hidden className="h-16" />}
    </section>
  );
}
