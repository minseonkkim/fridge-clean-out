"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AddItemSheet } from "@/components/add-item-sheet";
import { FlyAway, type FlyAwayRequest } from "@/components/fridge/fly-away";
import { FridgeView } from "@/components/fridge/fridge-view";
import { MissingSilhouettes } from "@/components/fridge/missing-silhouettes";
import { Segmented } from "@/components/segmented";
import { ItemDetailSheet } from "@/components/item-detail-sheet";
import { ItemList, UrgencyBadges } from "@/components/item-list";
import { useToast } from "@/components/toast";
import { useFridge } from "@/lib/repo/fridge-context";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { RECIPE_BY_ID } from "@/data/recipes";
import { planCookUsage } from "@/lib/domain/cook";
import { lookupWithPantry } from "@/lib/planner/preferences";
import { dDayLabel, daysLeft, todayIso } from "@/lib/domain/expiry";
import {
  SLOT_STORAGE,
  itemDisplayName,
  type CompartmentSlot,
  type FridgeItem,
  type ItemPatch,
} from "@/lib/domain/fridge";
import { SLOT_LABEL } from "@/lib/domain/fridge-view";
import { storageChangePatch } from "@/lib/domain/item-edit";
import { josa } from "@/lib/korean";
import { PlanBody } from "../plan/plan-screen";
import { TodayMeal } from "./today-meal";
import { UiArt } from "@/components/ui-art";

/** 주소의 #cook=<레시피 id> (식단에서 넘어올 때) */
function readCookHash(): string | null {
  if (typeof window === "undefined") return null;
  const m = /^#cook=([a-z0-9_]+)$/.exec(window.location.hash);
  return m ? m[1] : null;
}

function useCookHash(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("hashchange", onChange);
      window.addEventListener(COOK_HASH_EVENT, onChange);
      return () => {
        window.removeEventListener("hashchange", onChange);
        window.removeEventListener(COOK_HASH_EVENT, onChange);
      };
    },
    readCookHash,
    () => null,
  );
}

const COOK_HASH_EVENT = "naengteol:cook-hash";

/** 같은 화면에서 요리 재료 강조를 켠다 (오늘의 한 끼 카드) */
function showCookHash(recipeId: string) {
  window.history.replaceState(null, "", `${window.location.pathname}#cook=${recipeId}`);
  window.dispatchEvent(new Event(COOK_HASH_EVENT));
}

function clearCookHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  window.dispatchEvent(new Event(COOK_HASH_EVENT));
}

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
  const { status, error, snapshot, mode, updateItem } = useFridge();
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = snapshot?.items.find((i) => i.id === selectedId) ?? null;
  const { show, toast } = useToast();
  // 브라우저 저장소를 읽지만, 보기는 snapshot(브라우저에서만 채워짐)이 있을 때만 그리므로 수화 불일치가 없다.
  const [view, setView] = useState<View>(loadView);
  const [fly, setFly] = useState<FlyAwayRequest | null>(null);
  const clearFly = useCallback(() => setFly(null), []);
  // 식단에서 "냉장고에서 재료 보기"로 들어오면 주소의 #cook=<레시피 id>로 그 요리의 재료를 강조한다.
  const cookRecipeId = useCookHash();
  const cookRecipe = cookRecipeId ? RECIPE_BY_ID.get(cookRecipeId) : undefined;
  const highlight = useMemo(() => {
    if (!cookRecipe || !snapshot) return null;
    const lookup = lookupWithPantry(
      (id) => INGREDIENT_BY_ID.get(id),
      snapshot.preferences.disabledPantry,
    );
    return new Set(planCookUsage(cookRecipe, snapshot.items, lookup).usages.map((u) => u.itemId));
  }, [cookRecipe, snapshot]);
  /** 고른 재료의 화면 위치 (다 씀·버림 연출의 출발점) */
  const selectedRect = useRef<FlyAwayRequest["from"] | null>(null);

  function selectItem(item: FridgeItem) {
    const el = document.querySelector(`[data-item-id="${item.id}"]`);
    const r = el?.getBoundingClientRect();
    selectedRect.current = r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
    setSelectedId(item.id);
  }

  /** 끌어다 놓은 칸으로 옮긴다. 보관 방식이 바뀌면 기한을 다시 잡고 알려 준다 (기획서 3.2절). */
  async function moveItem(item: FridgeItem, to: CompartmentSlot) {
    const ingredient = item.ingredientId ? INGREDIENT_BY_ID.get(item.ingredientId) : undefined;
    const today = todayIso();
    const storage = SLOT_STORAGE[to];
    const patch: ItemPatch = { ...storageChangePatch(item, storage, ingredient, today), slot: to };
    const name = itemDisplayName(item, (id) => INGREDIENT_BY_ID.get(id));
    try {
      await updateItem(item.id, patch);
      if (patch.expiresAt) {
        show(
          `${josa(name, "을", "를")} ${SLOT_LABEL[to]}에 넣었어요. 새 기한 ${patch.expiresAt} (${dDayLabel(daysLeft(patch.expiresAt, today))})`,
        );
      } else {
        show(`${josa(name, "을", "를")} ${josa(SLOT_LABEL[to], "으로", "로")} 옮겼어요.`);
      }
    } catch (e) {
      show(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-28 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-10 lg:px-8">
      <div className="flex flex-col gap-4">
        <header className="flex items-baseline justify-between">
          <h1 className="text-xl font-bold">내 냉장고</h1>
          {mode === "trial" && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              체험 모드 · 이 기기에만 저장
            </span>
          )}
        </header>

        {status === "loading" && !snapshot && (
          <p className="text-neutral-500 dark:text-neutral-400">냉장고를 여는 중…</p>
        )}
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
                <span aria-hidden className="text-xl text-emerald-700 dark:text-emerald-400">
                  ›
                </span>
              </Link>
            )}
            <TodayMeal
              items={snapshot.items}
              preferences={snapshot.preferences}
              onShowIngredients={showCookHash}
            />
            <div className="flex items-center justify-between gap-2">
              <UrgencyBadges items={snapshot.items} />
              <p className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">
                재료 {snapshot.items.length}개
              </p>
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
            {cookRecipe && highlight && (
              <div
                role="status"
                aria-label="요리 재료 강조"
                className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 p-3 text-sm dark:bg-emerald-950"
              >
                <span>
                  <UiArt name="pan" className="mr-1 inline size-5 align-text-bottom" />
                  <b>{cookRecipe.name}</b>에 쓰는 재료 {highlight.size}개를 밝게 표시했어요
                </span>
                <span className="flex shrink-0 gap-1">
                  <Link
                    href={`/recipes/${cookRecipe.id}`}
                    className="min-h-11 content-center px-2 font-semibold text-emerald-700 dark:text-emerald-300"
                  >
                    레시피
                  </Link>
                  <button
                    type="button"
                    onClick={clearCookHash}
                    className="min-h-11 px-2 text-neutral-500 dark:text-neutral-400"
                  >
                    해제
                  </button>
                </span>
              </div>
            )}
            {view === "fridge" ? (
              <>
                {snapshot.items.length === 0 && (
                  <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                    냉장고가 비어 있어요. 오른쪽 아래 + 버튼으로 재료를 넣어 보세요.
                  </p>
                )}
                <FridgeView
                  items={snapshot.items}
                  onSelect={selectItem}
                  onMove={moveItem}
                  highlight={highlight}
                  departure={fly}
                  onDepartureDone={clearFly}
                />
              </>
            ) : (
              <ItemList items={snapshot.items} onSelect={selectItem} />
            )}
            {cookRecipe && (
              <MissingSilhouettes
                key={cookRecipe.id}
                recipe={cookRecipe}
                items={snapshot.items}
                disabledPantry={snapshot.preferences.disabledPantry}
                onMessage={show}
              />
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
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] grid size-14 place-items-center rounded-full bg-emerald-700 text-3xl text-white shadow-lg"
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
          onClosed={(message, status) => {
            show(message);
            if (selectedRect.current) {
              setFly({
                id: Date.now(),
                kind: status === "used_up" ? "plate" : "trash",
                name: itemDisplayName(selected, (id) => INGREDIENT_BY_ID.get(id)),
                itemId: selected.id,
                ingredientId: selected.ingredientId,
                category: selected.ingredientId
                  ? (INGREDIENT_BY_ID.get(selected.ingredientId)?.category ?? null)
                  : null,
                from: selectedRect.current,
              });
            }
          }}
        />
      )}
      {/* 냉장고 보기에서는 3D 장면이 연출하고, 목록 보기에서만 화면 위 연출을 쓴다 */}
      {fly && view === "list" && <FlyAway key={fly.id} request={fly} onDone={clearFly} />}
      {toast}
    </main>
  );
}
