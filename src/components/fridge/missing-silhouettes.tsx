"use client";

import { useState } from "react";
import { IngredientIcon } from "@/components/ingredient-icon";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { type FridgeItem } from "@/lib/domain/fridge";
import { recipeAvailability } from "@/lib/domain/recipe-view";
import { UNIT_LABEL, type Recipe } from "@/lib/domain/types";
import { josa } from "@/lib/korean";
import { lookupWithPantry } from "@/lib/planner/preferences";
import { useFridge } from "@/lib/repo/fridge-context";

const baseLookup = (id: string) => INGREDIENT_BY_ID.get(id);

/**
 * 강조한 요리에 모자란 필수 재료를 냉장고 바깥에 점선 실루엣으로 보여 준다.
 * 누르면 장보기 목록에 담는다 (기획서 3.4절).
 */
export function MissingSilhouettes({
  recipe,
  items,
  disabledPantry,
  onMessage,
}: {
  recipe: Recipe;
  items: FridgeItem[];
  disabledPantry: string[];
  onMessage: (text: string) => void;
}) {
  const { addShopping } = useFridge();
  const [added, setAdded] = useState<ReadonlySet<string>>(new Set());
  const lookup = lookupWithPantry(baseLookup, disabledPantry);
  const missing = recipeAvailability(recipe, items, lookup)
    .groups.filter((g) => g.required && g.status === "missing")
    .map((g) => g.options[0]);
  if (missing.length === 0) return null;

  async function add(m: (typeof missing)[number]) {
    try {
      const count = await addShopping([
        {
          ingredientId: m.ingredientId,
          name: m.name,
          quantity: m.amount,
          unit: m.unit,
          fromRecipeId: recipe.id,
        },
      ]);
      setAdded((prev) => new Set(prev).add(m.ingredientId));
      onMessage(
        count > 0
          ? `${josa(m.name, "을", "를")} 장보기 목록에 담았어요.`
          : `${josa(m.name, "은", "는")} 이미 장보기 목록에 있어요.`,
      );
    } catch (e) {
      onMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <section aria-label="모자란 재료" className="flex flex-col gap-2">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        모자란 재료예요. 누르면 장보기 목록에 담아요.
      </p>
      <ul className="flex flex-wrap gap-2">
        {missing.map((m) => {
          const done = added.has(m.ingredientId);
          return (
            <li key={m.ingredientId}>
              <button
                type="button"
                onClick={() => add(m)}
                disabled={done}
                data-silhouette
                className="flex min-h-16 min-w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-400 px-2 py-1 text-xs text-neutral-500 disabled:border-emerald-500 disabled:text-emerald-700 dark:border-neutral-600 dark:text-neutral-400"
              >
                <IngredientIcon
                  ingredientId={m.ingredientId}
                  category={baseLookup(m.ingredientId)?.category}
                  className={`size-8 ${done ? "" : "opacity-30 grayscale"}`}
                />
                <span className="font-semibold">{m.name}</span>
                <span>{done ? "담았어요 ✓" : `${m.amount}${UNIT_LABEL[m.unit]}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
