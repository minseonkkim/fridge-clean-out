"use client";

import type { ReactNode } from "react";

/** 켜고 끄는 선택 칩 */
export function Chip({
  selected,
  onClick,
  children,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={`min-h-11 rounded-full px-4 text-sm font-semibold ring-1 ${
        selected
          ? "bg-emerald-700 text-white ring-emerald-600"
          : "bg-white text-neutral-700 ring-neutral-300 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700"
      }`}
    >
      {children}
    </button>
  );
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
