"use client";

import { memo } from "react";
import { FaCopy, FaLink, FaTimesCircle } from "react-icons/fa";
import { useAppStore } from "@/store";
import type { KeyConfig } from "@/types/index";
import { labelClass, btnPrimary, btnGhost, smallBtn, CC_SWITCH_APPS } from "@/components/shared/ui-constants";
// Component

export const CcSwitchPanel = memo(function CcSwitchPanel({
  item,
  onClose,
}: {
  item: KeyConfig;
  onClose: () => void;
}) {
  const ccSwitchTargetApp = useAppStore((s) => s.ccSwitchTargetApp);
  const setCcSwitchTargetApp = useAppStore((s) => s.setCcSwitchTargetApp);
  const importToCcSwitch = useAppStore((s) => s.importToCcSwitch);
  const copyCcSwitchLink = useAppStore((s) => s.copyCcSwitchLink);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">导入到 CC Switch</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              选择目标 App 后，网页会尝试直接唤起本地 CC Switch。
            </p>
          </div>
          <button type="button" className={smallBtn} onClick={onClose}>
            <FaTimesCircle aria-hidden />
            <span>关闭</span>
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
          当前配置：<span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</span>
        </div>

        <label className={labelClass}>目标 App</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CC_SWITCH_APPS.map((app) => {
            const active = ccSwitchTargetApp === app.value;
            return (
              <button
                key={app.value}
                type="button"
                className={
                  active
                    ? "rounded-xl border border-emerald-700 bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                }
                onClick={() => setCcSwitchTargetApp(app.value)}
              >
                {app.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className={btnGhost} onClick={() => copyCcSwitchLink(item, ccSwitchTargetApp)}>
            <FaCopy aria-hidden />
            <span>复制链接</span>
          </button>
          <button type="button" className={btnPrimary} onClick={() => importToCcSwitch(item, ccSwitchTargetApp)}>
            <FaLink aria-hidden />
            <span>立即唤起</span>
          </button>
        </div>
      </div>
    </div>
  );
});
