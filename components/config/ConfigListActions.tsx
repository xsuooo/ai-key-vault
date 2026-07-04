"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { FaBolt, FaChartBar, FaCopy, FaDownload, FaEllipsisV, FaMagic, FaSearch, FaSpinner, FaTimes, FaTimesCircle, FaTrashAlt, FaUpload } from "react-icons/fa";
import Link from "next/link";
import { useAppStore } from "@/store";
import { formatAll, formatAllMasked } from "@/lib/config-parser";
import {
  topBtnPrimary,
  topBtnGhost,
  inputClass,
} from "@/components/shared/ui-constants";
import { ExportMenu } from "@/components/shared/ExportMenu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export function ConfigListActions() {
  const configs = useAppStore((s) => s.configs);
  const testingAll = useAppStore((s) => s.testingAll);
  const probingAll = useAppStore((s) => s.probingAll);
  const testBatchProgress = useAppStore((s) => s.testBatchProgress);
  const probeBatchProgress = useAppStore((s) => s.probeBatchProgress);
  const testAllConfigs = useAppStore((s) => s.testAllConfigs);
  const probeAllConfigs = useAppStore((s) => s.probeAllConfigs);
  const copyText = useAppStore((s) => s.copyText);
  const exportAll = useAppStore((s) => s.exportAll);
  const downloadText = useAppStore((s) => s.downloadText);
  const exportAsJson = useAppStore((s) => s.exportAsJson);
  const importFromJson = useAppStore((s) => s.importFromJson);
  const removeAllConfigs = useAppStore((s) => s.removeAllConfigs);
  const configSearch = useAppStore((s) => s.configSearch);
  const setConfigSearch = useAppStore((s) => s.setConfigSearch);
  const configTagFilter = useAppStore((s) => s.configTagFilter);
  const setConfigTagFilter = useAppStore((s) => s.setConfigTagFilter);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const selectAll = useAppStore((s) => s.selectAll);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const deleteSelected = useAppStore((s) => s.deleteSelected);
  const testSelected = useAppStore((s) => s.testSelected);
  const probeSelected = useAppStore((s) => s.probeSelected);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  /* Close more-menu on outside click */
  useEffect(() => {
    if (!showMoreMenu) return;
    function onPointerDown(e: MouseEvent) {
      if (!moreMenuRef.current?.contains(e.target as Node)) setShowMoreMenu(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setShowMoreMenu(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showMoreMenu]);

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const cfg of configs) {
      if (cfg.tags) {
        for (const tag of cfg.tags) {
          if (tag.trim()) tagSet.add(tag.trim());
        }
      }
    }
    return Array.from(tagSet).sort();
  }, [configs]);

  function handleDeleteAllConfirm() {
    setShowDeleteAllConfirm(false);
    removeAllConfigs();
  }

  function handleExportAllMasked() {
    downloadText("ai-key-configs.txt", formatAllMasked(configs, "txt"));
  }

  function handleJsonFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importFromJson(file);
    e.target.value = "";
  }

  return (
    <>
      <div className="relative mb-1.5">
        <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={configSearch}
          onChange={(e) => setConfigSearch(e.target.value)}
          placeholder="搜索配置（名称/地址/模型）"
          className={`${inputClass} py-1.5 pl-9 pr-20 text-sm`}
        />
        {!configSearch && (
          <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 select-none rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[10px] font-medium text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            /
          </span>
        )}
        {configSearch && (
          <button
            type="button"
            onClick={() => setConfigSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            aria-label="清除搜索"
          >
            <FaTimes />
          </button>
        )}
      </div>

      {uniqueTags.length > 0 && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {uniqueTags.map((tag) => {
            const active = configTagFilter === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setConfigTagFilter(active ? "" : tag)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                }`}
              >
                {tag}
              </button>
            );
          })}
          {configTagFilter && (
            <button
              type="button"
              onClick={() => setConfigTagFilter("")}
              className="rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              清除筛选
            </button>
          )}
        </div>
      )}

      <div className="flex w-full flex-wrap items-center gap-1.5 sm:gap-2 pb-1">
        <button type="button" className={topBtnPrimary} onClick={testAllConfigs} disabled={testingAll}>
          {testingAll ? <FaSpinner className="animate-spin" aria-hidden /> : <FaBolt aria-hidden />}
          <span>{testingAll ? "测试中" : "一键测试全部"}</span>
        </button>
        <button type="button" className={topBtnGhost} onClick={probeAllConfigs} disabled={probingAll}>
          {probingAll ? <FaSpinner className="animate-spin" aria-hidden /> : <FaMagic aria-hidden />}
          <span>{probingAll ? "识别中" : "识别全部模型"}</span>
        </button>
        <Link href="/compare" className={topBtnGhost}>
          <FaChartBar aria-hidden />
          <span>对比</span>
        </Link>
        <ExportMenu
          onExport={exportAll}
          extraActions={[{ label: "导出全部（隐藏 Key）", onClick: () => handleExportAllMasked(), tone: "default" }]}
          label="导出"
          triggerClassName={topBtnGhost}
        />

        {/* More actions kebab dropdown */}
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            className={topBtnGhost}
            title="更多操作"
            aria-label="更多操作"
            aria-haspopup="menu"
            aria-expanded={showMoreMenu}
            onClick={() => setShowMoreMenu((prev) => !prev)}
          >
            <FaEllipsisV aria-hidden />
          </button>
          {showMoreMenu ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => {
                  setShowMoreMenu(false);
                  copyText(formatAll(configs, "txt"), "已复制全部配置");
                }}
              >
                <FaCopy className="text-zinc-400" aria-hidden />
                <span>复制全部</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => {
                  setShowMoreMenu(false);
                  exportAsJson();
                }}
              >
                <FaDownload className="text-zinc-400" aria-hidden />
                <span>备份 JSON</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => {
                  setShowMoreMenu(false);
                  fileInputRef.current?.click();
                }}
              >
                <FaUpload className="text-zinc-400" aria-hidden />
                <span>恢复 JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleJsonFileChange}
              />
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowDeleteAllConfirm(true);
                }}
                disabled={configs.length === 0}
              >
                <FaTrashAlt aria-hidden />
                <span>一键删除</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {testBatchProgress ? (
        <div className="border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 text-sm text-emerald-900 dark:text-emerald-200 rounded-md mb-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              测试中 {testBatchProgress.done} / {testBatchProgress.total}
              {testBatchProgress.currentName ? `: ${testBatchProgress.currentName}` : ""}
            </div>
            <div className="text-xs font-semibold">
              {Math.round((testBatchProgress.done / Math.max(1, testBatchProgress.total)) * 100)}%
            </div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.round((testBatchProgress.done / Math.max(1, testBatchProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {probeBatchProgress ? (
        <div className="border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 text-sm text-emerald-900 dark:text-emerald-200 rounded-md mb-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              识别中 {probeBatchProgress.done} / {probeBatchProgress.total}
              {probeBatchProgress.currentName ? `: ${probeBatchProgress.currentName}` : ""}
            </div>
            <div className="text-xs font-semibold">
              {Math.round((probeBatchProgress.done / Math.max(1, probeBatchProgress.total)) * 100)}%
            </div>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.round((probeBatchProgress.done / Math.max(1, probeBatchProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {showDeleteAllConfirm ? (
        <ConfirmDialog
          title="删除全部配置"
          message={`确认删除全部 ${configs.length} 条配置吗？此操作不可恢复。`}
          confirmLabel="全部删除"
          onConfirm={handleDeleteAllConfirm}
          onCancel={() => setShowDeleteAllConfirm(false)}
        />
      ) : null}

      {/* Select all / deselect all toggle */}
      {configs.length > 0 && (
        <div className="flex items-center gap-2 py-1">
          <button
            type="button"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={() => {
              const allVisible = configs.filter((item) => {
                const matchSearch = !configSearch || item.name.toLowerCase().includes(configSearch.toLowerCase()) || item.baseUrl.toLowerCase().includes(configSearch.toLowerCase()) || item.model.toLowerCase().includes(configSearch.toLowerCase());
                const matchTag = !configTagFilter || (item.tags || []).includes(configTagFilter);
                return matchSearch && matchTag;
              });
              const allSelected = allVisible.every((item) => selectedIds.includes(item.id));
              selectAll(allSelected ? [] : allVisible.map((item) => item.id));
            }}
          >
            {(() => {
              const allVisible = configs.filter((item) => {
                const matchSearch = !configSearch || item.name.toLowerCase().includes(configSearch.toLowerCase()) || item.baseUrl.toLowerCase().includes(configSearch.toLowerCase()) || item.model.toLowerCase().includes(configSearch.toLowerCase());
                const matchTag = !configTagFilter || (item.tags || []).includes(configTagFilter);
                return matchSearch && matchTag;
              });
              const allSelected = allVisible.length > 0 && allVisible.every((item) => selectedIds.includes(item.id));
              return allSelected ? "取消全选" : "全选可见";
            })()}
          </button>
          {selectedIds.length > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              已选 {selectedIds.length} 项
            </span>
          )}
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-[35] flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-2.5 shadow-2xl dark:border-emerald-700 dark:bg-zinc-900">
          <span className="mr-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            已选 {selectedIds.length} 项
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            onClick={testSelected}
            disabled={testingAll}
          >
            {testingAll ? <FaSpinner className="animate-spin" aria-hidden /> : <FaBolt aria-hidden />}
            <span>测试选中</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            onClick={probeSelected}
            disabled={probingAll}
          >
            {probingAll ? <FaSpinner className="animate-spin" aria-hidden /> : <FaMagic aria-hidden />}
            <span>探测选中</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950"
            onClick={deleteSelected}
          >
            <FaTrashAlt aria-hidden />
            <span>删除选中</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={clearSelection}
            title="取消选择"
            aria-label="取消选择"
          >
            <FaTimesCircle aria-hidden />
            <span>取消</span>
          </button>
        </div>
      )}
    </>
  );
}
