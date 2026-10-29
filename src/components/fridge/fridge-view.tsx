"use client";

import dynamic from "next/dynamic";
import type { FlyAwayRequest } from "@/components/fridge/fly-away";
import type { CompartmentSlot, FridgeItem } from "@/lib/domain/fridge";

/**
 * 냉장고 화면. 3D 장면(three.js)은 무거우므로 따로 내려받고, 받는 동안 빈 냉장고 자리를 보여 준다.
 */
const Fridge3D = dynamic(() => import("@/components/fridge3d/fridge-3d"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="냉장고를 여는 중"
      className="h-[68dvh] min-h-[460px] animate-pulse rounded-3xl bg-gradient-to-b from-amber-50 to-orange-100 dark:from-neutral-900 dark:to-neutral-950"
    />
  ),
});

export function FridgeView(props: {
  items: FridgeItem[];
  onSelect?: (item: FridgeItem) => void;
  /** 재료를 다른 칸으로 끌어다 놓았을 때 */
  onMove?: (item: FridgeItem, to: CompartmentSlot) => void;
  /** 밝게 보여 줄 재료 (나머지는 어둡게). 식단의 요리에 쓰이는 재료 */
  highlight?: ReadonlySet<string> | null;
  /** 다 씀·버림으로 떠나는 재료 (3D 접시·휴지통 연출) */
  departure?: FlyAwayRequest | null;
  onDepartureDone?: () => void;
}) {
  return <Fridge3D {...props} />;
}
