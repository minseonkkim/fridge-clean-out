"use client";

import Link from "next/link";
import { useState } from "react";
import { AddItemSheet } from "@/components/add-item-sheet";
import { FridgeView } from "@/components/fridge/fridge-view";
import { Segmented } from "@/components/segmented";
import { ItemDetailSheet } from "@/components/item-detail-sheet";
import { ItemList, UrgencyBadges } from "@/components/item-list";
import { useToast } from "@/components/toast";
import { useFridge } from "@/lib/repo/fridge-context";
import { PlanBody } from "../plan/plan-screen";

type View = "fridge" | "list";
const VIEW_OPTIONS = [
  { value: "fridge", label: "냉장고" },
  { value: "list", label: "목록" },
] as const;
const VIEW_KEY = "naengteol:fridge-view";

function loadView(): View {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(VIEW_KEY) === "list"
      ? "list"
      : "fridge";
  } catch {
    return "fridge";
  }
}

function saveView(view: View) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // 저장하지 못해도 이번 방문 동안은 고른 보기를 쓴다.
  }
}

/**
 * 냉장고 홈. 냉장고 보기와, 같은 정보를 담은 목록 보기를 오간다 (기획서 3.5절).
 */
export function FridgeHome() {
  const { status, error, snapshot, mode } = useFridge();
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = snapshot?.items.find((i) => i.id === selectedId) ?? null;
  const { show, toast } = useToast();
  // 브라우저 저장소를 읽지만, 보기는 snapshot(브라우저에서만 채워짐)이 있을 때만 그리므로 수화 불일치가 없다.
  const [view, setView] = useState<View>(loadView);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-28 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 lg:px-8">
      <div className="flex flex-col gap-4">
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
            {!snapshot.preferences.onboardedAt && (
              <Link
                href="/onboarding"
                className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950"
              >
                <span>
                  <span className="block font-semibold text-emerald-900 dark:text-emerald-100">
                    1분 설정하고 맞춤 식단 받기
                  </span>
                  <span className="text-sm text-emerald-800 dark:text-emerald-200">
                    끼니 수, 못 먹는 재료, 조리도구, 지금 있는 재료
                  </span>
                </span>
                <span aria-hidden className="text-xl text-emerald-700">
                  ›
                </span>
              </Link>
            )}
            <div className="flex items-center justify-between gap-2">
              <UrgencyBadges items={snapshot.items} />
              <p className="shrink-0 text-sm text-neutral-500">재료 {snapshot.items.length}개</p>
            </div>
            <Segmented
              label="보기"
              value={view}
              options={VIEW_OPTIONS}
              onChange={(v) => {
                setView(v);
                saveView(v);
              }}
            />
            {view === "fridge" ? (
              <>
                {snapshot.items.length === 0 && (
                  <p className="text-center text-sm text-neutral-500">
                    냉장고가 비어 있어요. 오른쪽 아래 + 버튼으로 재료를 넣어 보세요.
                  </p>
                )}
                <FridgeView items={snapshot.items} onSelect={(item) => setSelectedId(item.id)} />
              </>
            ) : (
              <ItemList items={snapshot.items} onSelect={(item) => setSelectedId(item.id)} />
            )}
          </>
        )}
      </div>

      {/* 1024px 이상: 오른쪽에 식단 플랜을 나란히 보여 준다 (기획서 4.1절 데스크톱 확장). */}
      {snapshot && (
        <aside
          aria-label="식단 플랜"
          className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4"
        >
          <h2 className="text-xl font-bold">식단 플랜</h2>
          <PlanBody items={snapshot.items} />
        </aside>
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
      {selected && (
        <ItemDetailSheet
          key={selected.id}
          item={selected}
          onClose={() => setSelectedId(null)}
          onClosed={show}
        />
      )}
      {toast}
    </main>
  );
}
