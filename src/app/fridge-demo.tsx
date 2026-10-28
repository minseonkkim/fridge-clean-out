"use client";

import { useState } from "react";

const DEMO_ITEMS = [
  { name: "숙주", badge: "D-1", tone: "bg-red-100 text-red-800 ring-red-400" },
  { name: "두부", badge: "D-2", tone: "bg-amber-100 text-amber-900 ring-amber-400" },
  { name: "계란", badge: "D-20", tone: "bg-white text-neutral-700 ring-neutral-200" },
  { name: "김치", badge: "D-40", tone: "bg-white text-neutral-700 ring-neutral-200" },
];

/**
 * 랜딩의 냉장고 데모 (기획서 4장). 문을 누르면 열리며 급한 재료가 보인다.
 * 움직임을 줄이는 설정이면 회전 대신 페이드로 바뀐다 (기획서 3.5절).
 */
export function FridgeDemo() {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-pressed={open}
      aria-label={open ? "냉장고 문 닫기" : "냉장고 문 열기"}
      className="relative mx-auto block aspect-[3/4] w-56 [perspective:900px]"
    >
      {/* 냉장고 안 */}
      <div className="absolute inset-0 flex flex-col justify-around rounded-3xl bg-gradient-to-b from-sky-50 to-white p-4 shadow-inner ring-1 ring-neutral-200 dark:from-sky-950 dark:to-neutral-900 dark:ring-neutral-700">
        {[0, 1].map((shelf) => (
          <div
            key={shelf}
            className="flex justify-around border-b-2 border-sky-200 pb-2 dark:border-sky-800"
          >
            {DEMO_ITEMS.slice(shelf * 2, shelf * 2 + 2).map((item) => (
              <span
                key={item.name}
                className={`rounded-xl px-2 py-1 text-sm font-semibold ring-2 ${item.tone}`}
              >
                {item.name}
                <span className="ml-1 text-xs">{item.badge}</span>
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* 문: 경첩(왼쪽)을 축으로 열린다 */}
      <div
        className={`absolute inset-0 flex origin-left flex-col items-end justify-center rounded-3xl bg-emerald-700 p-4 shadow-xl transition-[transform,opacity] duration-500 [backface-visibility:hidden] motion-reduce:[transform:none] motion-reduce:transition-opacity ${
          open ? "[transform:rotateY(-110deg)] motion-reduce:opacity-0" : ""
        }`}
      >
        <span className="h-16 w-2 rounded-full bg-white/70" aria-hidden />
        <span className="absolute top-4 left-4 rounded-full bg-red-500 px-2 py-1 text-xs font-bold text-white">
          오늘까지 1
        </span>
        <span className="absolute top-12 left-4 rounded-full bg-amber-400 px-2 py-1 text-xs font-bold text-amber-950">
          3일 안에 1
        </span>
        <span className="absolute bottom-4 left-4 text-sm font-semibold text-white/90">
          눌러서 열기
        </span>
      </div>
    </button>
  );
}
