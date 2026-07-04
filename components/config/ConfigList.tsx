"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store";
import { ConfigCard } from "./ConfigCard";
import { FaKey, FaList, FaThLarge, FaMinus, FaCompressAlt, FaExpandAlt } from "react-icons/fa";

export function ConfigList() {
  const configs = useAppStore((s) => s.configs);
  const configSearch = useAppStore((s) => s.configSearch);
  const configTagFilter = useAppStore((s) => s.configTagFilter);
  const viewMode = useAppStore((s) => s.viewMode);
  const allExpanded = useAppStore((s) => s.allExpanded);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const setAllExpanded = useAppStore((s) => s.setAllExpanded);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredConfigs = useMemo(() => {
    let result = configs;

    if (configTagFilter.trim()) {
      const tag = configTagFilter.trim();
      result = result.filter((item) => (item.tags || []).includes(tag));
    }

    const q = configSearch.trim().toLowerCase();
    if (q) {
      result = result.filter((item) => {
        const name = item.name?.toLowerCase() || "";
        const baseUrl = item.baseUrl?.toLowerCase() || "";
        const model = item.model?.toLowerCase() || "";
        if (name.includes(q) || baseUrl.includes(q) || model.includes(q)) return true;
        const tags = item.tags;
        if (tags) {
          return tags.some((t) => t.toLowerCase().includes(q));
        }
        return false;
      });
    }

    return result;
  }, [configs, configSearch, configTagFilter]);

  const isSearching = configSearch.trim().length > 0 || configTagFilter.trim().length > 0;

  const viewModes = [
    { mode: "list" as const, icon: FaList, label: "列表" },
    { mode: "grid" as const, icon: FaThLarge, label: "卡片" },
    { mode: "compact" as const, icon: FaMinus, label: "紧凑" },
  ];

  if (configs.length === 0 && !isSearching)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-zinc-400 dark:border-zinc-600">
          <FaKey className="h-7 w-7 text-zinc-400 dark:text-zinc-500" />
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">暂无配置</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          在左侧表单粘贴或手动添加你的第一个 API Key
        </p>
      </div>
    );

  if (isSearching && filteredConfigs.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">没有匹配的配置</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          共 {configs.length} 条配置，无匹配结果
        </p>
      </div>
    );

  return (
    <div>
      {isSearching && (
        <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
          匹配 {filteredConfigs.length} / {configs.length} 条配置
        </p>
      )}

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 shadow-inner dark:border-zinc-700 dark:bg-zinc-800">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                viewMode === mode
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
              title={label}
              aria-label={label}
            >
              <Icon aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setAllExpanded(!allExpanded)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-all duration-150 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
          title={allExpanded ? "全部折叠" : "全部展开"}
          aria-label={allExpanded ? "全部折叠" : "全部展开"}
        >
          {allExpanded ? <FaCompressAlt aria-hidden /> : <FaExpandAlt aria-hidden />}
          <span>{allExpanded ? "全部折叠" : "全部展开"}</span>
        </button>
      </div>

      <ul
        className={
          viewMode === "grid"
            ? "grid grid-cols-[repeat(auto-fit,minmax(min(21rem,100%),1fr))] gap-2.5"
            : viewMode === "compact"
              ? "overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 [&>li+li]:border-t [&>li+li]:border-zinc-100 dark:[&>li+li]:border-zinc-800"
              : "grid gap-2.5"
        }
      >
        {filteredConfigs.map((item) => (
          <ConfigCard key={item.id} item={item} now={now} />
        ))}
      </ul>
    </div>
  );
}
