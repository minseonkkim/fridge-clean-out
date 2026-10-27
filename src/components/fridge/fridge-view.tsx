"use client";

import { useMemo } from "react";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { dDayLabel, daysLeft, freshness, todayIso, type Freshness } from "@/lib/domain/expiry";
import { itemDisplayName, type CompartmentSlot, type FridgeItem } from "@/lib/domain/fridge";
import { SLOT_LABEL, groupBySlot } from "@/lib/domain/fridge-view";
import { UNIT_LABEL } from "@/lib/domain/types";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

const TONE: Record<Freshness, string> = {
  fresh: "bg-white ring-neutral-200 dark:bg-neutral-800 dark:ring-neutral-700",
  soon: "bg-amber-50 ring-amber-400 dark:bg-amber-950",
  urgent: "bg-red-50 ring-red-500 dark:bg-red-950",
  expired: "bg-neutral-200 ring-neutral-300 text-neutral-500 dark:bg-neutral-800",
};

function ItemToken({
  item,
  onSelect,
}: {
  item: FridgeItem;
  onSelect?: (item: FridgeItem) => void;
}) {
  const left = daysLeft(item.expiresAt, todayIso());
  const level = freshness(left);
  const name = itemDisplayName(item, lookup);
  const qty = `${Math.round(item.quantity * 100) / 100}${UNIT_LABEL[item.unit]}`;
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item)}
      aria-label={`${name} ${qty} ${dDayLabel(left)}`}
      className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1 text-xs ring-2 ${TONE[level]}`}
    >
      <span className="max-w-20 truncate font-semibold">{name}</span>
      <span className="text-[10px] text-neutral-500">
        {qty} · {dDayLabel(left)}
      </span>
    </button>
  );
}

function Compartment({
  slot,
  items,
  onSelect,
  className = "",
}: {
  slot: CompartmentSlot;
  items: FridgeItem[];
  onSelect?: (item: FridgeItem) => void;
  className?: string;
}) {
  const id = `compartment-${slot}`;
  return (
    <section aria-labelledby={id} className={`flex min-h-16 flex-col gap-1 p-2 ${className}`}>
      <h3 id={id} className="text-[11px] font-semibold text-neutral-400">
        {SLOT_LABEL[slot]}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <ItemToken key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

/**
 * 냉장고 화면 (기획서 3.1절 구조)
 * - 위 냉장실: 선반 3단(위·가운데·아래), 채소칸 서랍, 문 선반
 * - 아래 냉동실: 서랍 2단
 * - 옆 팬트리 선반(실온). 폭이 좁은 화면에서는 냉장고 아래에 둔다.
 */
export function FridgeView({
  items,
  onSelect,
}: {
  items: FridgeItem[];
  onSelect?: (item: FridgeItem) => void;
}) {
  const bySlot = useMemo(() => {
    const map = new Map<CompartmentSlot, FridgeItem[]>();
    for (const s of groupBySlot(items, lookup)) map.set(s.slot, s.items);
    return map;
  }, [items]);
  const at = (slot: CompartmentSlot) => bySlot.get(slot) ?? [];

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div
        aria-label="냉장고"
        role="group"
        className="flex flex-1 flex-col overflow-hidden rounded-3xl border-4 border-neutral-300 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900"
      >
        {/* 냉장실 */}
        <div aria-label="냉장실" role="group" className="flex bg-sky-50/70 dark:bg-sky-950/40">
          <div className="flex flex-1 flex-col divide-y-2 divide-sky-200 dark:divide-sky-900">
            <Compartment slot="fridge_top" items={at("fridge_top")} onSelect={onSelect} />
            <Compartment slot="fridge_middle" items={at("fridge_middle")} onSelect={onSelect} />
            <Compartment slot="fridge_bottom" items={at("fridge_bottom")} onSelect={onSelect} />
            <Compartment
              slot="veg_drawer"
              items={at("veg_drawer")}
              onSelect={onSelect}
              className="m-1 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40"
            />
          </div>
          <Compartment
            slot="fridge_door"
            items={at("fridge_door")}
            onSelect={onSelect}
            className="w-24 shrink-0 border-l-4 border-neutral-300 bg-white/60 dark:border-neutral-700 dark:bg-neutral-800/60"
          />
        </div>

        {/* 냉장실·냉동실 경계 */}
        <div aria-hidden className="h-2 bg-neutral-300 dark:bg-neutral-700" />

        {/* 냉동실 */}
        <div
          aria-label="냉동실"
          role="group"
          className="flex flex-col gap-1 bg-indigo-50/70 p-1 dark:bg-indigo-950/40"
        >
          <Compartment
            slot="freezer_upper"
            items={at("freezer_upper")}
            onSelect={onSelect}
            className="rounded-xl bg-white/70 dark:bg-neutral-800/60"
          />
          <Compartment
            slot="freezer_lower"
            items={at("freezer_lower")}
            onSelect={onSelect}
            className="rounded-xl bg-white/70 dark:bg-neutral-800/60"
          />
        </div>
      </div>

      {/* 팬트리 */}
      <div
        aria-label="팬트리"
        role="group"
        className="rounded-3xl border-4 border-amber-200 bg-amber-50/60 sm:w-40 dark:border-amber-900 dark:bg-amber-950/30"
      >
        <Compartment slot="pantry" items={at("pantry")} onSelect={onSelect} />
      </div>
    </div>
  );
}
