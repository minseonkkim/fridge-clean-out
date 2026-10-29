"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

const DemoScene = dynamic(() => import("@/components/fridge3d/demo"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 animate-pulse rounded-3xl bg-gradient-to-b from-amber-50 to-orange-100" />
  ),
});

const reducedQuery = "(prefers-reduced-motion: reduce)";

/**
 * 랜딩의 3D 냉장고 데모 (기획서 4장, 결정 D1 개정). 누르면 문이 경첩으로 돌며 열리고 급한 재료가 보인다.
 * 움직임을 줄이는 설정이면 문이 돌지 않고 바로 열린다.
 */
export function FridgeDemo() {
  const [open, setOpen] = useState(false);
  const reducedMotion = useSyncExternalStore(
    (on) => {
      const mq = window.matchMedia(reducedQuery);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    },
    () => window.matchMedia(reducedQuery).matches,
    () => false,
  );

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-pressed={open}
      aria-label={open ? "냉장고 문 닫기" : "냉장고 문 열기"}
      className="relative mx-auto block aspect-[3/4] w-64 overflow-hidden rounded-3xl bg-[#f6efe4] shadow-lg ring-1 ring-amber-200"
    >
      <DemoScene open={open} reducedMotion={reducedMotion} />
      {!open && (
        <span className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-1">
          <span className="rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white shadow">
            오늘까지 1
          </span>
          <span className="rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-amber-950 shadow">
            3일 안에 2
          </span>
        </span>
      )}
      <span className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-neutral-800">
        {open ? "다시 누르면 닫혀요" : "눌러서 열기"}
      </span>
    </button>
  );
}
