"use client";

import { RECIPE_BY_ID } from "@/data/recipes";
import { UNIT_LABEL } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";

/** 내 장보기 목록: 체크하며 장을 보고, 필요 없는 항목은 뺀다. */
export function ShoppingList() {
  const { snapshot, setShoppingChecked, removeShopping } = useFridge();
  const shopping = snapshot?.shopping ?? [];
  const checked = shopping.filter((s) => s.checked);

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
    </section>
  );
}
