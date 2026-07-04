"use client";
import { useState, useRef, useEffect } from "react";
import type { ExportType, CcSwitchAction } from "@/types/index";
import { FaFileExport } from "react-icons/fa";
import { btnGhost, smallBtn } from "@/components/shared/ui-constants";

export function ExportMenu({
  onExport,
  extraActions = [],
  label = "导出",
  size = "default",
  triggerClassName
}: {
  onExport: (type: ExportType) => void;
  extraActions?: CcSwitchAction[];
  label?: string;
  size?: "default" | "small";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuItemClass = "flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm transition";
  const triggerClass =
    triggerClassName || (size === "small" ? `${smallBtn} list-none` : `${btnGhost} list-none`);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleArrowKeys(event: KeyboardEvent) {
      if (!menuRef.current) return;
      const items = Array.from(menuRef.current.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
      if (items.length === 0) return;
      const current = document.activeElement;
      const index = items.indexOf(current as HTMLElement);

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = index < items.length - 1 ? index + 1 : 0;
        items[next]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const prev = index > 0 ? index - 1 : items.length - 1;
        items[prev]?.focus();
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleArrowKeys);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleArrowKeys);
    };
  }, [open]);

  function handle(type: ExportType) {
    onExport(type);
    setOpen(false);
  }

  function handleExtra(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className={`${triggerClass} cursor-pointer [&::-webkit-details-marker]:hidden`}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <FaFileExport aria-hidden />
        <span>{label}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-56 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
            常规导出
          </div>
          <button
            type="button"
            role="menuitem"
            className={`${menuItemClass} text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
            onClick={() => handle("md")}
          >
            导出 .md
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuItemClass} text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
            onClick={() => handle("txt")}
          >
            导出 .txt
          </button>
          {extraActions.length > 0 ? (
            <>
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
              <div className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-500 dark:text-zinc-500">
                CC Switch
              </div>
            </>
          ) : null}
          {extraActions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={`${menuItemClass} ${
                action.tone === "accent"
                  ? "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
              onClick={() => handleExtra(action.onClick)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
