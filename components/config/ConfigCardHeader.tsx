"use client";

import { memo } from "react";
import type { KeyConfig } from "@/types/index";

function getSourceBadge(meta?: KeyConfig["sourceMeta"]): string {
  if (!meta) return "手动";
  if (meta.kind === "cc-switch-deeplink") return "CC Switch 链接";
  if (meta.kind === "cc-switch-provider") return "CC Switch 配置";
  return "手动";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const ConfigCardHeader = memo(function ConfigCardHeader({
  item,
  now,
  expanded,
  onToggle,
  compact,
}: {
  item: KeyConfig;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  const lastTestFresh =
    item.lastTest?.status === "success" &&
    now - new Date(item.lastTest.testedAt).getTime() < DAY_MS;
  const statusDotClass = item.lastTest
    ? item.lastTest.status === "success"
      ? lastTestFresh
        ? "bg-green-500"
        : "bg-yellow-500"
      : "bg-red-500"
    : "bg-zinc-400";
  const statusLabel = item.lastTest
    ? item.lastTest.status === "success"
      ? lastTestFresh
        ? "健康"
        : "待检测"
      : "异常"
    : "未检测";
  const expiresAtMs = item.expiresAt ? new Date(item.expiresAt).getTime() : undefined;
  const isExpired = expiresAtMs !== undefined && now > expiresAtMs;
  const isExpiringSoon = expiresAtMs !== undefined && !isExpired && expiresAtMs - now < 7 * DAY_MS;
  const rotatedAtMs = item.rotatedAt ? new Date(item.rotatedAt).getTime() : undefined;
  const shouldRotate = rotatedAtMs !== undefined && !item.expiresAt && now - rotatedAtMs > 90 * DAY_MS;

  if (compact) {
    return (
      <button
        type="button"
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-left text-sm transition-colors hover:text-zinc-950 sm:grid-cols-[minmax(5rem,0.85fr)_auto_minmax(7rem,1fr)_auto] dark:hover:text-zinc-50"
        onClick={onToggle}
        title={expanded ? "收起详情" : "展开详情"}
        aria-label={expanded ? `收起 ${item.name} 详情` : `展开 ${item.name} 详情`}
        aria-expanded={expanded}
      >
        <span className="min-w-0 truncate font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass}`} aria-hidden />
          {statusLabel}
        </span>
        <span className="hidden min-w-0 truncate font-mono text-xs text-zinc-500 sm:block dark:text-zinc-400">
          {item.model || "未设置模型"}
        </span>
        <span
          className={`hidden h-5 w-5 items-center justify-center rounded-md text-zinc-400 transition-transform sm:inline-flex ${expanded ? "" : "-rotate-90"}`}
          aria-hidden
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{item.name}</div>
      <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {getSourceBadge(item.sourceMeta)}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        <span className={`h-2 w-2 rounded-full ${statusDotClass}`} aria-hidden />
        {statusLabel}
      </span>
      {item.expiresAt ? (
        isExpired ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">已过期</span>
        ) : isExpiringSoon ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">即将过期</span>
        ) : null
      ) : null}
      {shouldRotate ? (
        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">建议轮换</span>
      ) : null}
      <button
        type="button"
        className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        onClick={onToggle}
        title={expanded ? "收起详情" : "展开详情"}
        aria-label={expanded ? "收起详情" : "展开详情"}
        aria-expanded={expanded}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`h-3 w-3 transition-transform ${expanded ? "" : "-rotate-90"}`} aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
});
