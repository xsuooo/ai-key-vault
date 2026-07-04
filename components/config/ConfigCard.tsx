"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/store";
import type { KeyConfig } from "@/types/index";
import { ConfigCardHeader } from "./ConfigCardHeader";
import { ConfigCardTags } from "./ConfigCardTags";
import { ConfigCardDetails } from "./ConfigCardDetails";
import { ConfigCardStatus } from "./ConfigCardStatus";
import { ConfigCardActions } from "./ConfigCardActions";
import { CcSwitchPanel } from "./CcSwitchPanel";
import { isCompactConfigCardMode } from "./config-card-view-mode";

export const ConfigCard = memo(function ConfigCard({ item, now }: { item: KeyConfig; now: number }) {
  const editingId = useAppStore((s) => s.editingId);
  const ccSwitchDialogId = useAppStore((s) => s.ccSwitchDialogId);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const toggleSelect = useAppStore((s) => s.toggleSelect);
  const allExpanded = useAppStore((s) => s.allExpanded);
  const viewMode = useAppStore((s) => s.viewMode);

  const isEditing = editingId === item.id;
  const isSelected = selectedIds.includes(item.id);
  const isCcSwitchOpen = ccSwitchDialogId === item.id;
  const isCompact = isCompactConfigCardMode(viewMode);
  const [expanded, setExpanded] = useState(allExpanded);

  useEffect(() => {
    setExpanded(allExpanded);
  }, [allExpanded]);

  const cardClasses =
    isCompact
      ? `px-3 py-2.5 transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
          isSelected ? "bg-emerald-50/70 dark:bg-emerald-950/30" : ""
        }`
      : `rounded-xl border p-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md ${
          isSelected
            ? "border-emerald-400 bg-emerald-50/40 dark:border-emerald-600 dark:bg-emerald-950/40 ring-2 ring-emerald-200 dark:ring-emerald-800"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`;

  return (
    <>
      <li className={`animate-slide-in-up ${cardClasses}`}>
        {isEditing ? (
          <ConfigCardActions item={item} />
        ) : isCompact ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <label className="flex cursor-pointer items-center" title="选中此配置" aria-label="选中此配置">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(item.id)}
                  className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
                />
              </label>
              <ConfigCardHeader
                item={item}
                now={now}
                expanded={expanded}
                onToggle={() => setExpanded((current) => !current)}
                compact
              />
              <div className="col-start-2 sm:col-start-auto">
                <ConfigCardActions item={item} compact />
              </div>
            </div>
            {expanded ? (
              <div className="animate-soft-enter rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <ConfigCardDetails item={item} />
                  <ConfigCardStatus item={item} />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <label className="mt-0.5 flex cursor-pointer items-center" title="选中此配置" aria-label="选中此配置">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(item.id)}
                className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
              />
            </label>
            <div className="min-w-0 flex-1">
              <ConfigCardHeader
                item={item}
                now={now}
                expanded={expanded}
                onToggle={() => setExpanded((current) => !current)}
              />
              {expanded && viewMode !== "compact" && (
                <>
                  <ConfigCardTags item={item} />
                  <ConfigCardDetails item={item} />
                  <ConfigCardStatus item={item} />
                </>
              )}
              <ConfigCardActions item={item} />
            </div>
          </div>
        )}
      </li>

      {isCcSwitchOpen
        ? createPortal(
            <CcSwitchPanel item={item} onClose={() => useAppStore.getState().closeCcSwitchDialog()} />,
            document.body,
          )
        : null}
    </>
  );
});
