"use client";

import { useLayoutEffect, useRef } from "react";

export interface FlyAwayRequest {
  id: number;
  kind: "plate" | "trash";
  name: string;
  /** 재료가 있던 화면 위치 */
  from: { x: number; y: number; width: number; height: number };
}

/**
 * 다 씀: 재료가 접시로 날아간다 / 버림: 휴지통으로 떨어진다 (기획서 3.2절).
 * 움직임 줄이기 설정이면 그리지 않는다.
 */
export function FlyAway({ request, onDone }: { request: FlyAwayRequest; onDone: () => void }) {
  const itemRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  // 부모가 렌더될 때마다 onDone이 새로 만들어져도 애니메이션을 다시 시작하지 않도록 ref로 들고 있는다.
  const doneRef = useRef(onDone);
  useLayoutEffect(() => {
    doneRef.current = onDone;
  });

  useLayoutEffect(() => {
    const el = itemRef.current;
    const target = targetRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!el || !target || reduce || typeof el.animate !== "function") {
      doneRef.current();
      return;
    }
    const t = target.getBoundingClientRect();
    const dx = t.left + t.width / 2 - (request.from.x + request.from.width / 2);
    const dy = t.top + t.height / 2 - (request.from.y + request.from.height / 2);
    const frames =
      request.kind === "plate"
        ? [
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 80}px) scale(0.8)`, opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
          ]
        : [
            { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
            { transform: `translate(${dx * 0.3}px, -20px) rotate(-15deg)`, opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(160deg) scale(0.4)`, opacity: 0.1 },
          ];
    const anim = el.animate(frames, {
      duration: 750,
      easing:
        request.kind === "plate"
          ? "cubic-bezier(0.3, 0.6, 0.4, 1)"
          : "cubic-bezier(0.5, 0, 0.9, 0.6)",
      fill: "forwards",
    });
    anim.onfinish = () => doneRef.current();
    return () => anim.cancel();
  }, [request]);

  return (
    <div aria-hidden data-flyaway={request.kind} className="pointer-events-none fixed inset-0 z-50">
      <div
        ref={itemRef}
        className="absolute flex items-center justify-center rounded-xl bg-white px-2 text-xs font-semibold shadow-lg ring-2 ring-emerald-400 dark:bg-neutral-800"
        style={{
          left: request.from.x,
          top: request.from.y,
          width: request.from.width,
          height: request.from.height,
        }}
      >
        {request.name}
      </div>
      <div
        ref={targetRef}
        className={`absolute bottom-28 text-5xl ${request.kind === "plate" ? "left-8" : "right-8"}`}
      >
        {request.kind === "plate" ? "🍽" : "🗑"}
      </div>
    </div>
  );
}
