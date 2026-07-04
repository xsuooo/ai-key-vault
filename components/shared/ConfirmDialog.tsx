"use client";
import { useEffect, useId, useRef } from "react";

export function ConfirmDialog({ title, message, confirmLabel = "确认", onConfirm, onCancel }: { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    cancelRef.current?.focus();
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId}>
        <h3 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p id={descId} className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700" onClick={onCancel}>取消</button>
          <button type="button" className="inline-flex items-center gap-2 rounded-full border border-red-600 bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
