"use client";

import Link from "next/link";
import { useToast } from "@/components/toast";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { todayIso } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem, type NewShoppingInput } from "@/lib/domain/fridge";
import { UNIT_LABEL } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";
import type { MissingGroup } from "@/lib/shopping/suggest";
import { useShoppingSuggestions } from "@/lib/shopping/use-shopping";
import { ShoppingList } from "./shopping-list";
import { SimulationCard } from "./simulation-card";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const nameOf = (id: string) => lookup(id)?.name ?? id;

function toInput(m: MissingGroup, fromRecipeId: string | null): NewShoppingInput {
  const ingredient = lookup(m.ingredientId);
  return {
    ingredientId: m.ingredientId,
    name: nameOf(m.ingredientId),
    quantity: m.amount,
    unit: ingredient?.defaultUnit ?? null,
    fromRecipeId,
  };
}

export function ShoppingScreen() {
  const { snapshot, status, error } = useFridge();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-6 pb-28">
      <h1 className="text-xl font-bold">장보기</h1>
      {status === "loading" && !snapshot && <p className="text-neutral-500">계산하는 중…</p>}
      {status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {/* snapshot은 브라우저에서만 채워지므로 오늘 날짜를 읽는 계산은 prerender되지 않는다. */}
      {snapshot && <ShoppingBody items={snapshot.items} />}
    </main>
  );
}

function ShoppingBody({ items }: { items: FridgeItem[] }) {
  const { snapshot, addShopping } = useFridge();
  const { show, toast } = useToast();
  const result = useShoppingSuggestions(items, snapshot!.preferences, todayIso());
  if (!result) return null;
  const { suggestions, buyOne } = result;
  const byId = new Map(items.map((i) => [i.id, i]));

  async function add(inputs: NewShoppingInput[]) {
    const added = await addShopping(inputs);
    show(added > 0 ? `장보기 목록에 ${added}개 담았어요.` : "이미 목록에 있어요.");
  }

  return (
    <>
      <section aria-labelledby="buy-one-heading" className="flex flex-col gap-2">
        <h2 id="buy-one-heading" className="font-semibold">
          딱 하나만 산다면
        </h2>
        {buyOne.length === 0 ? (
          <p className="text-sm text-neutral-500">
            하나만 사서 새로 만들 수 있는 요리가 없어요. 냉장고에 재료를 더 넣어 보세요.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {buyOne.slice(0, 5).map((option, rank) => (
              <li
                key={option.ingredientId}
                className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <span className="text-lg font-bold text-emerald-700">{rank + 1}</span>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="font-semibold">{nameOf(option.ingredientId)}</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {option.recipes.map((r) => r.recipe.name).join(", ")} 가능
                  </p>
                  {option.savesItemIds.length > 0 && (
                    <p className="text-sm text-red-700 dark:text-red-300">
                      버려질{" "}
                      {option.savesItemIds
                        .map((id) => itemDisplayName(byId.get(id)!, lookup))
                        .join(", ")}
                      을(를) 살려요
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`${nameOf(option.ingredientId)} 장보기에 담기`}
                  onClick={() =>
                    add([
                      {
                        ingredientId: option.ingredientId,
                        name: nameOf(option.ingredientId),
                        unit: lookup(option.ingredientId)?.defaultUnit ?? null,
                      },
                    ])
                  }
                  className="min-h-11 shrink-0 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white"
                >
                  담기
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {suggestions.length > 0 && (
        <section aria-labelledby="few-heading" className="flex flex-col gap-2">
          <h2 id="few-heading" className="font-semibold">
            조금만 사면 되는 요리
          </h2>
          <ul className="flex flex-col gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <li key={s.recipe.id} className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/recipes/${s.recipe.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {s.recipe.name}
                  </Link>
                  {s.savesItemIds.length > 0 && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">
                      버려질 재료 살림
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  사야 할 것:{" "}
                  {s.missing
                    .map(
                      (m) =>
                        [m.ingredientId, ...m.alternatives].map(nameOf).join(" 또는 ") +
                        ` ${m.amount}${UNIT_LABEL[lookup(m.ingredientId)?.defaultUnit ?? "ea"]}`,
                    )
                    .join(", ")}
                </p>
                <button
                  type="button"
                  aria-label={`${s.recipe.name}에 필요한 재료 담기`}
                  onClick={() => add(s.missing.map((m) => toInput(m, s.recipe.id)))}
                  className="mt-2 min-h-11 rounded-full px-4 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-600 dark:text-emerald-300"
                >
                  부족한 재료 담기
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SimulationCard
        items={items}
        shopping={snapshot!.shopping}
        preferences={snapshot!.preferences}
      />
      <ShoppingList onMoved={show} />
      {toast}
    </>
  );
}
