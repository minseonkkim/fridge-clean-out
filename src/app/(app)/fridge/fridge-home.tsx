"use client";

import { useState } from "react";
import { AddItemSheet } from "@/components/add-item-sheet";
import { ItemList, UrgencyBadges } from "@/components/item-list";
import { useFridge } from "@/lib/repo/fridge-context";

/**
 * 냉장고 홈. 1단계에서는 목록 화면으로 먼저 완성하고,
 * 2단계에서 인터랙티브 냉장고를 얹는다 (로드맵 원칙).
 */
export function FridgeHome() {
  const { status, error, snapshot, mode } = useFridge();
  const [adding, setAdding] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-6 pb-28">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">내 냉장고</h1>
        {mode === "trial" && (
          <span className="text-xs text-neutral-500">체험 모드 · 이 기기에만 저장</span>
        )}
      </header>

      {status === "loading" && !snapshot && <p className="text-neutral-500">냉장고를 여는 중…</p>}
      {status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {/* snapshot은 브라우저에서만 채워지므로 오늘 날짜를 읽는 목록은 prerender되지 않는다. */}
      {snapshot && (
        <>
          <div className="flex items-center justify-between gap-2">
            <UrgencyBadges items={snapshot.items} />
            <p className="shrink-0 text-sm text-neutral-500">재료 {snapshot.items.length}개</p>
          </div>
          <ItemList items={snapshot.items} />
        </>
      )}

      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-label="재료 추가"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] grid size-14 place-items-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg"
      >
        +
      </button>
      {/* 열 때만 마운트한다: 오늘 날짜를 읽으므로 미리 렌더링(prerender)에 포함되면 안 된다. */}
      {adding && <AddItemSheet open onClose={() => setAdding(false)} />}
    </main>
  );
}
