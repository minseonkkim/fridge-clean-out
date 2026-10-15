"use client";

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** 세그먼트 컨트롤 (라디오 그룹) */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-lg text-sm font-semibold transition-colors ${
              checked
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white"
                : "text-neutral-500"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
