"use client";

import { useState } from "react";
import { UNIT_LABEL, type RecipeIngredient } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";

/** 레시피에 없는 필수 재료를 장보기 목록에 담는다 (기획서 3.4절: 부족한 재료는 누르면 장보기 목록에 추가). */
export function AddMissingButton({
  recipeId,
  missing,
}: {
  recipeId: string;
  missing: (RecipeIngredient & { name: string })[];
}) {
  const { addShopping } = useFridge();
  const [message, setMessage] = useState<string | null>(null);
  if (missing.length === 0) return null;

  async function add() {
    const added = await addShopping(
      missing.map((m) => ({
        ingredientId: m.ingredientId,
        name: m.name,
        quantity: m.amount,
        unit: m.unit,
        fromRecipeId: recipeId,
      })),
    );
    setMessage(added > 0 ? `장보기 목록에 ${added}개 담았어요.` : "이미 장보기 목록에 있어요.");
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={add}
        className="min-h-11 self-start rounded-full px-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-600 dark:text-emerald-300"
      >
        부족한 재료 장보기에 담기 (
        {missing.map((m) => `${m.name} ${m.amount}${UNIT_LABEL[m.unit]}`).join(", ")})
      </button>
      {message && (
        <p
          role="status"
          aria-label="장보기 담기 결과"
          className="text-sm text-emerald-700 dark:text-emerald-400"
        >
          {message}
        </p>
      )}
    </div>
  );
}
