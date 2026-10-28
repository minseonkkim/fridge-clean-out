"use client";

import { useEffect, useState } from "react";
import { UiArt } from "@/components/ui-art";

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 조리 단계 타이머. 누르면 시작·일시정지, 끝나면 알리고 진동한다. */
export function StepTimer({ seconds }: { seconds: number }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const done = left === 0;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setRunning(false);
          navigator.vibrate?.([200, 100, 200]);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  function toggle() {
    if (done) {
      setLeft(seconds);
      setRunning(true);
    } else {
      setRunning((r) => !r);
    }
  }

  const label = done
    ? "타이머 다시 시작"
    : running
      ? `타이머 일시정지, ${formatSeconds(left)} 남음`
      : `타이머 시작, ${formatSeconds(left)}`;

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className={`min-h-11 rounded-full px-4 text-sm font-semibold tabular-nums ${
          done
            ? "bg-red-600 text-white"
            : running
              ? "bg-emerald-700 text-white"
              : "bg-neutral-100 dark:bg-neutral-800"
        }`}
      >
        <UiArt name="timer" className="mr-1 size-5 align-[-4px]" />
        {done ? "다 됐어요!" : formatSeconds(left)}
      </button>
      {!running && !done && left !== seconds && (
        <button
          type="button"
          onClick={() => setLeft(seconds)}
          className="min-h-11 px-2 text-xs text-neutral-500 underline underline-offset-2 dark:text-neutral-400"
        >
          처음부터
        </button>
      )}
      <span aria-live="polite" className="sr-only">
        {done ? "타이머가 끝났어요" : ""}
      </span>
    </div>
  );
}
