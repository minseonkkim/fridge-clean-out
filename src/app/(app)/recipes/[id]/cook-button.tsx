"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { planCookUsage, type CookPlan } from "@/lib/domain/cook";
import { itemDisplayName, type FridgeItem } from "@/lib/domain/fridge";
import { UNIT_LABEL, type Recipe } from "@/lib/domain/types";
import { lookupWithPantry } from "@/lib/planner/preferences";
import { useFridge } from "@/lib/repo/fridge-context";

const baseLookup = (id: string) => INGREDIENT_BY_ID.get(id);

interface Preview {
  plan: CookPlan;
  lines: { itemId: string; text: string; mismatched: boolean }[];
  mismatched: string[];
}

function usageText(item: FridgeItem, amount: number | null): string {
  const name = itemDisplayName(item, baseLookup);
  return amount === null
    ? `${name} 전부 (${item.quantity}${UNIT_LABEL[item.unit]})`
    : `${name} ${amount}${UNIT_LABEL[item.unit]}`;
}

/**
 * 요리 완료 (기획서 F3-2, F3-3).
 * 1. 누르면 어떤 재료를 얼마나 뺄지 미리 보여 준다.
 * 2. 확인하면 재고를 차감한다 (계정 모드는 cook_recipe RPC 한 트랜잭션).
 * 3. 단위가 달라 통째로 다 쓴 것으로 처리한 재료는 수량을 고치도록 안내한다.
 * 차감 뒤 냉장고 데이터를 다시 불러오므로 식단 플랜도 다시 계산된다.
 */
export function CookButton({
  recipe,
  items,
  disabledPantry,
  servings,
  canCook,
}: {
  recipe: Recipe;
  items: FridgeItem[];
  disabledPantry: string[];
  servings: number;
  canCook: boolean;
}) {
  const { cook } = useFridge();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<{ used: string[]; mismatched: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 시트를 여는 시점의 재료로 문구까지 미리 만든다.
   * 요리 완료 뒤 냉장고를 다시 불러오면 다 쓴 재료가 목록에서 빠지기 때문이다.
   */
  function open() {
    const lookup = lookupWithPantry(baseLookup, disabledPantry);
    const plan = planCookUsage(recipe, items, lookup, servings);
    const byId = new Map(items.map((i) => [i.id, i]));
    setPreview({
      plan,
      lines: plan.usages.map((u) => ({
        itemId: u.itemId,
        text: usageText(byId.get(u.itemId)!, u.amount),
        mismatched: plan.mismatched.includes(u.itemId),
      })),
      mismatched: plan.mismatched.map((id) => {
        const item = byId.get(id)!;
        return `${itemDisplayName(item, baseLookup)} ${item.quantity}${UNIT_LABEL[item.unit]}`;
      }),
    });
    setError(null);
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      await cook(
        recipe.id,
        preview.plan.usages.map((u) => ({ itemId: u.itemId, amount: u.amount })),
        servings,
      );
      setDone({ used: preview.lines.map((l) => l.text), mismatched: preview.mismatched });
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section
        role="status"
        aria-label="요리 완료 결과"
        className="flex flex-col gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
      >
        <p className="text-base font-bold">🍳 {recipe.name} 완료!</p>
        {done.used.length > 0 && <p>냉장고에서 뺐어요: {done.used.join(", ")}</p>}
        {done.mismatched.length > 0 && (
          <p className="rounded-lg bg-amber-100 p-2 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            {done.mismatched.join(", ")}은(는) 레시피와 단위가 달라 다 쓴 것으로 처리했어요.
            남았다면{" "}
            <Link href="/fridge" className="font-semibold underline underline-offset-2">
              냉장고에서 수량을 고쳐
            </Link>{" "}
            주세요.
          </p>
        )}
        <Link href="/plan" className="font-semibold underline underline-offset-4">
          바뀐 식단 보기
        </Link>
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={!canCook}
        className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 mx-auto min-h-14 max-w-md rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-lg disabled:bg-neutral-300 disabled:text-neutral-500"
      >
        {canCook ? "요리 완료" : "재료가 모자라요"}
      </button>

      {preview && (
        <BottomSheet
          open
          onClose={() => setPreview(null)}
          title="이 재료를 냉장고에서 뺄게요"
          footer={
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="min-h-12 w-full rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
            >
              {busy ? "처리 중…" : `${recipe.name} 완료`}
            </button>
          }
        >
          <ul aria-label="뺄 재료" className="flex flex-col gap-2">
            {preview.lines.map((line) => (
              <li key={line.itemId} className="flex min-h-11 items-center justify-between gap-2">
                <span>{line.text}</span>
                {line.mismatched && (
                  <span className="text-xs text-amber-700">단위가 달라 전부 사용</span>
                )}
              </li>
            ))}
          </ul>
          {preview.lines.length === 0 && (
            <p className="text-neutral-500">냉장고에서 뺄 재료가 없어요 (기본 양념만 써요).</p>
          )}
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </BottomSheet>
      )}
    </>
  );
}
