"use client";

import Link from "next/link";
import { Chip, toggle } from "@/components/chip";
import { Segmented } from "@/components/segmented";
import { INGREDIENT_BY_ID, INGREDIENTS } from "@/data/ingredients";
import type { Preferences } from "@/lib/domain/fridge";
import { TOOL_LABEL, type Tool } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";

const TOOLS: Tool[] = ["microwave", "air_fryer", "oven"];
const STAPLES = INGREDIENTS.filter((i) => i.isPantryStaple);
const nameOf = (id: string) => INGREDIENT_BY_ID.get(id)?.name ?? id;

/** 마이: 식습관 설정과 기본 양념 켜고 끄기 (기획서 4장, 5.1절). 바꾸면 바로 저장한다. */
export function PreferencesSection() {
  const { snapshot, savePreferences } = useFridge();
  if (!snapshot) return <p className="text-neutral-500">불러오는 중…</p>;
  const prefs = snapshot.preferences;
  const save = (patch: Partial<Preferences>) => void savePreferences(patch);

  return (
    <>
      <section aria-labelledby="diet-heading" className="flex flex-col gap-4">
        <h2 id="diet-heading" className="font-semibold text-neutral-500">
          식습관
        </h2>

        <div className="flex items-center justify-between">
          <span>함께 먹는 사람</span>
          <div className="flex items-center gap-3" role="group" aria-label="가구 인원">
            <button
              type="button"
              aria-label="인원 줄이기"
              disabled={prefs.householdSize <= 1}
              onClick={() => save({ householdSize: prefs.householdSize - 1 })}
              className="grid size-11 place-items-center rounded-full bg-neutral-100 text-xl disabled:opacity-40 dark:bg-neutral-800"
            >
              −
            </button>
            <output className="min-w-10 text-center font-semibold">{prefs.householdSize}명</output>
            <button
              type="button"
              aria-label="인원 늘리기"
              disabled={prefs.householdSize >= 6}
              onClick={() => save({ householdSize: prefs.householdSize + 1 })}
              className="grid size-11 place-items-center rounded-full bg-neutral-100 text-xl disabled:opacity-40 dark:bg-neutral-800"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span>집에서 요리하는 끼니 (하루)</span>
          <Segmented
            label="하루 끼니"
            value={String(prefs.mealsPerDay) as "1" | "2" | "3"}
            options={[
              { value: "1", label: "1끼" },
              { value: "2", label: "2끼" },
              { value: "3", label: "3끼" },
            ]}
            onChange={(v) => save({ mealsPerDay: Number(v) })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span>가진 조리도구</span>
          <div className="flex flex-wrap gap-2">
            {TOOLS.map((t) => (
              <Chip
                key={t}
                selected={prefs.tools.includes(t)}
                onClick={() => save({ tools: toggle(prefs.tools, t) })}
              >
                {TOOL_LABEL[t]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span>못 먹는 재료</span>
          {prefs.excludedIngredientIds.length === 0 ? (
            <p className="text-sm text-neutral-500">없어요.</p>
          ) : (
            <ul aria-label="못 먹는 재료" className="flex flex-wrap gap-2">
              {prefs.excludedIngredientIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    aria-label={`${nameOf(id)} 다시 먹기`}
                    onClick={() =>
                      save({
                        excludedIngredientIds: prefs.excludedIngredientIds.filter((x) => x !== id),
                      })
                    }
                    className="min-h-11 rounded-full bg-neutral-100 px-4 text-sm dark:bg-neutral-800"
                  >
                    {nameOf(id)} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/onboarding"
            className="min-h-11 content-center self-start text-sm text-emerald-700 underline underline-offset-4"
          >
            처음 설정 다시 하기
          </Link>
        </div>
      </section>

      <section aria-labelledby="pantry-heading" className="flex flex-col gap-2">
        <h2 id="pantry-heading" className="font-semibold text-neutral-500">
          기본 양념
        </h2>
        <p className="text-sm text-neutral-500">
          켜 둔 양념은 늘 있다고 보고 추천해요. 없는 양념은 꺼 주세요.
        </p>
        <div className="flex flex-wrap gap-2">
          {STAPLES.map((s) => {
            const on = !prefs.disabledPantry.includes(s.id);
            return (
              <Chip
                key={s.id}
                selected={on}
                label={`${s.name} ${on ? "있음" : "없음"}`}
                onClick={() => save({ disabledPantry: toggle(prefs.disabledPantry, s.id) })}
              >
                {s.name}
              </Chip>
            );
          })}
        </div>
      </section>
    </>
  );
}
