"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef } from "react";
import type { IngredientCategory } from "@/lib/domain/types";

export interface PotIngredient {
  key: string;
  ingredientId: string | null;
  category: IngredientCategory | null;
}

/** 재료 하나가 떨어지는 시간, 재료 사이 간격, 다 넣은 뒤 끓는 시간 (ms) */
export const DROP_MS = 700;
export const STAGGER_MS = 260;
export const SIMMER_MS = 900;

const PotScene = dynamic(() => import("@/components/cooking3d/pot-scene"), { ssr: false });

/**
 * 요리 완료 (기획서 3.2절, 결정 D1 개정): 3D 냄비에 쓸 재료가 하나씩 떨어지고 김이 오른 뒤 차감한다.
 * 끝나는 때는 3D 그리기와 상관없이 시간으로 정한다 (느린 폰에서도 멈추지 않게).
 * 움직임 줄이기 설정이면 그리지 않고 바로 끝낸다.
 */
export function CookPot({
  ingredients,
  onDone,
}: {
  ingredients: PotIngredient[];
  onDone: () => void;
}) {
  const doneRef = useRef(onDone);
  useLayoutEffect(() => {
    doneRef.current = onDone;
  });

  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useLayoutEffect(() => {
    if (reduce) {
      doneRef.current();
      return;
    }
    const id = window.setTimeout(
      () => doneRef.current(),
      DROP_MS + (ingredients.length - 1) * STAGGER_MS + SIMMER_MS,
    );
    return () => window.clearTimeout(id);
  }, [ingredients, reduce]);

  if (reduce) return null;
  return (
    <div
      aria-hidden
      data-cook-pot
      className="pointer-events-none fixed inset-0 z-50 bg-[#f6efe4]/95 dark:bg-[#14161a]/95"
    >
      <PotScene ingredients={ingredients} />
      {/* 연출에 들어간 재료 (테스트·디버깅용 표시) */}
      <ul className="sr-only">
        {ingredients.map((ing) => (
          <li key={ing.key} data-pot-ingredient>
            {ing.ingredientId ?? ing.category ?? "재료"}
          </li>
        ))}
      </ul>
    </div>
  );
}
