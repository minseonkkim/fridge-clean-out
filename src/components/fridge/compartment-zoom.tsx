"use client";

import { createContext, use, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import type { CompartmentSlot, FridgeItem } from "@/lib/domain/fridge";
import { SLOT_LABEL } from "@/lib/domain/fridge-view";

export interface ZoomRequest {
  slot: CompartmentSlot;
  /** 확대를 시작한 칸의 화면 위치 (그 자리에서 커지는 연출용) */
  from: DOMRect;
}

export const ZoomContext = createContext<((req: ZoomRequest) => void) | null>(null);

export function useZoom() {
  return use(ZoomContext);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 칸 확대 (기획서 3.2절). 누른 칸의 자리에서 화면을 채우도록 커진다.
 * 닫기 버튼, 브라우저 뒤로가기, 두 손가락 오므리기(핀치)로 돌아간다.
 */
export function CompartmentZoom({
  request,
  items,
  onClose,
  renderItem,
}: {
  request: ZoomRequest;
  items: FridgeItem[];
  onClose: () => void;
  renderItem: (item: FridgeItem) => ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const label = SLOT_LABEL[request.slot];

  // 누른 칸 위치에서 화면 크기로 커지는 연출 (FLIP)
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    closeRef.current?.focus({ preventScroll: true });
    if (typeof panel.animate !== "function") return;
    // 움직임 줄이기: 커지는 대신 제자리에서 페이드
    if (prefersReducedMotion()) {
      panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      return;
    }
    const to = panel.getBoundingClientRect();
    const from = request.from;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = from.width / to.width;
    const sy = from.height / to.height;
    panel.animate(
      [
        {
          transformOrigin: "top left",
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          opacity: 0.6,
        },
        { transformOrigin: "top left", transform: "none", opacity: 1 },
      ],
      { duration: 280, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [request]);

  // 뒤로가기로 닫히도록 기록을 하나 쌓는다.
  useEffect(() => {
    window.history.pushState({ zoom: request.slot }, "");
    const onPop = () => onClose();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [request.slot, onClose]);

  // 핀치: 두 손가락 사이가 처음보다 40% 이상 좁아지면 닫는다.
  const pinchStart = useRef<number | null>(null);
  const distance = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  /** 닫기 버튼으로 닫을 때는 쌓아 둔 기록도 되돌린다. */
  function closeViaUi() {
    if (window.history.state?.zoom === request.slot) window.history.back();
    else onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} 크게 보기`}
      className="fixed inset-0 z-30 bg-black/30 p-3 pb-[calc(env(safe-area-inset-bottom)+5rem)]"
      onKeyDown={(e) => e.key === "Escape" && closeViaUi()}
      onClick={(e) => e.target === e.currentTarget && closeViaUi()}
      onTouchStart={(e) => {
        pinchStart.current = e.touches.length === 2 ? distance(e.touches) : null;
      }}
      onTouchMove={(e) => {
        if (
          pinchStart.current &&
          e.touches.length === 2 &&
          distance(e.touches) < pinchStart.current * 0.6
        ) {
          pinchStart.current = null;
          closeViaUi();
        }
      }}
    >
      <div
        ref={panelRef}
        className="mx-auto flex h-full max-w-md flex-col gap-3 overflow-y-auto rounded-3xl bg-sky-50 p-4 shadow-2xl dark:bg-neutral-900"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{label}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeViaUi}
            className="min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ring-neutral-300"
          >
            닫기
          </button>
        </div>
        {items.length === 0 ? (
          <p className="py-8 text-center text-neutral-500">이 칸은 비어 있어요.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 [&_button]:min-h-20 [&_button]:text-sm">
            {items.map((item) => renderItem(item))}
          </div>
        )}
        <p className="mt-auto text-center text-xs text-neutral-400">
          두 손가락으로 오므리거나 뒤로 가면 돌아가요
        </p>
      </div>
    </div>
  );
}
