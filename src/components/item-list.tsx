"use client";

import { useMemo, useState } from "react";
import { ingredientIcon } from "@/data/ingredient-icons";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { dDayLabel, daysLeft, freshness, todayIso, type Freshness } from "@/lib/domain/expiry";
import { itemDisplayName, type FridgeItem } from "@/lib/domain/fridge";
import { byUrgency, groupBySlot, urgencySummary } from "@/lib/domain/fridge-view";
import { STORAGE_LABEL, UNIT_LABEL } from "@/lib/domain/types";
import { Segmented } from "./segmented";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);

const BADGE_STYLE: Record<Freshness, string> = {
  fresh: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  soon: "bg-amber-100 text-amber-900 ring-1 ring-amber-400 dark:bg-amber-950 dark:text-amber-200",
  urgent: "bg-red-100 text-red-800 ring-1 ring-red-500 dark:bg-red-950 dark:text-red-200",
  expired: "bg-neutral-200 text-neutral-500 line-through dark:bg-neutral-800",
};

type View = "slot" | "urgent";
const VIEW_OPTIONS = [
  { value: "slot", label: "칸별" },
  { value: "urgent", label: "급한 순" },
] as const;

export function formatQuantity(item: Pick<FridgeItem, "quantity" | "unit">): string {
  return `${Math.round(item.quantity * 100) / 100}${UNIT_LABEL[item.unit]}`;
}

export function UrgencyBadges({ items }: { items: FridgeItem[] }) {
  const s = urgencySummary(items, todayIso());
  if (s.expired + s.today + s.soon === 0) {
    return <p className="text-sm text-neutral-500">급하게 먹어야 할 재료가 없어요.</p>;
  }
  return (
    <ul aria-label="급한 재료" className="flex flex-wrap gap-2 text-sm font-semibold">
      {s.today > 0 && (
        <li className={`rounded-full px-3 py-1 ${BADGE_STYLE.urgent}`}>오늘까지 {s.today}</li>
      )}
      {s.soon > 0 && (
        <li className={`rounded-full px-3 py-1 ${BADGE_STYLE.soon}`}>3일 안에 {s.soon}</li>
      )}
      {s.expired > 0 && (
        <li className="rounded-full bg-neutral-200 px-3 py-1 text-neutral-600 dark:bg-neutral-800">
          기한 지남 {s.expired}
        </li>
      )}
    </ul>
  );
}

function ItemRow({ item, onSelect }: { item: FridgeItem; onSelect?: (item: FridgeItem) => void }) {
  const left = daysLeft(item.expiresAt, todayIso());
  const level = freshness(left);
  const name = itemDisplayName(item, lookup);
  // 화면 밖 줄은 그리지 않는다 (재료가 수백 개여도 보이는 줄만 렌더)
  return (
    <li className="[contain-intrinsic-size:auto_3.5rem] [content-visibility:auto]">
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        data-item-id={item.id}
        className="flex min-h-14 w-full items-center gap-3 px-1 text-left"
      >
        <span aria-hidden className="text-xl">
          {ingredientIcon(item.ingredientId, lookup(item.ingredientId ?? "")?.category)}
        </span>
        <span className="flex-1">
          <span className={`font-medium ${level === "expired" ? "text-neutral-400" : ""}`}>
            {name}
          </span>
          <span className="ml-2 text-sm text-neutral-500">{formatQuantity(item)}</span>
          {item.storage === "freezer" && <span className="ml-1 text-xs text-sky-600">❄ 냉동</span>}
        </span>
        <span
          className={`min-w-14 rounded-full px-2 py-0.5 text-center text-sm font-semibold ${BADGE_STYLE[level]}`}
        >
          {dDayLabel(left)}
        </span>
      </button>
    </li>
  );
}

/** 냉장고 화면과 같은 정보를 담은 목록 보기 (기획서 3.5절) */
export function ItemList({
  items,
  onSelect,
}: {
  items: FridgeItem[];
  onSelect?: (item: FridgeItem) => void;
}) {
  const [view, setView] = useState<View>("slot");
  const sections = useMemo(() => groupBySlot(items, lookup), [items]);
  const urgent = useMemo(() => [...items].sort(byUrgency), [items]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-neutral-50 p-6 text-center text-neutral-500 dark:bg-neutral-900">
        냉장고가 비어 있어요. 오른쪽 아래 + 버튼으로 재료를 넣어 보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented label="정렬" value={view} options={VIEW_OPTIONS} onChange={setView} />
      {view === "slot" ? (
        sections.map((section) => (
          <section key={section.slot} aria-labelledby={`slot-${section.slot}`}>
            <h2 id={`slot-${section.slot}`} className="mb-1 text-sm font-semibold text-neutral-500">
              {section.label} <span className="font-normal">{section.items.length}</span>
            </h2>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {section.items.map((item) => (
                <ItemRow key={item.id} item={item} onSelect={onSelect} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <ul
          aria-label="급한 순 재료"
          className="divide-y divide-neutral-100 dark:divide-neutral-800"
        >
          {urgent.map((item) => (
            <ItemRow key={item.id} item={item} onSelect={onSelect} />
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-400">
        기한은 권장값이에요. {STORAGE_LABEL.freezer} 재료는 ❄로 표시해요.
      </p>
    </div>
  );
}
