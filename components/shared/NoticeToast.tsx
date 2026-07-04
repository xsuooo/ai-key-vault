"use client";
import { useAppStore } from "@/store";

export function NoticeToast() {
  const notice = useAppStore((s) => s.notice);
  return (
    <div className={"pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 transition-all duration-300 ease-out " + (notice ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0")} aria-live="polite">
      <div className="max-w-[min(92vw,40rem)] rounded-full border border-zinc-900 bg-zinc-900/95 px-4 py-2 text-sm font-medium text-white shadow-2xl backdrop-blur">
        {notice || " "}
      </div>
    </div>
  );
}
