"use client";

import { useEffect, useRef } from "react";

/**
 * 누르면 한 번, 길게 누르면 연속으로 실행되는 버튼 (기획서 4.1절: 수량 스테퍼는 길게 누르면 연속 증감).
 * 0.4초 뒤부터 0.12초마다 반복한다.
 */
function RepeatButton({
  label,
  children,
  onStep,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onStep: () => void;
  disabled?: boolean;
}) {
  const timers = useRef<{ delay?: number; repeat?: number }>({});
  const stepRef = useRef(onStep);
  useEffect(() => {
    stepRef.current = onStep;
  }, [onStep]);

  function stop() {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    timers.current = {};
  }

  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        if (disabled) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        stepRef.current();
        timers.current.delay = window.setTimeout(() => {
          timers.current.repeat = window.setInterval(() => stepRef.current(), 120);
        }, 400);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => {
        // 키보드 사용자는 Enter/Space로 한 칸씩
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          stepRef.current();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="grid size-12 touch-none place-items-center rounded-full bg-neutral-100 text-2xl font-semibold select-none disabled:opacity-40 dark:bg-neutral-800"
    >
      {children}
    </button>
  );
}

export function Stepper({
  value,
  label,
  onDecrement,
  onIncrement,
}: {
  value: string;
  label: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center gap-4" role="group" aria-label={label}>
      <RepeatButton label={`${label} 줄이기`} onStep={onDecrement}>
        −
      </RepeatButton>
      <output aria-live="polite" className="min-w-24 text-center text-2xl font-bold tabular-nums">
        {value}
      </output>
      <RepeatButton label={`${label} 늘리기`} onStep={onIncrement}>
        +
      </RepeatButton>
    </div>
  );
}
