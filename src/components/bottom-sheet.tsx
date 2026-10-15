"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
 * 바깥(배경)을 누르면 닫힌다.
 */
export function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
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
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
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
      <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
      {footer && (
        <div className="border-t border-neutral-200 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] dark:border-neutral-800">
          {footer}
        </div>
      )}
    </dialog>
  );
}
