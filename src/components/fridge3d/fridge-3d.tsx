"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CompartmentZoom, type ZoomRequest } from "@/components/fridge/compartment-zoom";
import {
  DragContext,
  LONG_PRESS_MS,
  MOVE_TOLERANCE_PX,
  slotAt,
  useDrag,
  type DragApi,
  type DragState,
} from "@/components/fridge/drag";
import { UiArt } from "@/components/ui-art";
import { INGREDIENT_BY_ID } from "@/data/ingredients";
import { dDayLabel, daysLeft, freshness, todayIso, type Freshness } from "@/lib/domain/expiry";
import { itemDisplayName, type CompartmentSlot, type FridgeItem } from "@/lib/domain/fridge";
import { SLOT_LABEL, groupBySlot, urgencySummary } from "@/lib/domain/fridge-view";
import { UNIT_LABEL } from "@/lib/domain/types";
import { Intro, introSeen, markIntroSeen } from "./intro";
import { renderDpr } from "./layout";
import { Overlay } from "./overlay";
import {
  CameraRig,
  FridgeWorld,
  OverlaySync,
  defaultGoal,
  zoneGoal,
  type CameraGoal,
  type DrawerSlot,
  type WorldState,
} from "./world";

const lookup = (id: string) => INGREDIENT_BY_ID.get(id);
const FOV = 36;

/** 드래그 중 자동 스크롤: 위 끝 영역, 아래 끝 영역(탭 바 포함), 한 프레임 최대 이동 px */
const AUTOSCROLL_TOP_PX = 80;
const AUTOSCROLL_BOTTOM_PX = 150;
const AUTOSCROLL_MAX = 14;

const OverlayContext = createContext<Overlay | null>(null);
const HighlightContext = createContext<ReadonlySet<string> | null>(null);
const SelectContext = createContext<(item: FridgeItem) => void>(() => {});

/** DOM 요소를 3D 물체에 붙인다 */
function useAnchor(key: string, parent?: string) {
  const overlay = use(OverlayContext);
  return useCallback(
    (el: HTMLElement | null) => overlay?.setElement(key, el, parent),
    [overlay, key, parent],
  );
}

const TONE: Record<Freshness, string> = {
  fresh: "bg-white/95 ring-neutral-300 dark:bg-neutral-800/95 dark:ring-neutral-600",
  soon: "bg-amber-50/95 ring-amber-400 dark:bg-amber-950/95",
  urgent: "bg-red-50/95 ring-red-500 dark:bg-red-950/95",
  expired:
    "bg-neutral-200/95 ring-neutral-400 text-neutral-600 dark:bg-neutral-800/95 dark:text-neutral-400",
};

/**
 * 재료 이름표. 3D 재료 바로 앞에 붙어 다니는 진짜 버튼이라
 * 누르기·길게 눌러 옮기기·화면 읽기가 모두 이 버튼으로 동작한다.
 */
