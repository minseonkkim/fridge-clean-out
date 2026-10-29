"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { ACTION_LABEL, classifyStep, stepIngredients } from "@/lib/cooking/step-action";
import type { Recipe } from "@/lib/domain/types";
import { ambientMotion, renderDpr } from "@/components/fridge3d/layout";
import { CookingScene } from "./stage-world";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * 조리 과정 3D (결정 D1 개정). 지금 단계의 동작(썰기·볶기·끓이기…)을 그 레시피의 재료로 보여 준다.
 * 이전·다음 단계로 넘길 수 있고, 아래 단계 목록에서 번호를 눌러도 이 장면이 바뀐다.
 */
export default function RecipeStage3D({
  recipe,
  step,
  onStep,
}: {
  recipe: Recipe;
  step: number;
  onStep: (step: number) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const play = ambientMotion(reduced);
  const total = recipe.steps.length;
  const text = recipe.steps[step]?.text ?? "";
  const action = classifyStep(text);
  const ids = useMemo(() => stepIngredients(recipe, text, lookup), [recipe, text]);
  const names = ids.map((id) => lookup(id)?.name).filter(Boolean);

  return (
    <section
      aria-label="조리 과정 3D"
      data-cooking-stage
      data-action={action}
      className="overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 shadow-sm ring-1 ring-amber-200 dark:from-neutral-900 dark:to-neutral-950 dark:ring-neutral-800"
    >
      <div className="relative h-64">
        <Canvas
          flat
          frameloop={play ? "always" : "demand"}
          resize={{ scroll: false }}
          dpr={renderDpr()}
          camera={{ fov: 38, position: [0, 2.5, 3.3], near: 0.1, far: 40 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.4, 0)}
          gl={{ antialias: true, powerPreference: "low-power" }}
          aria-hidden
        >
          <color attach="background" args={["#f6efe4"]} />
          <CookingScene key={`${step}-${action}`} action={action} ids={ids} play={play} />
        </Canvas>
        <p className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-amber-900 shadow dark:bg-neutral-900/90 dark:text-amber-200">
          {step + 1}/{total} · {ACTION_LABEL[action]}
        </p>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p aria-live="polite" className="text-base">
          {text}
        </p>
        {names.length > 0 && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            이 단계 재료: {names.join(", ")}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onStep(step - 1)}
            disabled={step === 0}
            className="min-h-11 flex-1 rounded-xl font-semibold ring-1 ring-amber-400 disabled:opacity-40"
          >
            이전 단계
          </button>
          <button
            type="button"
            onClick={() => onStep(step + 1)}
            disabled={step === total - 1}
            className="min-h-11 flex-1 rounded-xl bg-amber-700 font-semibold text-white disabled:opacity-40"
          >
            다음 단계
          </button>
        </div>
      </div>
    </section>
  );
}
