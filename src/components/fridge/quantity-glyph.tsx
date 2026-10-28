"use client";

import { quantityVisual } from "@/lib/domain/quantity-visual";
import type { IngredientCategory, Unit } from "@/lib/domain/types";

const CATEGORY_COLOR: Record<IngredientCategory | "custom", string> = {
  vegetable: "#22c55e",
  fruit: "#f97316",
  meat: "#ef4444",
  seafood: "#0ea5e9",
  egg_dairy: "#facc15",
  tofu_bean: "#e5e7eb",
  grain_noodle: "#d6a76c",
  processed: "#f472b6",
  side_kimchi: "#dc2626",
  sauce: "#92400e",
  beverage: "#60a5fa",
  etc: "#a3a3a3",
  custom: "#a3a3a3",
};

/**
 * 수량을 그림으로 보여 준다 (기획서 3.3절). 숫자는 접근성 이름에 따로 있으므로 그림은 장식이다.
 * - 셀 수 있는 재료: 최대 6개 쌓기 + "×N"
 * - 무게·부피: 용기 채움
 */
export function QuantityGlyph({
  quantity,
  unit,
  reference,
  category,
  icon,
  size = "sm",
}: {
  quantity: number;
  unit: Unit;
  reference: number;
  category: IngredientCategory | null;
  /** 재료 아이콘 (이모지). 셀 수 있는 재료는 이 아이콘을 개수만큼 쌓는다. */
  icon?: string;
  size?: "sm" | "lg";
}) {
  const v = quantityVisual(quantity, unit, reference);
  const color = CATEGORY_COLOR[category ?? "custom"];
  const dot = size === "lg" ? "size-5" : "size-2.5";

  if (v.kind === "fill") {
    const w = size === "lg" ? "w-10 h-14" : "w-4 h-5";
    return (
      <span aria-hidden className="inline-flex items-end gap-1">
        {icon && <span className={size === "lg" ? "text-3xl" : "text-base"}>{icon}</span>}
        <span
          data-fill={v.ratio}
          className={`relative inline-block overflow-hidden rounded-md border-2 border-neutral-400 bg-white dark:border-neutral-500 dark:bg-neutral-900 ${w}`}
        >
          <span
            className="absolute inset-x-0 bottom-0 transition-[height] duration-200 motion-reduce:transition-none"
            style={{ height: `${v.ratio * 100}%`, background: color, opacity: 0.85 }}
          />
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      data-stack={v.shown}
      className={`inline-flex items-end ${icon ? "" : "gap-0.5"}`}
    >
      {Array.from({ length: v.shown }, (_, i) =>
        icon ? (
          <span
            key={i}
            className={`${size === "lg" ? "text-3xl" : "text-xs"} leading-none ${i > 0 ? (size === "lg" ? "-ml-3" : "-ml-2") : ""}`}
          >
            {icon}
          </span>
        ) : (
          <span
            key={i}
            className={`${dot} inline-block rounded-full ring-1 ring-black/10`}
            style={{ background: color }}
          />
        ),
      )}
      {v.overflow !== null && (
        <span
          className={`font-bold text-neutral-600 ${size === "lg" ? "text-base" : "text-[10px]"} dark:text-neutral-300`}
        >
          ×{v.overflow}
        </span>
      )}
    </span>
  );
}
