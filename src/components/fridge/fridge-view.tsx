"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompartmentZoom, ZoomContext, useZoom, type ZoomRequest } from "./compartment-zoom";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { dDayLabel, daysLeft, freshness, todayIso, type Freshness } from "@/lib/domain/expiry";
import { itemDisplayName, type CompartmentSlot, type FridgeItem } from "@/lib/domain/fridge";
import { SLOT_LABEL, groupBySlot, urgencySummary } from "@/lib/domain/fridge-view";
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
  // 누르면 살짝 튀어 오르며 선택된다 (기획서 3.2절). 애니메이션이 끝나면 다시 누를 때를 위해 해제한다.
  const [popping, setPopping] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        setPopping(true);
        onSelect?.(item);
      }}
      onAnimationEnd={() => setPopping(false)}
      aria-label={`${name} ${qty} ${dDayLabel(left)}`}
      data-popping={popping || undefined}
      className={`flex min-h-11 flex-col items-center justify-center rounded-xl px-2 py-1 text-xs ring-2 ${TONE[level]} ${
        popping ? "animate-[item-pop_260ms_ease-out] motion-reduce:animate-none" : ""
      }`}
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
  const zoom = useZoom();
  const sectionRef = useRef<HTMLElement>(null);
  return (
    <section
      ref={sectionRef}
      aria-labelledby={id}
      className={`flex min-h-16 flex-col gap-1 p-2 ${className}`}
    >
      <h3 id={id} className="text-[11px] font-semibold text-neutral-400">
        {zoom ? (
          <button
            type="button"
            title="크게 보기"
            aria-describedby="zoom-hint"
            onClick={() =>
              sectionRef.current && zoom({ slot, from: sectionRef.current.getBoundingClientRect() })
            }
            className="-mx-1 rounded px-1 underline decoration-dotted underline-offset-2"
          >
            {SLOT_LABEL[slot]}
          </button>
        ) : (
          SLOT_LABEL[slot]
        )}
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
 * 냉동실 서랍 (기획서 3.1절): 닫혀 있으면 서랍 앞면(손잡이·재료 수)만 보이고,
 * 누르면 당겨지며 위에서 내려다보는 시점으로 재료가 보인다.
 * 움직임을 줄이는 설정이면 회전 없이 바로 나타난다.
 */
function FreezerDrawer({
  slot,
  items,
  onSelect,
}: {
  slot: CompartmentSlot;
  items: FridgeItem[];
  onSelect?: (item: FridgeItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const id = `compartment-${slot}`;
  const preview = items
    .slice(0, 2)
    .map((i) => itemDisplayName(i, lookup))
    .join(", ");

  return (
    <section aria-labelledby={id} className="rounded-xl bg-white/70 dark:bg-neutral-800/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-inside`}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 px-3 text-left"
      >
        <span aria-hidden className="h-1.5 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600" />
        <span className="flex-1">
          <h3 id={id} className="text-[11px] font-semibold text-neutral-400">
            {SLOT_LABEL[slot]}
          </h3>
          <span className="text-xs text-neutral-600 dark:text-neutral-300">
            {items.length === 0
              ? "비어 있어요"
              : `${preview}${items.length > 2 ? ` 외 ${items.length - 2}개` : ""}`}
          </span>
        </span>
        <span className="text-xs text-indigo-700 dark:text-indigo-300">
          {open ? "서랍 닫기" : "서랍 열기"}
        </span>
      </button>
      {open && (
        <div className="[perspective:700px]">
          <div
            id={`${id}-inside`}
            className="origin-top [transform:rotateX(18deg)] animate-[drawer-open_300ms_ease-out_both] rounded-b-xl bg-indigo-50 p-2 motion-reduce:[transform:none] motion-reduce:animate-none dark:bg-indigo-950/60"
          >
            {items.length === 0 ? (
              <p className="py-2 text-center text-xs text-neutral-500">서랍이 비어 있어요</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {items.map((item) => (
                  <ItemToken key={item.id} item={item} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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

  const [open, setOpen] = useState(loadDoor);
  const [zoom, setZoom] = useState<ZoomRequest | null>(null);
  const closeZoom = useCallback(() => setZoom(null), []);
  const summary = urgencySummary(items, todayIso());
  const freezerCount = at("freezer_upper").length + at("freezer_lower").length;

  function openDoor() {
    setOpen(true);
    saveDoor(true);
  }

  // 열린 문은 냉장고 바깥의 빈 곳을 누르면 닫힌다 (기획서 3.2절).
  // 버튼·링크·입력, 시트(dialog), 탭바를 누를 때는 닫지 않는다.
  const cabinetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || cabinetRef.current?.contains(target)) return;
      if (
        target.closest(
          "button, a, input, select, textarea, label, dialog, [role=dialog], nav, [role=radiogroup]",
        )
      ) {
        return;
      }
      setOpen(false);
      saveDoor(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const interior = `transition-[filter] duration-500 motion-reduce:transition-none ${
    open ? "brightness-100" : "brightness-75"
  }`;

  return (
    <ZoomContext value={setZoom}>
      <span id="zoom-hint" className="sr-only">
        누르면 이 칸을 크게 봐요
      </span>
      {/* isolate: 3D 원근 효과가 고정된 탭바·버튼 위로 올라오지 않도록 냉장고를 자체 쌓임 맥락에 가둔다. */}
      <div className="relative isolate z-0 flex flex-col gap-3 sm:flex-row">
        <div
          ref={cabinetRef}
          aria-label="냉장고"
          role="group"
          className="flex min-h-[62dvh] flex-1 flex-col overflow-hidden rounded-3xl border-4 border-neutral-300 bg-neutral-100 [perspective:1400px] dark:border-neutral-700 dark:bg-neutral-900"
        >
          {/* 냉장실 */}
          <div
            aria-label="냉장실"
            role="group"
            className="relative flex flex-1 rounded-t-[1.25rem] bg-sky-50/70 dark:bg-sky-950/40"
          >
            <div inert={!open} aria-hidden={!open} className={`flex flex-1 ${interior}`}>
              <div className="flex flex-1 flex-col divide-y-2 divide-sky-200 dark:divide-sky-900">
                <Compartment
                  slot="fridge_top"
                  items={at("fridge_top")}
                  onSelect={onSelect}
                  className="flex-1"
                />
                <Compartment
                  slot="fridge_middle"
                  items={at("fridge_middle")}
                  onSelect={onSelect}
                  className="flex-1"
                />
                <Compartment
                  slot="fridge_bottom"
                  items={at("fridge_bottom")}
                  onSelect={onSelect}
                  className="flex-1"
                />
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
            <Door
              open={open}
              onOpen={openDoor}
              label="냉장실 문 열기"
              className="rounded-t-[1.25rem]"
            >
              <span className="flex flex-col items-start gap-2">
                {summary.today > 0 && (
                  <span className="rounded-full bg-red-500 px-3 py-1 text-sm font-bold text-white shadow">
                    오늘까지 {summary.today}
                  </span>
                )}
                {summary.soon > 0 && (
                  <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950 shadow">
                    3일 안에 {summary.soon}
                  </span>
                )}
                {summary.expired > 0 && (
                  <span className="rounded-full bg-neutral-500 px-3 py-1 text-sm font-bold text-white shadow">
                    기한 지남 {summary.expired}
                  </span>
                )}
              </span>
            </Door>
          </div>

          {/* 냉장실·냉동실 경계 */}
          <div aria-hidden className="h-2 bg-neutral-300 dark:bg-neutral-700" />

          {/* 냉동실 */}
          <div
            aria-label="냉동실"
            role="group"
            className="relative rounded-b-[1.25rem] bg-indigo-50/70 dark:bg-indigo-950/40"
          >
            <div
              inert={!open}
              aria-hidden={!open}
              className={`flex flex-col gap-1 p-1 ${interior}`}
            >
              <FreezerDrawer slot="freezer_upper" items={at("freezer_upper")} onSelect={onSelect} />
              <FreezerDrawer slot="freezer_lower" items={at("freezer_lower")} onSelect={onSelect} />
            </div>
            <Door
              open={open}
              onOpen={openDoor}
              label="냉동실 문 열기"
              className="rounded-b-[1.25rem]"
            >
              {freezerCount > 0 && (
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-sky-800 shadow">
                  ❄ 냉동 {freezerCount}개
                </span>
              )}
            </Door>
          </div>
        </div>

        {/* 팬트리: 문이 없는 선반 */}
        <div
          aria-label="팬트리"
          role="group"
          className="rounded-3xl border-4 border-amber-200 bg-amber-50/60 sm:w-40 dark:border-amber-900 dark:bg-amber-950/30"
        >
          <Compartment slot="pantry" items={at("pantry")} onSelect={onSelect} />
        </div>
      </div>
      {zoom && (
        <CompartmentZoom
          request={zoom}
          items={at(zoom.slot)}
          onClose={closeZoom}
          renderItem={(item) => <ItemToken key={item.id} item={item} onSelect={onSelect} />}
        />
      )}
    </ZoomContext>
  );
}

const DOOR_KEY = "naengteol:door";

/** 한 번 연 문은 이번 방문(탭) 동안 열어 둔다. */
function loadDoor(): boolean {
  try {
    return typeof window !== "undefined" && window.sessionStorage.getItem(DOOR_KEY) === "open";
  } catch {
    return false;
  }
}

function saveDoor(open: boolean) {
  try {
    window.sessionStorage.setItem(DOOR_KEY, open ? "open" : "closed");
  } catch {
    // 저장하지 못하면 다음 방문 때 다시 닫힌 문으로 시작한다.
  }
}

/**
 * 냉장고 문 (기획서 3.2절). 누르면 경첩(오른쪽)을 축으로 약 110° 돌며 0.5초 동안 열린다.
 * 움직임 줄이기 설정이면 회전 대신 페이드.
 */
function Door({
  open,
  onOpen,
  label,
  className = "",
  children,
}: {
  open: boolean;
  onOpen: () => void;
  label: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      aria-hidden={open}
      tabIndex={open ? -1 : 0}
      className={`absolute inset-0 z-10 flex origin-right flex-col items-start justify-between bg-gradient-to-br from-neutral-50 to-neutral-200 p-4 shadow-xl transition-[transform,opacity] duration-500 ease-out [backface-visibility:hidden] motion-reduce:[transform:none] motion-reduce:transition-opacity dark:from-neutral-700 dark:to-neutral-800 ${
        open ? "pointer-events-none [transform:rotateY(110deg)] motion-reduce:opacity-0" : ""
      } ${className}`}
    >
      {children}
      <span
        aria-hidden
        className="absolute top-1/2 right-4 h-20 w-2 -translate-y-1/2 rounded-full bg-neutral-400 dark:bg-neutral-500"
      />
    </button>
  );
}
