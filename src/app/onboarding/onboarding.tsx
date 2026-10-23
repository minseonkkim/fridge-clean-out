"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Segmented } from "@/components/segmented";
import { INGREDIENT_BY_ID, INGREDIENTS } from "@/data/ingredients";
import { bulkToInputs } from "@/lib/domain/bulk-parse";
import { todayIso } from "@/lib/domain/expiry";
import { buildIngredientIndex } from "@/lib/domain/search";
import { TOOL_LABEL, type Tool } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";

const index = buildIngredientIndex(INGREDIENTS);
const nameOf = (id: string) => INGREDIENT_BY_ID.get(id)?.name ?? id;

/** 자주 못 먹는 재료 (알레르기·기피) 빠른 선택 */
const COMMON_EXCLUDES = ["egg", "milk", "shrimp", "pork", "beef", "nuts", "cilantro", "oyster"];
/** 1인 가구가 자주 사는 재료 */
const COMMON_BUYS = [
  "onion",
  "green_onion",
  "egg",
  "tofu",
  "kimchi",
  "pork",
  "milk",
  "potato",
  "carrot",
  "bean_sprouts",
  "ramen",
  "instant_rice",
];
const TOOLS: Tool[] = ["microwave", "air_fryer", "oven"];
const STEPS = ["식사", "못 먹는 재료", "조리도구", "자주 사는 재료"] as const;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ${
        selected
          ? "bg-emerald-600 text-white ring-emerald-600"
          : "bg-white text-neutral-700 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * 온보딩 (기획서 4장): 가구 인원, 하루 요리 끼니, 못 먹는 재료, 가진 조리도구,
 * 자주 사는 재료 빠른 등록. 언제든 건너뛸 수 있다.
 */
export function Onboarding() {
  const router = useRouter();
  const { snapshot, savePreferences, addItems } = useFridge();
  const [step, setStep] = useState(0);
  const [household, setHousehold] = useState(1);
  const [meals, setMeals] = useState<"1" | "2" | "3">("2");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [buys, setBuys] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hits = useMemo(() => index.search(query, 5), [query]);

  async function finish(skip = false) {
    setSaving(true);
    setError(null);
    try {
      await savePreferences(
        skip
          ? { onboardedAt: new Date().toISOString() }
          : {
              householdSize: household,
              mealsPerDay: Number(meals),
              excludedIngredientIds: excluded,
              tools,
              onboardedAt: new Date().toISOString(),
            },
      );
      if (!skip && buys.length > 0) {
        const entries = buys.map((id) => {
          const ingredient = INGREDIENT_BY_ID.get(id)!;
          const quantity =
            ingredient.defaultUnit === "g" || ingredient.defaultUnit === "ml"
              ? ingredient.usePerRecipe
              : Math.max(1, Math.ceil(ingredient.usePerRecipe));
          return {
            raw: ingredient.name,
            name: ingredient.name,
            ingredient,
            quantity,
            unit: ingredient.defaultUnit,
          };
        });
        await addItems(bulkToInputs(entries, todayIso()));
      }
      router.replace("/fridge");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  if (!snapshot) {
    return <p className="p-6 text-neutral-500">불러오는 중…</p>;
  }

  const last = step === STEPS.length - 1;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-6 pt-8 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <header className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {step + 1} / {STEPS.length} · {STEPS[step]}
        </p>
        <button
          type="button"
          onClick={() => finish(true)}
          disabled={saving}
          className="min-h-11 px-2 text-sm text-neutral-500 underline underline-offset-4"
        >
          건너뛰기
        </button>
      </header>

      <section className="flex flex-1 flex-col gap-5">
        {step === 0 && (
          <>
            <h1 className="text-2xl font-bold">식사를 알려 주세요</h1>
            <div className="flex flex-col gap-2">
              <span className="font-semibold">함께 먹는 사람</span>
              <div className="flex items-center gap-4" role="group" aria-label="가구 인원">
                <button
                  type="button"
                  aria-label="인원 줄이기"
                  disabled={household <= 1}
                  onClick={() => setHousehold((h) => h - 1)}
                  className="grid size-12 place-items-center rounded-full bg-neutral-100 text-2xl disabled:opacity-40 dark:bg-neutral-800"
                >
                  −
                </button>
                <output className="min-w-16 text-center text-2xl font-bold">{household}명</output>
                <button
                  type="button"
                  aria-label="인원 늘리기"
                  disabled={household >= 6}
                  onClick={() => setHousehold((h) => h + 1)}
                  className="grid size-12 place-items-center rounded-full bg-neutral-100 text-2xl disabled:opacity-40 dark:bg-neutral-800"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold">집에서 요리하는 끼니 (하루)</span>
              <Segmented
                label="하루 끼니"
                value={meals}
                options={[
                  { value: "1", label: "1끼" },
                  { value: "2", label: "2끼" },
                  { value: "3", label: "3끼" },
                ]}
                onChange={setMeals}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold">못 먹는 재료가 있나요?</h1>
            <p className="text-sm text-neutral-500">고른 재료가 들어간 요리는 추천하지 않아요.</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...COMMON_EXCLUDES, ...excluded])].map((id) => (
                <Chip
                  key={id}
                  selected={excluded.includes(id)}
                  onClick={() => setExcluded((l) => toggle(l, id))}
                >
                  {nameOf(id)}
                </Chip>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">다른 재료 찾기</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 오이, ㄱㅈ"
                className="min-h-12 rounded-xl border border-neutral-300 px-3 text-base dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            {hits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hits.map(({ ingredient }) => (
                  <Chip
                    key={ingredient.id}
                    selected={excluded.includes(ingredient.id)}
                    onClick={() => {
                      setExcluded((l) => toggle(l, ingredient.id));
                      setQuery("");
                    }}
                  >
                    + {ingredient.name}
                  </Chip>
                ))}
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold">가진 조리도구를 골라 주세요</h1>
            <p className="text-sm text-neutral-500">가스레인지·냄비·프라이팬은 있다고 볼게요.</p>
            <div className="flex flex-wrap gap-2">
              {TOOLS.map((t) => (
                <Chip
                  key={t}
                  selected={tools.includes(t)}
                  onClick={() => setTools((l) => toggle(l, t))}
                >
                  {TOOL_LABEL[t]}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold">지금 냉장고에 있는 걸 골라 주세요</h1>
            <p className="text-sm text-neutral-500">
              자주 사는 재료예요. 오늘 산 것으로 넣고, 나중에 고칠 수 있어요.
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_BUYS.map((id) => (
                <Chip
                  key={id}
                  selected={buys.includes(id)}
                  onClick={() => setBuys((l) => toggle(l, id))}
                >
                  {nameOf(id)}
                </Chip>
              ))}
            </div>
          </>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="min-h-12 rounded-xl px-5 font-semibold ring-1 ring-neutral-300"
          >
            이전
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => (last ? finish() : setStep((s) => s + 1))}
          className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
        >
          {saving
            ? "저장 중…"
            : last
              ? buys.length > 0
                ? `${buys.length}개 넣고 시작`
                : "시작하기"
              : "다음"}
        </button>
      </footer>
    </main>
  );
}
