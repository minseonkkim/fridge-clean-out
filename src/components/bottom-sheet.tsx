"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

/** 이만큼 아래로 끌거나 빠르게 튕기면 닫는다 */
const CLOSE_DISTANCE_PX = 100;
const CLOSE_VELOCITY = 0.6; // px/ms

/** 레이아웃 아래 끝에서 실제로 보이는 영역 아래 끝까지의 거리 (= 키보드가 가린 높이) */
export function keyboardInset(layoutHeight: number, visualHeight: number, visualTop: number) {
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualTop));
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 시트 아래에 고정되는 버튼 영역 (키보드가 올라와도 보이게) */
  footer?: ReactNode;
}

/**
 * 화면 아래에서 올라오는 시트. 네이티브 <dialog>로 포커스 가두기·Esc 닫기를 처리한다.
 * 바깥(배경)을 누르거나, 위쪽 손잡이·제목 줄을 아래로 끌어내리면 닫힌다.
 */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const swipe = useRef<{ id: number; y: number; t: number; dy: number } | null>(null);

  function onSwipeStart(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = { id: e.pointerId, y: e.clientY, t: e.timeStamp, dy: 0 };
    ref.current?.style.setProperty("transition", "none");
  }

  function onSwipeMove(e: PointerEvent<HTMLDivElement>) {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    s.dy = Math.max(0, e.clientY - s.y);
    ref.current?.style.setProperty("transform", `translateY(${s.dy}px)`);
  }

  function onSwipeEnd(e: PointerEvent<HTMLDivElement>) {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    swipe.current = null;
    const velocity = s.dy / Math.max(1, e.timeStamp - s.t);
    const dialog = ref.current;
    if (!dialog) return;
    dialog.style.setProperty("transition", "transform 180ms ease-out");
    dialog.style.removeProperty("transform");
    if (s.dy > CLOSE_DISTANCE_PX || (s.dy > 20 && velocity > CLOSE_VELOCITY)) onClose();
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // iOS 사파리는 키보드가 올라와도 레이아웃이 줄지 않아 아래 붙은 등록 버튼이 가려진다.
  // 실제로 보이는 영역(visualViewport) 아래 끝에 시트를 붙인다.
  useEffect(() => {
    const vv = window.visualViewport;
    const dialog = ref.current;
    if (!open || !vv || !dialog) return;
    const fit = () => {
      const inset = keyboardInset(window.innerHeight, vv.height, vv.offsetTop);
      dialog.style.bottom = inset > 0 ? `${inset}px` : "";
      dialog.style.maxHeight = inset > 0 ? `${Math.floor(vv.height * 0.9)}px` : "";
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
      dialog.style.bottom = "";
      dialog.style.maxHeight = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[90dvh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/40 open:flex open:flex-col dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div
        data-sheet-handle
        onPointerDown={onSwipeStart}
        onPointerMove={onSwipeMove}
        onPointerUp={onSwipeEnd}
        onPointerCancel={onSwipeEnd}
        className="flex cursor-grab touch-none items-center justify-between px-5 pt-3 pb-2 select-none"
      >
        <span
          aria-hidden
          className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-neutral-300"
        />
        <h2 className="pt-2 text-lg font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 grid size-11 place-items-center rounded-full text-2xl text-neutral-500"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
      <div
        className={`flex-1 overflow-y-auto px-5 ${footer ? "pb-4" : "pb-[calc(env(safe-area-inset-bottom)+1rem)]"}`}
      >
        {children}
      </div>
      {footer && (
        <div className="border-t border-neutral-200 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] dark:border-neutral-800">
          {footer}
        </div>
      )}
    </dialog>
  );
}
