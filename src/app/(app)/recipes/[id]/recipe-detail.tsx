"use client";

import Link from "next/link";
import { useState } from "react";
import { StepTimer } from "@/components/step-timer";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { dDayLabel, daysLeft, todayIso } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem } from "@/lib/domain/fridge";
import { recipeAvailability, type IngredientGroupView } from "@/lib/domain/recipe-view";
import { TOOL_LABEL, UNIT_LABEL } from "@/lib/domain/types";
import { lookupWithPantry } from "@/lib/planner/preferences";
import { useFridge } from "@/lib/repo/fridge-context";

const baseLookup = (id: string) => INGREDIENT_BY_ID.get(id);
const DIFFICULTY = ["", "쉬움", "보통", "어려움"];

export function RecipeDetail({ recipeId }: { recipeId: string }) {
  const recipe = RECIPE_BY_ID.get(recipeId)!;
  const { snapshot } = useFridge();
  const [servings, setServings] = useState(recipe.servings);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-4 pb-28">
      <Link href="/plan" className="min-h-11 self-start py-2 text-sm text-neutral-500">
        ← 식단으로
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{recipe.name}</h1>
        <p className="text-sm text-neutral-500">
          {recipe.minutes}분 · {DIFFICULTY[recipe.difficulty]}
          {recipe.tools.length > 0 &&
            ` · ${recipe.tools.map((t) => TOOL_LABEL[t]).join(", ")} 필요`}
        </p>
      </header>

      <section aria-labelledby="ingredients-heading" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="ingredients-heading" className="font-semibold">
            재료
          </h2>
          <ServingsControl value={servings} onChange={setServings} />
        </div>
        {/* 냉장고를 불러온 뒤에만 보유 여부를 계산한다 (오늘 날짜를 읽으므로 prerender 제외). */}
        {snapshot ? (
          <IngredientList
            items={snapshot.items}
            disabledPantry={snapshot.preferences.disabledPantry}
            recipeId={recipeId}
            servings={servings}
          />
        ) : (
          <p className="text-neutral-500">냉장고를 확인하는 중…</p>
        )}
      </section>

      <section aria-labelledby="steps-heading" className="flex flex-col gap-2">
        <h2 id="steps-heading" className="font-semibold">
          만드는 법 <span className="font-normal text-neutral-500">· 약 {recipe.minutes}분</span>
        </h2>
        <ol className="flex flex-col gap-3">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white"
              >
                {i + 1}
              </span>
              <div className="flex-1 pt-0.5">
                <p>{step.text}</p>
                {step.timerSec && <StepTimer seconds={step.timerSec} />}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function IngredientList({
  recipeId,
  items,
  disabledPantry,
  servings,
}: {
  recipeId: string;
  items: FridgeItem[];
  disabledPantry: string[];
  servings: number;
}) {
  const recipe = RECIPE_BY_ID.get(recipeId)!;
  const lookup = lookupWithPantry(baseLookup, disabledPantry);
  const availability = recipeAvailability(recipe, items, lookup, servings);
  const required = availability.groups.filter((g) => g.required);
  const optional = availability.groups.filter((g) => !g.required);

  return (
    <>
      <p
        role="status"
        aria-label="요리 가능 여부"
        className={`rounded-xl p-3 text-sm font-semibold ${
          availability.canCook
            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
            : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        }`}
      >
        {availability.canCook
          ? "지금 냉장고 재료로 만들 수 있어요"
          : `필수 재료 ${availability.missingRequired}가지가 없어요`}
      </p>
      <ul aria-label="필수 재료" className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {required.map((g) => (
          <GroupRow key={g.groupNo} group={g} />
        ))}
      </ul>
      {optional.length > 0 && (
        <>
          <h3 className="mt-2 text-sm font-semibold text-neutral-500">있으면 좋은 재료</h3>
          <ul
            aria-label="선택 재료"
            className="divide-y divide-neutral-100 dark:divide-neutral-800"
          >
            {optional.map((g) => (
              <GroupRow key={g.groupNo} group={g} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

const STATUS_MARK = {
  have: { icon: "✓", label: "있음", style: "text-emerald-700 dark:text-emerald-300" },
  staple: { icon: "·", label: "기본 양념", style: "text-neutral-400" },
  missing: { icon: "✕", label: "없음", style: "text-red-600 dark:text-red-400" },
} as const;

function GroupRow({ group }: { group: IngredientGroupView }) {
  const mark = STATUS_MARK[group.status];
  const today = todayIso();
  const amountText = (o: IngredientGroupView["options"][number]) =>
    `${o.name} ${o.amount}${UNIT_LABEL[o.unit]}`;

  return (
    <li className="flex min-h-12 items-start gap-3 py-2">
      <span aria-hidden className={`w-5 text-center font-bold ${mark.style}`}>
        {mark.icon}
      </span>
      <span className="flex flex-1 flex-col">
        <span>
          {group.options.map(amountText).join(" 또는 ")}
          <span className={`ml-2 text-xs ${mark.style}`}>{mark.label}</span>
          {group.short && <span className="ml-1 text-xs text-amber-700">(양이 조금 모자라요)</span>}
        </span>
        {group.items.length > 0 && (
          <span className="text-xs text-neutral-500">
            냉장고:{" "}
            {group.items
              .map(
                (i) =>
                  `${itemDisplayName(i, baseLookup)} ${i.quantity}${UNIT_LABEL[i.unit]} (${dDayLabel(daysLeft(i.expiresAt, today))})`,
              )
              .join(", ")}
          </span>
        )}
      </span>
    </li>
  );
}

const MAX_SERVINGS = 8;

/** 인분 조절 (기획서 F3-3). 바꾸면 재료 양과 보유 여부를 다시 계산한다. */
function ServingsControl({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div role="group" aria-label="인분" className="flex items-center gap-2">
      <button
        type="button"
        aria-label="인분 줄이기"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="grid size-11 place-items-center rounded-full bg-neutral-100 text-xl disabled:opacity-40 dark:bg-neutral-800"
      >
        −
      </button>
      <output aria-live="polite" className="min-w-12 text-center font-semibold tabular-nums">
        {value}인분
      </output>
      <button
        type="button"
        aria-label="인분 늘리기"
        disabled={value >= MAX_SERVINGS}
        onClick={() => onChange(value + 1)}
        className="grid size-11 place-items-center rounded-full bg-neutral-100 text-xl disabled:opacity-40 dark:bg-neutral-800"
      >
        +
      </button>
    </div>
  );
}
