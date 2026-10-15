"use client";

import { useEffect, useState } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { todayIso } from "@/lib/domain/expiry";
import { itemDisplayName } from "@/lib/domain/fridge";
import { repurchaseInput, type RecentPurchase } from "@/lib/domain/recent";
import { UNIT_LABEL } from "@/lib/domain/types";
import { useFridge } from "@/lib/repo/fridge-context";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

/** 최근 산 재료를 한 번 눌러 다시 넣는다 (기획서 F1-2). */
export function RecentPurchases({ onAdded }: { onAdded: (label: string) => void }) {
  const { recentPurchases, addItems, mode } = useFridge();
  const [recent, setRecent] = useState<RecentPurchase[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    let cancelled = false;
    recentPurchases(10).then(
      (r) => !cancelled && setRecent(r),
      () => !cancelled && setRecent([]),
    );
    return () => {
      cancelled = true;
    };
  }, [mode, recentPurchases]);

  if (!recent || recent.length === 0) return null;

  async function add(r: RecentPurchase) {
    const name = itemDisplayName(r, lookup);
    setBusy(name);
    try {
      const ingredient = r.ingredientId ? lookup(r.ingredientId) : undefined;
      await addItems([repurchaseInput(r, ingredient, todayIso())]);
      onAdded(`${name} ${r.quantity}${UNIT_LABEL[r.unit]}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
      <h3 id="recent-heading" className="text-sm font-semibold">
        최근 산 재료 <span className="font-normal text-neutral-500">· 누르면 바로 넣어요</span>
      </h3>
      <ul className="flex flex-wrap gap-2">
        {recent.map((r) => {
          const name = itemDisplayName(r, lookup);
          return (
            <li key={r.ingredientId ?? `custom:${r.customName}`}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => add(r)}
                aria-label={`${name} 다시 넣기`}
                className="min-h-11 rounded-full bg-neutral-100 px-4 text-sm disabled:opacity-50 dark:bg-neutral-800"
              >
                {busy === name ? "넣는 중…" : `+ ${name}`}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