function ItemChip({
  item,
  slot,
  anchored = true,
  onPop,
}: {
  item: FridgeItem;
  slot: CompartmentSlot;
  /** 3D 재료를 따라다니는지 (확대 목록 안에서는 false) */
  anchored?: boolean;
  onPop?: (id: string) => void;
}) {
  const left = daysLeft(item.expiresAt, todayIso());
  const level = freshness(left);
  const name = itemDisplayName(item, lookup);
  const qty = `${Math.round(item.quantity * 100) / 100}${UNIT_LABEL[item.unit]}`;
  const [popping, setPopping] = useState(false);
  const drag = useDrag();
  const dragging = drag?.drag?.item.id === item.id;
  const highlight = use(HighlightContext);
  const lit = highlight ? highlight.has(item.id) : null;
  const onSelect = use(SelectContext);
  const anchor = useAnchor(`item:${item.id}`, `slot:${slot}`);

  const press = useRef<{
    timer?: number;
    x: number;
    y: number;
    started: boolean;
    suppressClick: boolean;
  }>({
    x: 0,
    y: 0,
    started: false,
    suppressClick: false,
  });
  const clearTimer = () => window.clearTimeout(press.current.timer);

  return (
    <div
      ref={anchored ? anchor : undefined}
      // 뒷줄 재료(head)는 이름표를 재료 위에 단다
      className={
        anchored ? "absolute top-0 left-0 z-10 data-[anchor=head]:-translate-y-full" : "contents"
      }
    >
      <button
        type="button"
        onPointerDown={(e) => {
          if (!drag || e.button !== 0) return;
          const el = e.currentTarget;
          const pointerId = e.pointerId;
          press.current = { x: e.clientX, y: e.clientY, started: false, suppressClick: false };
          press.current.timer = window.setTimeout(() => {
            press.current.started = true;
            press.current.suppressClick = true;
            try {
              el.setPointerCapture(pointerId);
            } catch {
              // 이미 손가락을 뗐으면 무시
            }
            navigator.vibrate?.(30);
            drag.start(item, slot, press.current.x, press.current.y);
          }, LONG_PRESS_MS);
        }}
        onPointerMove={(e) => {
          if (press.current.started) drag?.move(e.clientX, e.clientY);
          else if (
            Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > MOVE_TOLERANCE_PX
          )
            clearTimer();
        }}
        onPointerUp={() => {
          clearTimer();
          if (press.current.started) {
            press.current.started = false;
            drag?.end();
          }
        }}
        onPointerCancel={() => {
          clearTimer();
          if (press.current.started) {
            press.current.started = false;
            drag?.cancel();
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (press.current.suppressClick) {
            press.current.suppressClick = false;
            return;
          }
          setPopping(true);
          onPop?.(item.id);
          onSelect(item);
        }}
        onAnimationEnd={() => setPopping(false)}
        aria-label={`${name} ${qty} ${dDayLabel(left)}`}
        aria-describedby="drag-hint"
        data-item-id={item.id}
        data-freshness={level}
        data-highlight={lit === null ? undefined : lit ? "on" : "off"}
        data-popping={popping || undefined}
        className={`flex min-h-11 min-w-11 flex-col items-center justify-center select-none [-webkit-touch-callout:none] ${anchored ? "-translate-x-1/2 -translate-y-2" : ""} ${
          popping
            ? "animate-[item-pop_260ms_ease-out] motion-reduce:animate-none"
            : level === "urgent"
              ? "animate-[item-wobble_1.6s_ease-in-out_infinite] motion-reduce:animate-none"
              : ""
        } ${dragging ? "opacity-40" : ""} ${lit === false ? "opacity-40 saturate-50" : ""}`}
      >
        {/* 누르는 영역은 44px 이상이지만, 보이는 것은 재료 앞에 붙은 작은 가격표다 */}
        <span
          className={`relative inline-flex max-w-24 items-center gap-1 overflow-hidden rounded-full px-2 py-0.5 text-[10px] leading-tight font-semibold shadow-sm ring-1 ${TONE[level]} ${
            lit === true ? "ring-3 ring-emerald-500" : ""
          }`}
        >
          <span className="truncate">{name}</span>
          <span className="shrink-0 font-normal text-neutral-600 dark:text-neutral-300">
            <span className="sr-only">{qty} · </span>
            {dDayLabel(left)}
          </span>
          {item.storage === "freezer" && (
            <span
              aria-hidden
              data-frost
              className="pointer-events-none absolute inset-0 rounded-full bg-[linear-gradient(160deg,rgba(224,242,254,0.6),rgba(255,255,255,0.1))] ring-1 ring-sky-300 ring-inset"
            />
          )}
          {level === "expired" && (
            <span aria-hidden data-fly-icon className="-mr-1 shrink-0">
              <UiArt name="fly" className="size-3" />
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/** 드래그 중 칸 강조: 놓을 수 있는 칸은 점선, 손가락 아래 칸은 진하게 */
function dropClass(slot: CompartmentSlot, drag: DragApi | null): string {
  const d = drag?.drag;
  if (!d || d.from === slot) return "";
  return d.over === slot
    ? "outline-3 outline-emerald-600 bg-emerald-200/40"
    : "outline-2 outline-dashed outline-emerald-400";
}

/** 칸 영역 (3D 칸의 화면 위치를 따라간다). 이름을 누르면 그 칸으로 다가간다. */
function SlotRegion({
  slot,
  items,
  onZoom,
  onPop,
  showItems = true,
}: {
  slot: CompartmentSlot;
  items: FridgeItem[];
  onZoom: (slot: CompartmentSlot) => void;
  onPop: (id: string) => void;
  showItems?: boolean;
}) {
  const id = `compartment-${slot}`;
  const drag = useDrag();
  const anchor = useAnchor(`slot:${slot}`);
  return (
    <section
      ref={anchor}
      aria-labelledby={id}
      data-slot={slot}
      className={`absolute top-0 left-0 rounded-xl transition-colors ${drag?.drag ? "pointer-events-auto" : "pointer-events-none"} ${dropClass(slot, drag)}`}
    >
      <h3 id={id} className="absolute -top-1 left-1 z-20 -translate-y-full">
        <button
          type="button"
          title="크게 보기"
          aria-describedby="zoom-hint"
          onClick={() => onZoom(slot)}
          className="flex min-h-11 items-end pb-0.5 text-[11px] font-bold text-sky-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)] dark:text-sky-100 dark:drop-shadow-[0_1px_0_rgba(0,0,0,0.9)]"
        >
          <span className="rounded-full bg-white/85 px-2 py-0.5 underline decoration-dotted underline-offset-2 shadow-sm dark:bg-neutral-900/85">
            {SLOT_LABEL[slot]}
          </span>
        </button>
      </h3>
      {showItems &&
        items.map((item) => <ItemChip key={item.id} item={item} slot={slot} onPop={onPop} />)}
    </section>
  );
}

/** 냉동실 서랍: 앞면 버튼을 누르면 3D 서랍이 당겨 나오고 안의 재료가 보인다 */
function DrawerRegion({
  slot,
  items,
  open,
  onToggle,
  onPop,
}: {
  slot: DrawerSlot;
  items: FridgeItem[];
  open: boolean;
  onToggle: () => void;
  onPop: (id: string) => void;
}) {
  const id = `compartment-${slot}`;
  const drag = useDrag();
  const region = useAnchor(`slot:${slot}`);
  const front = useAnchor(`drawer:${slot}`, `slot:${slot}`);
  const preview = items
    .slice(0, 2)
    .map((i) => itemDisplayName(i, lookup))
    .join(", ");
  return (
    <section
      ref={region}
      aria-labelledby={id}
      data-slot={slot}
      className={`absolute top-0 left-0 rounded-xl transition-colors ${drag?.drag ? "pointer-events-auto" : "pointer-events-none"} ${dropClass(slot, drag)}`}
    >
      <button
        ref={front}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-inside`}
        onClick={onToggle}
        className="absolute top-0 left-0 flex min-h-11 items-center gap-2 overflow-hidden rounded-lg px-2 text-left"
      >
        <span className="flex-1 rounded-lg bg-white/85 px-2 py-0.5 shadow-sm dark:bg-neutral-900/85">
          <h3 id={id} className="text-[11px] font-bold text-indigo-900 dark:text-indigo-100">
            {SLOT_LABEL[slot]}
          </h3>
          <span className="block truncate text-[11px] text-neutral-700 dark:text-neutral-300">
            {items.length === 0
              ? "비어 있어요"
              : `${preview}${items.length > 2 ? ` 외 ${items.length - 2}개` : ""}`}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white">
          {open ? "서랍 닫기" : "서랍 열기"}
        </span>
      </button>
      <div id={`${id}-inside`} hidden={!open}>
        {open &&
          (items.length === 0 ? (
            <p className="absolute top-1/3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-900/85 dark:text-neutral-300">
              서랍이 비어 있어요
            </p>
          ) : (
            items.map((item) => <ItemChip key={item.id} item={item} slot={slot} onPop={onPop} />)
          ))}
      </div>
    </section>
  );
}

/** 닫힌 문 위에 겹치는 버튼 (배지가 붙어 있다) */
function DoorButton({
  kind,
  open,
  onOpen,
  children,
}: {
  kind: "fridge" | "freezer";
  open: boolean;
  onOpen: () => void;
  children?: React.ReactNode;
}) {
  const anchor = useAnchor(`door:${kind}`);
  return (
    <button
      ref={anchor}
      type="button"
      onClick={onOpen}
      aria-label={kind === "fridge" ? "냉장실 문 열기" : "냉동실 문 열기"}
      aria-hidden={open}
      tabIndex={open ? -1 : 0}
      className={`absolute top-0 left-0 z-10 flex flex-col items-start justify-start gap-2 p-4 transition-opacity duration-300 ${
        open ? "invisible opacity-0" : ""
      }`}
    >
      {children}
    </button>
  );
}

const DOOR_KEY = "naengteol:door";

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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function usePrefersDark() {
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}

/** 카메라 목표: 칸 확대·서랍 열기면 그 칸으로, 아니면 냉장고 전체 */
function Director({
  focus,
  overlay,
  instant,
}: {
  focus: { zone: string; from: "front" | "above" } | null;
  overlay: Overlay;
  instant: boolean;
}) {
  const size = useThree((s) => s.size);
  const [goal, setGoal] = useState<CameraGoal>(() => defaultGoal(size.width / size.height, FOV));
  const aspect = size.width / Math.max(1, size.height);
  useEffect(() => {
    const zone = focus ? overlay.object(focus.zone) : null;
    // 서랍이 다 나온 뒤의 위치를 보도록 조금 늦게 잡는다
    const id = window.setTimeout(
      () => setGoal(zone ? zoneGoal(zone, aspect, FOV, focus!.from) : defaultGoal(aspect, FOV)),
      focus?.from === "above" && !instant ? 250 : 0,
    );
    return () => window.clearTimeout(id);
  }, [focus, overlay, aspect, instant]);
  return (
    <CameraRig
      goal={goal}
      instant={instant}
      focusKey={focus ? `${focus.zone}:${focus.from}` : "default"}
    />
  );
}

/**
 * 3D 냉장고 (기획서 3장, 결정 D1 개정).
 * - 부엌에 선 냉장고: 냉장실(유리 선반 3단·채소칸·문 선반), 냉동실(서랍 2개), 위 바구니(팬트리)
 * - 문은 경첩으로 돌며 열리고, 서랍은 앞으로 당겨 나온다
 * - 재료는 장난감 같은 3D 모델로 칸에 놓이고, 앞에 붙은 이름표(진짜 버튼)로 고르고 옮긴다
 */
export default function Fridge3D({
  items,
  onSelect,
  onMove,
  highlight = null,
}: {
  items: FridgeItem[];
  onSelect?: (item: FridgeItem) => void;
  onMove?: (item: FridgeItem, to: CompartmentSlot) => void;
  highlight?: ReadonlySet<string> | null;
}) {
  const overlay = useMemo(() => new Overlay(), []);
  const reducedMotion = usePrefersReducedMotion();
  const dark = usePrefersDark();
  const bySlot = useMemo(() => {
    const map = new Map<CompartmentSlot, FridgeItem[]>();
    for (const s of groupBySlot(items, lookup)) map.set(s.slot, s.items);
    return map;
  }, [items]);
  const at = (slot: CompartmentSlot) => bySlot.get(slot) ?? [];

  // 3D 장면은 늦게 내려받으므로, 강조(식단에서 넘어옴)가 이미 있는 채로 처음 나타날 수 있다
  const [open, setOpen] = useState(() => loadDoor() || Boolean(highlight));
  const [prevHighlight, setPrevHighlight] = useState(highlight);
  if (highlight !== prevHighlight) {
    setPrevHighlight(highlight);
    if (highlight) setOpen(true);
  }
  const doorOpen = open || Boolean(highlight);
  const [drawers, setDrawers] = useState<Record<DrawerSlot, boolean>>({
    freezer_upper: false,
    freezer_lower: false,
  });
  const [zoom, setZoom] = useState<ZoomRequest | null>(null);
  const closeZoom = useCallback(() => setZoom(null), []);
  const [poppingId, setPoppingId] = useState<string | null>(null);
  const [intro, setIntro] = useState(() => !introSeen() && !reducedMotion);

  const openDoor = useCallback(() => {
    setOpen(true);
    saveDoor(true);
  }, []);

  const focus = useMemo(() => {
    if (zoom) return { zone: `slot:${zoom.slot}`, from: "front" as const };
    // 서랍을 열면 냉동실 전체를 위에서 내려다본다 (두 서랍이 함께 보이게)
    const opened = drawers.freezer_upper || drawers.freezer_lower;
    return opened && doorOpen ? { zone: "zone:freezer", from: "above" as const } : null;
  }, [zoom, drawers, doorOpen]);

  // 드래그 (기획서 3.2절): 길게 누른 재료를 다른 칸에 놓으면 옮긴다.
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dragApi = useMemo<DragApi>(
    () => ({
      drag,
      start(item, from, x, y) {
        const next = { item, from, x, y, over: slotAt(x, y) };
        dragRef.current = next;
        setDrag(next);
      },
      move(x, y) {
        if (!dragRef.current) return;
        const next = { ...dragRef.current, x, y, over: slotAt(x, y) };
        dragRef.current = next;
        setDrag(next);
      },
      end() {
        const d = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (d?.over && d.over !== d.from) onMove?.(d.item, d.over);
      },
      cancel() {
        dragRef.current = null;
        setDrag(null);
      },
    }),
    [drag, onMove],
  );

  // 손가락이 화면 위·아래 끝에 가까우면 저절로 스크롤해 멀리 있는 칸에도 놓을 수 있게 한다.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let frame = requestAnimationFrame(function step() {
      const d = dragRef.current;
      if (d) {
        const bottomZone = window.innerHeight - AUTOSCROLL_BOTTOM_PX;
        const speed =
          d.y < AUTOSCROLL_TOP_PX
            ? -Math.ceil(((AUTOSCROLL_TOP_PX - d.y) / AUTOSCROLL_TOP_PX) * AUTOSCROLL_MAX)
            : d.y > bottomZone
              ? Math.ceil(((d.y - bottomZone) / AUTOSCROLL_BOTTOM_PX) * AUTOSCROLL_MAX)
              : 0;
        if (speed !== 0) {
          const before = window.scrollY;
          window.scrollBy(0, speed);
          if (window.scrollY !== before) {
            const next = { ...d, over: slotAt(d.x, d.y) };
            dragRef.current = next;
            setDrag(next);
          }
        }
      }
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  useEffect(() => {
    if (!drag) return;
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [drag]);

  // 열린 문은 냉장고 바깥의 빈 곳을 누르면 닫힌다 (기획서 3.2절).
  const cabinetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!doorOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target || cabinetRef.current?.contains(target)) return;
      if (
        target.closest(
          "button, a, input, select, textarea, label, dialog, [role=dialog], nav, [role=radiogroup]",
        )
      )
        return;
      setOpen(false);
      saveDoor(false);
      setDrawers({ freezer_upper: false, freezer_lower: false });
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [doorOpen]);

  const pop = useCallback((id: string) => {
    setPoppingId(null);
    requestAnimationFrame(() => setPoppingId(id));
  }, []);
  const select = useCallback((item: FridgeItem) => onSelect?.(item), [onSelect]);

  const world: WorldState = {
    bySlot,
    doorOpen,
    drawers,
    highlight,
    poppingId,
    reducedMotion,
    dark,
  };
  const summary = urgencySummary(items, todayIso());
  const freezerCount = at("freezer_upper").length + at("freezer_lower").length;
  const finishIntro = useCallback(() => {
    markIntroSeen();
    setIntro(false);
    openDoor();
  }, [openDoor]);

  return (
    <OverlayContext value={overlay}>
      <DragContext value={dragApi}>
        <HighlightContext value={highlight}>
          <SelectContext value={select}>
            <span id="drag-hint" className="sr-only">
              길게 눌러 다른 칸으로 옮길 수 있어요. 재료 시트에서 보관 방식을 바꿔도 돼요.
            </span>
            <span id="zoom-hint" className="sr-only">
              누르면 이 칸으로 다가가 크게 봐요
            </span>
            <div
              ref={cabinetRef}
              role="group"
              aria-label="냉장고"
              data-fridge-3d
              data-door={doorOpen ? "open" : "closed"}
              data-motion={reducedMotion ? "reduced" : "full"}
              className="relative isolate z-0 h-[68dvh] min-h-[460px] overflow-hidden rounded-3xl [contain:layout_paint] bg-gradient-to-b from-amber-50 to-orange-100 dark:from-neutral-900 dark:to-neutral-950"
            >
              <Canvas
                flat
                frameloop="demand"
                // 페이지를 스크롤할 때마다 캔버스를 다시 재고 다시 그리지 않는다 (오버레이는 캔버스 기준이라 필요 없다)
                resize={{ scroll: false }}
                dpr={renderDpr()}
                camera={{ fov: FOV, position: [0.15, 2.6, 9], near: 0.1, far: 60 }}
                gl={{ antialias: true, powerPreference: "low-power" }}
                className="absolute! inset-0"
                aria-hidden
              >
                <color attach="background" args={[dark ? "#14161a" : "#f6efe4"]} />
                <FridgeWorld state={world} overlay={overlay} />
                <Director focus={focus} overlay={overlay} instant={reducedMotion} />
                <OverlaySync overlay={overlay} />
              </Canvas>
              <div className="pointer-events-none absolute inset-0 [will-change:transform] [&_button]:pointer-events-auto">
                {/* 냉장실 이름표가 바로 아래 냉동 서랍 버튼보다 위에 오게 */}
                <div role="group" aria-label="냉장실" className="relative z-20">
                  <div
                    inert={!doorOpen}
                    aria-hidden={!doorOpen}
                    className={doorOpen ? "" : "invisible"}
                  >
                    {(
                      [
                        "fridge_top",
                        "fridge_middle",
                        "fridge_bottom",
                        "veg_drawer",
                        "fridge_door",
                      ] as const
                    ).map((s) => (
                      <SlotRegion
                        key={s}
                        slot={s}
                        items={at(s)}
                        onZoom={(slot) => setZoom({ slot })}
                        onPop={pop}
                      />
                    ))}
                  </div>
                  <DoorButton kind="fridge" open={doorOpen} onOpen={openDoor}>
                    {summary.today > 0 && (
                      <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-bold text-white shadow">
                        오늘까지 {summary.today}
                      </span>
                    )}
                    {summary.soon > 0 && (
                      <span className="rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950 shadow">
                        3일 안에 {summary.soon}
                      </span>
                    )}
                    {summary.expired > 0 && (
                      <span className="rounded-full bg-neutral-600 px-3 py-1 text-sm font-bold text-white shadow">
                        기한 지남 {summary.expired}
                      </span>
                    )}
                  </DoorButton>
                </div>
                <div role="group" aria-label="냉동실">
                  <div
                    inert={!doorOpen}
                    aria-hidden={!doorOpen}
                    className={doorOpen ? "" : "invisible"}
                  >
                    {(["freezer_upper", "freezer_lower"] as const).map((s) => (
                      <DrawerRegion
                        key={s}
                        slot={s}
                        items={at(s)}
                        open={drawers[s]}
                        onToggle={() => setDrawers((d) => ({ ...d, [s]: !d[s] }))}
                        onPop={pop}
                      />
                    ))}
                  </div>
                  <DoorButton kind="freezer" open={doorOpen} onOpen={openDoor}>
                    {freezerCount > 0 && (
                      <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-sky-800 shadow">
                        <UiArt name="snowflake" className="mr-1 size-3.5 align-[-2px]" />
                        냉동 {freezerCount}개
                      </span>
                    )}
                  </DoorButton>
                </div>
                <div role="group" aria-label="팬트리">
                  <SlotRegion
                    slot="pantry"
                    items={at("pantry")}
                    onZoom={(slot) => setZoom({ slot })}
                    onPop={pop}
                  />
                </div>
              </div>
            </div>
            {zoom && (
              <CompartmentZoom
                request={zoom}
                items={at(zoom.slot)}
                onClose={closeZoom}
                renderItem={(item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    slot={zoom.slot}
                    anchored={false}
                    onPop={pop}
                  />
                )}
              />
            )}
            {drag && (
              <div
                aria-hidden
                className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-2xl ring-2 ring-emerald-500 dark:bg-neutral-800"
                style={{ left: drag.x, top: drag.y }}
              >
                {itemDisplayName(drag.item, lookup)}
                {drag.over && drag.over !== drag.from && (
                  <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-400">
                    → {SLOT_LABEL[drag.over]}
                  </span>
                )}
              </div>
            )}
            {intro && <Intro world={{ ...world, doorOpen: false }} onDone={finishIntro} />}
          </SelectContext>
        </HighlightContext>
      </DragContext>
    </OverlayContext>
  );
}
