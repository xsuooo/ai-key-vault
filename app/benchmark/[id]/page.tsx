"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { DefaultLabelFormatterCallbackParams, EChartsOption } from "echarts";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  FaBolt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaExchangeAlt,
  FaFileExport,
  FaInfoCircle,
  FaSpinner,
  FaTimesCircle,
} from "react-icons/fa";

import { useAppStore } from "@/store";
import { formatDurationLabel, formatSuccessRateLabel, toDateTimeLabel, uniqueStrings, defaultProbeResult } from "@/lib/utils";
import {
  getBenchmarkRounds,
  getBenchmarkRoundDetails,
  isLikelyChatBenchmarkable,
  buildBenchmarkSummary,
  inferModelTags,
  getTagClassName,
  defaultModelBenchmarkResult,
  DEFAULT_BENCHMARK_ROUNDS,
} from "@/lib/benchmark-utils";
import { HelpHint } from "@/components/shared/HelpHint";
import { NoticeToast } from "@/components/shared/NoticeToast";
import {
  btnPrimary,
  btnGhost,
  smallBtn,
  inputClass,
} from "@/components/shared/ui-constants";

import type {
  FinishedModelBenchmarkResult,
} from "@/types/index";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const CHART_STYLE = { height: 320, width: "100%" } as const;

const LIGHT_CHART_THEME = {
  legend: "#334155",
  axis: "#64748b",
  label: "#0f172a",
  grid: "#e2e8f0",
  bar: "#16a34a",
  darkBar: "#0f172a",
  line: "#f59e0b",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e4e4e7",
  tooltipText: "#18181b",
};

const DARK_CHART_THEME = {
  legend: "#d4d4d8",
  axis: "#a1a1aa",
  label: "#f4f4f5",
  grid: "#3f3f46",
  bar: "#34d399",
  darkBar: "#cbd5e1",
  line: "#fbbf24",
  tooltipBg: "#18181b",
  tooltipBorder: "#3f3f46",
  tooltipText: "#f4f4f5",
};
// Local helpers

function StatusIconSmall({ ok }: { ok: boolean }) {
  return ok ? (
    <FaCheckCircle className="text-emerald-600" aria-hidden />
  ) : (
    <FaTimesCircle className="text-red-500" aria-hidden />
  );
}

function subscribeThemeClass(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "ai-key-vault-theme") onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  media.addEventListener("change", onStoreChange);
  queueMicrotask(onStoreChange);

  return () => {
    observer.disconnect();
    window.removeEventListener("storage", handleStorage);
    media.removeEventListener("change", onStoreChange);
  };
}

function getThemeClassSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerThemeClassSnapshot() {
  return false;
}
// Page component

export default function BenchmarkPage() {
  const { id } = useParams<{ id: string }>();
  const isDarkTheme = useSyncExternalStore(
    subscribeThemeClass,
    getThemeClassSnapshot,
    getServerThemeClassSnapshot,
  );
  const chartTheme = isDarkTheme ? DARK_CHART_THEME : LIGHT_CHART_THEME;
  const configs = useAppStore((s) => s.configs);
  const probeMap = useAppStore((s) => s.probeMap);
  const benchmarkMap = useAppStore((s) => s.benchmarkMap);
  const benchmarkBatch = useAppStore((s) => s.benchmarkBatch);
  const benchmarkSummaryMap = useAppStore((s) => s.benchmarkSummaryMap);
  const selectedProbeModels = useAppStore((s) => s.selectedProbeModels);
  const benchmarkListCollapsed = useAppStore((s) => s.benchmarkListCollapsed);
  const benchmarkPrompt = useAppStore((s) => s.benchmarkPrompt);
  const [benchmarkSearch, setBenchmarkSearch] = useState("");
  const [benchmarkRoundsInput, setBenchmarkRoundsInput] = useState(String(DEFAULT_BENCHMARK_ROUNDS));
  const [benchmarkChartModel, setBenchmarkChartModel] = useState("");
  const [benchmarkDetailModel, setBenchmarkDetailModel] = useState("");
  const toggleProbeModelSelection = useAppStore((s) => s.toggleProbeModelSelection);
  const selectVisibleProbeModels = useAppStore((s) => s.selectVisibleProbeModels);
  const selectAllProbeModels = useAppStore((s) => s.selectAllProbeModels);
  const clearSelectedProbeModels = useAppStore((s) => s.clearSelectedProbeModels);
  const setBenchmarkListCollapsed = useAppStore((s) => s.setBenchmarkListCollapsed);
  const applyProbeModel = useAppStore((s) => s.applyProbeModel);
  const benchmarkModels = useAppStore((s) => s.benchmarkModels);
  const copyProbeModels = useAppStore((s) => s.copyProbeModels);
  const exportBenchmarkReport = useAppStore((s) => s.exportBenchmarkReport);
  const setBenchmarkPrompt = useAppStore((s) => s.setBenchmarkPrompt);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const configItem = useMemo(
    () => configs.find((c) => c.id === id) || null,
    [configs, id],
  );
  const activeProbe = useMemo(() => {
    if (!configItem) return defaultProbeResult();
    return probeMap[configItem.id] || configItem.probe || defaultProbeResult();
  }, [configItem, probeMap]);

  const probeDialogModels = useMemo(() => {
    if (!configItem) return [];
    const benchmarkByModel = {
      ...(configItem.benchmarks || {}),
      ...(benchmarkMap[configItem.id] || {}),
    };
    return activeProbe.supportedModels.map((model) => {
      const tags = inferModelTags(model);
      const benchmark = benchmarkByModel[model] || defaultModelBenchmarkResult(model);
      return {
        model,
        tags,
        benchmark,
        benchmarkable: isLikelyChatBenchmarkable(model, tags),
        isCurrent: configItem.model === model,
      };
    });
  }, [activeProbe, configItem, benchmarkMap]);
  const benchmarkRounds = useMemo(() => getBenchmarkRounds(benchmarkRoundsInput), [benchmarkRoundsInput]);
  const filteredProbeModels = useMemo(() => {
    const query = benchmarkSearch.trim().toLowerCase();
    return [...probeDialogModels]
      .filter(
        (item) =>
          !query ||
          item.model.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query)),
      )
      .sort((left, right) => {
        if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
        return left.model.localeCompare(right.model);
      });
  }, [benchmarkSearch, probeDialogModels]);

  const visibleBenchmarkableModels = useMemo(
    () => filteredProbeModels.filter((item) => item.benchmarkable).map((item) => item.model),
    [filteredProbeModels],
  );

  const selectedBenchmarkableModels = useMemo(
    () =>
      probeDialogModels
        .filter((item) => selectedProbeModels.includes(item.model) && item.benchmarkable)
        .map((item) => item.model),
    [probeDialogModels, selectedProbeModels],
  );

  const benchmarkActionModels =
    selectedBenchmarkableModels.length > 0 ? selectedBenchmarkableModels : visibleBenchmarkableModels;
  const activeBenchmarkBatch =
    configItem && benchmarkBatch?.configId === configItem.id ? benchmarkBatch : null;

  const activeBenchmarkProgressPercent = useMemo(() => {
    if (!activeBenchmarkBatch) return 0;
    const totalRounds = Math.max(1, activeBenchmarkBatch.total * activeBenchmarkBatch.rounds);
    const completedRounds = activeBenchmarkBatch.done * activeBenchmarkBatch.rounds;
    const currentRound = activeBenchmarkBatch.currentRound ? Math.max(0, activeBenchmarkBatch.currentRound - 1) : 0;
    return Math.min(100, Math.round(((completedRounds + currentRound) / totalRounds) * 100));
  }, [activeBenchmarkBatch]);
  const mergedBenchmarkByModel = useMemo(
    () =>
      configItem
        ? {
            ...(configItem.benchmarks || {}),
            ...(benchmarkMap[configItem.id] || {}),
          }
        : {},
    [configItem, benchmarkMap],
  );

  const allFinishedBenchmarkResults = useMemo(() => {
    const modelsFromProbe = probeDialogModels.map((item) => item.model);
    const modelsFromResults = Object.keys(mergedBenchmarkByModel);
    const models = uniqueStrings([...modelsFromProbe, ...modelsFromResults]);

    return models
      .map((model) => {
        const result = mergedBenchmarkByModel[model];
        return result && (result.status === "success" || result.status === "error") ? result : null;
      })
      .filter((item): item is FinishedModelBenchmarkResult => Boolean(item))
      .sort((left, right) => {
        const leftCurrent = configItem?.model === left.model;
        const rightCurrent = configItem?.model === right.model;
        if (leftCurrent !== rightCurrent) return leftCurrent ? -1 : 1;
        return new Date(right.testedAt).getTime() - new Date(left.testedAt).getTime();
      });
  }, [configItem?.model, mergedBenchmarkByModel, probeDialogModels]);
  const storedBenchmarkSummary = useMemo(() => {
    if (!configItem) return null;
    return (
      benchmarkSummaryMap[configItem.id] ||
      buildBenchmarkSummary(configItem.id, allFinishedBenchmarkResults, benchmarkRounds)
    );
  }, [configItem, allFinishedBenchmarkResults, benchmarkRounds, benchmarkSummaryMap]);

  const activeBenchmarkScopeModels = useMemo(() => {
    if (activeBenchmarkBatch?.models.length) return activeBenchmarkBatch.models;
    if (storedBenchmarkSummary?.models.length) return storedBenchmarkSummary.models;
    return [];
  }, [activeBenchmarkBatch, storedBenchmarkSummary]);

  const benchmarkResults = useMemo(() => {
    if (activeBenchmarkScopeModels.length === 0) return allFinishedBenchmarkResults;

    return activeBenchmarkScopeModels
      .map((model) => {
        const result = mergedBenchmarkByModel[model];
        return result && (result.status === "success" || result.status === "error") ? result : null;
      })
      .filter((item): item is FinishedModelBenchmarkResult => Boolean(item))
      .sort((left, right) => {
        const leftCurrent = configItem?.model === left.model;
        const rightCurrent = configItem?.model === right.model;
        if (leftCurrent !== rightCurrent) return leftCurrent ? -1 : 1;
        return new Date(right.testedAt).getTime() - new Date(left.testedAt).getTime();
      });
  }, [activeBenchmarkScopeModels, allFinishedBenchmarkResults, configItem?.model, mergedBenchmarkByModel]);

  const activeBenchmarkSummary = useMemo(() => {
    if (!configItem) return null;
    if (activeBenchmarkBatch) {
      return buildBenchmarkSummary(configItem.id, benchmarkResults, activeBenchmarkBatch.rounds, activeBenchmarkBatch.models);
    }
    return storedBenchmarkSummary;
  }, [activeBenchmarkBatch, configItem, benchmarkResults, storedBenchmarkSummary]);

  const failedBenchmarkResults = useMemo(
    () => benchmarkResults.filter((item) => item.status === "error"),
    [benchmarkResults],
  );

  const chartReadyBenchmarkResults = useMemo(
    () => benchmarkResults.filter((item) => item.speed && item.status === "success"),
    [benchmarkResults],
  );

  const preferredBenchmarkChartModel = useMemo(
    () =>
      chartReadyBenchmarkResults.some((item) => item.model === benchmarkChartModel)
        ? benchmarkChartModel
        : activeBenchmarkSummary?.recommendedModel ||
          activeBenchmarkSummary?.fastestModel ||
          chartReadyBenchmarkResults[0]?.model ||
          "",
    [activeBenchmarkSummary, benchmarkChartModel, chartReadyBenchmarkResults],
  );

  const activeBenchmarkChartResult = useMemo(
    () => chartReadyBenchmarkResults.find((item) => item.model === preferredBenchmarkChartModel) || null,
    [preferredBenchmarkChartModel, chartReadyBenchmarkResults],
  );

  const activeBenchmarkDetailResult = useMemo(
    () => benchmarkResults.find((item) => item.model === benchmarkDetailModel) || null,
    [benchmarkDetailModel, benchmarkResults],
  );
  const benchmarkComparisonChartOption = useMemo<EChartsOption | null>(() => {
    if (chartReadyBenchmarkResults.length === 0) return null;

    const sortedResults = [...chartReadyBenchmarkResults].sort(
      (left, right) => (left.speed?.avgMs || Number.POSITIVE_INFINITY) - (right.speed?.avgMs || Number.POSITIVE_INFINITY),
    );

    return {
      backgroundColor: "transparent",
      animationDuration: 260,
      grid: { left: 18, right: 18, top: 20, bottom: 10, containLabel: true },
      legend: { top: 0, textStyle: { color: chartTheme.legend, fontSize: 11 } },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        valueFormatter: (value: unknown) => formatDurationLabel(typeof value === "number" ? value : undefined),
      },
      xAxis: {
        type: "value",
        axisLabel: { color: chartTheme.axis, formatter: (value: number) => formatDurationLabel(value) },
        splitLine: { lineStyle: { color: chartTheme.grid } },
      },
      yAxis: {
        type: "category",
        axisLabel: { color: chartTheme.label, width: 180, overflow: "truncate" },
        data: sortedResults.map((item) => item.model),
      },
      series: [
        {
          name: "平均耗时",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: chartTheme.bar, borderRadius: [0, 8, 8, 0] },
          data: sortedResults.map((item) => item.speed?.avgMs || 0),
        },
        {
          name: "中位耗时",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: chartTheme.darkBar, borderRadius: [0, 8, 8, 0] },
          data: sortedResults.map((item) => item.speed?.medianMs || 0),
        },
      ],
    };
  }, [chartReadyBenchmarkResults, chartTheme]);

  const benchmarkRoundChartOption = useMemo<EChartsOption | null>(() => {
    if (!activeBenchmarkChartResult?.speed) return null;

    const roundDetails = getBenchmarkRoundDetails(activeBenchmarkChartResult);
    const elapsedValues = roundDetails.map((item) => item.elapsedMs ?? null);
    const firstTokenValues = roundDetails.map((item) => item.firstTokenMs ?? null);

    return {
      backgroundColor: "transparent",
      animationDuration: 260,
      grid: { left: 20, right: 56, top: 24, bottom: 18, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.tooltipText },
        valueFormatter: (value: unknown) => formatDurationLabel(typeof value === "number" ? value : undefined),
      },
      legend: { top: 0, textStyle: { color: chartTheme.legend, fontSize: 11 } },
      xAxis: {
        type: "category",
        axisLabel: { color: chartTheme.axis },
        data: roundDetails.map((item) => `第${item.round}轮`),
      },
      yAxis: {
        type: "value",
        axisLabel: { color: chartTheme.axis, formatter: (value: number) => formatDurationLabel(value) },
        splitLine: { lineStyle: { color: chartTheme.grid } },
      },
      series: [
        {
          name: "总耗时",
          type: "bar",
          barMaxWidth: 26,
          itemStyle: { color: chartTheme.darkBar, borderRadius: [8, 8, 0, 0] },
          markLine: {
            symbol: "none",
              label: {
                color: chartTheme.label,
                position: "insideEndTop",
                formatter: (params: DefaultLabelFormatterCallbackParams) =>
                  `${params.name || ""} ${formatDurationLabel(typeof params.value === "number" ? params.value : undefined)}`,
              },
            lineStyle: { type: "dashed", color: chartTheme.bar },
            data: [
              { name: "平均", yAxis: activeBenchmarkChartResult.speed.avgMs },
              { name: "中位", yAxis: activeBenchmarkChartResult.speed.medianMs },
            ],
          },
          data: elapsedValues,
        },
        {
          name: "首字时间",
          type: "line",
          smooth: true,
          connectNulls: false,
          itemStyle: { color: chartTheme.line },
          lineStyle: { width: 2, color: chartTheme.line },
          data: firstTokenValues,
        },
      ],
    };
  }, [activeBenchmarkChartResult, chartTheme]);
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPadding = body.style.paddingRight;
    const prevHtmlOverflow = html.style.overflow;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPadding;
      html.style.overflow = prevHtmlOverflow;
    };
  }, []);
  if (!configItem) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-8 text-zinc-900 dark:text-zinc-100">
        <p className="text-base font-semibold">未找到配置</p>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">ID: {id}</p>
        <Link href="/" className={btnGhost + " mt-4"}>
          返回首页
        </Link>
        <NoticeToast />
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-screen w-full max-w-7xl flex-col overflow-hidden px-3 py-3 text-zinc-900 dark:text-zinc-100 sm:px-4">
      {/* ================================================================ */}
      {/* Header                                                          */}
      {/* ================================================================ */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/" className={smallBtn}>
              &larr; 返回
            </Link>
            <Link href={`/test/${id}`} className={smallBtn}>
              连通测试
            </Link>
          </div>
          <h1 className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <span>性能评测</span>
            <HelpHint text="对已识别到的模型做响应速度测试，方便你比较哪个模型更快、更稳，适合设为默认模型。" />
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {configItem.name} &middot; 已识别 {activeProbe.supportedModels.length} 个模型
            {activeProbe.testedAt ? ` &middot; 最近识别：${toDateTimeLabel(new Date(activeProbe.testedAt))}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnGhost}
            onClick={() => copyProbeModels(configItem, activeProbe)}
          >
            <FaCopy aria-hidden />
            <span>复制模型列表</span>
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => exportBenchmarkReport(configItem.id)}
            disabled={benchmarkResults.length === 0}
          >
            <FaFileExport aria-hidden />
            <span>导出评测报告</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Toolbar                                                         */}
      {/* ================================================================ */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 py-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              搜索模型
            </span>
            <input
              className={inputClass}
              value={benchmarkSearch}
              onChange={(e) => setBenchmarkSearch(e.target.value)}
              placeholder="输入模型名或 tag，例如 gpt / thinking / embedding"
            />
          </label>

          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">测试次数</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {[1, 2, 3].map((round) => {
                const active = benchmarkRounds === round;
                return (
                  <button
                    key={round}
                    type="button"
                    className={
                      active
                        ? "rounded-full border border-emerald-700 bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                        : "rounded-full border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    }
                    onClick={() => setBenchmarkRoundsInput(String(round))}
                  >
                    {round}次
                  </button>
                );
              })}
              <input
                className="w-14 rounded-xl border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-zinc-800 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/40"
                value={benchmarkRoundsInput}
                onChange={(e) => setBenchmarkRoundsInput(e.target.value.replace(/[^\d]/g, "").slice(0, 1))}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              className={smallBtn}
              onClick={() => selectVisibleProbeModels(visibleBenchmarkableModels)}
              disabled={visibleBenchmarkableModels.length === 0}
            >
              当前筛选全选
            </button>
            <button
              type="button"
              className={smallBtn}
              onClick={() => selectAllProbeModels(configItem?.id)}
              disabled={probeDialogModels.filter((item) => item.benchmarkable).length === 0}
            >
              全选可测
            </button>
            <button
              type="button"
              className={smallBtn}
              onClick={clearSelectedProbeModels}
              disabled={selectedProbeModels.length === 0}
            >
              清空选择
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => benchmarkModels(configItem, benchmarkActionModels, benchmarkRounds)}
              disabled={Boolean(activeBenchmarkBatch) || benchmarkActionModels.length === 0}
            >
              {activeBenchmarkBatch ? (
                <FaSpinner className="animate-spin" aria-hidden />
              ) : (
                <FaBolt aria-hidden />
              )}
              <span>开始测试 {benchmarkActionModels.length}</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span>当前模型：{configItem.model || "未设置"}</span>
          <span>可测试：{probeDialogModels.filter((item) => item.benchmarkable).length} 个</span>
          <span>本次目标：{benchmarkActionModels.length} 个</span>
          <span>
            {activeBenchmarkBatch
              ? `本次完成：${benchmarkResults.length}/${activeBenchmarkBatch.total}`
              : `最新结果：${benchmarkResults.length} 个`}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            onClick={() => setPromptExpanded((prev) => !prev)}
          >
            自定义测试提示词
            {promptExpanded ? <FaChevronUp aria-hidden className="text-[10px]" /> : <FaChevronDown aria-hidden className="text-[10px]" />}
          </button>
        </div>

        {promptExpanded ? (
          <div className="mt-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                自定义测试提示词
              </span>
              <input
                className={inputClass}
                value={benchmarkPrompt}
                onChange={(e) => setBenchmarkPrompt(e.target.value)}
                placeholder="Reply with exactly OK. Do not add anything else."
              />
            </label>
          </div>
        ) : null}
      </div>

      {/* ================================================================ */}
      {/* Two-column body                                                 */}
      {/* ================================================================ */}
      <div
        className={`grid min-h-0 flex-1 gap-4 overflow-hidden py-4 ${
          benchmarkListCollapsed
            ? "xl:grid-cols-[minmax(17rem,0.34fr)_minmax(0,1fr)]"
            : "xl:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)]"
        }`}
      >
        {/* ---- Left: model list ---- */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 px-3 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">模型列表</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                显示 {filteredProbeModels.length} / {probeDialogModels.length} 个模型
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                已选 {selectedProbeModels.length}
              </div>
              <button
                type="button"
                className={smallBtn}
                onClick={() => setBenchmarkListCollapsed(!benchmarkListCollapsed)}
                aria-expanded={!benchmarkListCollapsed}
              >
                {benchmarkListCollapsed ? <FaChevronDown aria-hidden /> : <FaChevronUp aria-hidden />}
                <span>{benchmarkListCollapsed ? "展开" : "折叠"}</span>
              </button>
            </div>
          </div>

          {/* Batch progress bar */}
          {activeBenchmarkBatch ? (
            <div className="border-b border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-3 text-sm text-emerald-900 dark:text-emerald-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  正在测试 {activeBenchmarkBatch.done} / {activeBenchmarkBatch.total} 个模型
                  {activeBenchmarkBatch.skipped > 0 ? `，已跳过 ${activeBenchmarkBatch.skipped}` : ""}
                </div>
                <div className="text-xs font-semibold">
                  {activeBenchmarkBatch.currentModel || "-"} &middot; 第{" "}
                  {activeBenchmarkBatch.currentRound || 1}/{activeBenchmarkBatch.rounds} 次
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${activeBenchmarkProgressPercent}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">总进度 {activeBenchmarkProgressPercent}%</div>
            </div>
          ) : null}

          {/* Model rows */}
          {benchmarkListCollapsed ? (
            <div className="px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
              模型列表已折叠。你可以手动展开继续多选或切换当前模型。
            </div>
          ) : filteredProbeModels.length > 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto pb-3">
              {filteredProbeModels.map((entry) => {
                const selected = selectedProbeModels.includes(entry.model);
                const benchmark = entry.benchmark;

                return (
                  <div
                    key={entry.model}
                    className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 last:border-b-0 ${
                      entry.isCurrent ? "bg-emerald-50/60 dark:bg-emerald-900/20" : "bg-white dark:bg-zinc-900"
                    }`}
                  >
                    {/* Checkbox */}
                    <label className={`inline-flex items-center ${entry.benchmarkable ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"}`}>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!entry.benchmarkable}
                        onChange={() => toggleProbeModelSelection(entry.model)}
                        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>

                    {/* Model info */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`truncate text-sm font-semibold ${
                            entry.benchmarkable ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        >
                          {entry.model}
                        </span>
                        {entry.isCurrent ? (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-400">
                            当前
                          </span>
                        ) : null}
                        {!entry.benchmarkable ? (
                          <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                            不支持
                          </span>
                        ) : null}
                      </div>

                      {entry.tags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {entry.tags.map((tag) => (
                            <span
                              key={`${entry.model}-${tag}`}
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${getTagClassName(tag)}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {benchmark.speed
                          ? `平均 ${formatDurationLabel(benchmark.speed.avgMs)} · 中位 ${formatDurationLabel(benchmark.speed.medianMs)} · 首字 ${formatDurationLabel(benchmark.speed.firstTokenMedianMs)} · 成功 ${formatSuccessRateLabel(benchmark.speed.successRate)}`
                          : benchmark.detail || "暂无测试结果"}
                      </div>
                    </div>

                    {/* Apply button */}
                    <button
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        entry.isCurrent
                          ? "border-emerald-200 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      }`}
                      onClick={() => applyProbeModel(configItem.id, entry.model)}
                      disabled={entry.isCurrent}
                      title={entry.isCurrent ? `${entry.model} 已是当前模型` : "设为当前模型"}
                      aria-label={entry.isCurrent ? `${entry.model} 已是当前模型` : "设为当前模型"}
                    >
                      <FaExchangeAlt aria-hidden />
                      <span>{entry.isCurrent ? "当前" : "设为当前"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-6 text-sm text-zinc-500 dark:text-zinc-400">当前搜索条件下没有可展示的模型</div>
          )}
        </section>

        {/* ---- Right: results ---- */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">最新测试结果</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {activeBenchmarkBatch
                    ? `测试进行中：${benchmarkResults.length}/${activeBenchmarkBatch.total} 个模型已返回结果`
                    : activeBenchmarkSummary?.finishedAt
                      ? `更新时间：${toDateTimeLabel(new Date(activeBenchmarkSummary.finishedAt))}`
                      : "尚未开始性能评测"}
                </p>
              </div>
              {activeBenchmarkSummary?.recommendedModel ? (
                <button
                  type="button"
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  onClick={() => setBenchmarkChartModel(activeBenchmarkSummary.recommendedModel || "")}
                >
                  推荐：{activeBenchmarkSummary.recommendedModel}
                </button>
              ) : null}
            </div>
          </div>

          {activeBenchmarkSummary ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 sm:pb-10">
              {/* Failure notice */}
              {failedBenchmarkResults.length > 0 ? (
                <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
                  本次有 {failedBenchmarkResults.length} 个模型返回失败，表格里已用红色标出；把鼠标移到失败行或查看左侧列表，可看到错误原因。
                </div>
              ) : null}

              {/* Summary cards */}
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">成功返回</p>
                  <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    {activeBenchmarkSummary.successModels}/{activeBenchmarkSummary.totalModels}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">最快模型</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeBenchmarkSummary.fastestModel || "-"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDurationLabel(activeBenchmarkSummary.fastestMedianMs)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">首字最快</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeBenchmarkSummary.quickestFirstTokenModel || "-"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDurationLabel(activeBenchmarkSummary.quickestFirstTokenMs)}
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">最稳模型</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {activeBenchmarkSummary.mostStableModel || "-"}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">波动 {formatDurationLabel(activeBenchmarkSummary.stabilityMs)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-800 dark:bg-emerald-950/40">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">默认推荐</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    {activeBenchmarkSummary.recommendedModel || "-"}
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">优先成功率，再看中位耗时和波动。</p>
                </div>
              </div>

              {/* Results table */}
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">结果摘要</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      这里先看每个模型的汇总指标；点右侧详情按钮再看每一轮的数据。
                    </p>
                  </div>
                  {activeBenchmarkChartResult ? (
                    <div className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      图表焦点：{activeBenchmarkChartResult.model}
                    </div>
                  ) : null}
                </div>

                {benchmarkResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                      <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        <tr>
                          <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 dark:bg-zinc-900">模型</th>
                          <th className="px-3 py-3">状态</th>
                          <th className="px-3 py-3">平均</th>
                          <th className="px-3 py-3">中位</th>
                          <th className="px-3 py-3">首字中位</th>
                          <th className="px-3 py-3">成功率</th>
                          <th className="px-3 py-3">详情</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkResults.map((result) => {
                          const focused = activeBenchmarkChartResult?.model === result.model;
                          const failed = result.status === "error";
                          const rowBg = focused
                            ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                            : failed
                              ? "bg-red-50/50 dark:bg-red-950/25"
                              : "bg-white dark:bg-zinc-950/60";

                          return (
                            <tr
                              key={result.model}
                              className={`cursor-pointer border-t border-zinc-200 text-zinc-700 transition dark:border-zinc-800 dark:text-zinc-300 ${
                                failed ? "hover:bg-red-50 dark:hover:bg-red-950/40" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                              } ${rowBg}`}
                              onClick={() => setBenchmarkChartModel(result.model)}
                            >
                              <td className={`sticky left-0 z-10 px-4 py-3 align-top ${rowBg}`}>
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">{result.model}</div>
                                <div className="mt-1">
                                  <span
                                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      failed ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                    }`}
                                  >
                                    <StatusIconSmall ok={!failed} />
                                    <span>{failed ? "失败" : "完成"}</span>
                                  </span>
                                </div>
                                {failed && result.detail ? (
                                  <div className="mt-1 max-w-xs break-words text-[11px] leading-5 text-red-700 dark:text-red-300">
                                    {result.detail}
                                  </div>
                                ) : null}
                                {(configItem?.benchmarkHistory?.[result.model]?.length || 0) > 0 ? (
                                  <div className="mt-1 text-[11px] text-blue-600 dark:text-blue-400">
                                    历史: {configItem!.benchmarkHistory![result.model].length} 次测试
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                                    failed ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  }`}
                                >
                                  <StatusIconSmall ok={!failed} />
                                  <span>{failed ? "失败" : "完成"}</span>
                                </span>
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                {formatDurationLabel(result.speed?.avgMs)}
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                {formatDurationLabel(result.speed?.medianMs)}
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                {formatDurationLabel(result.speed?.firstTokenMedianMs)}
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                {formatSuccessRateLabel(result.speed?.successRate)}
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setBenchmarkChartModel(result.model);
                                    setBenchmarkDetailModel(result.model);
                                  }}
                                  title={`查看 ${result.model} 详情`}
                                  aria-label={`查看 ${result.model} 详情`}
                                >
                                  <FaInfoCircle aria-hidden />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                    开始测试后，这里会展示每个模型的轮次明细。
                  </div>
                )}
              </div>

              {/* Charts */}
              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">模型对比</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">柱状图对比平均耗时与中位耗时。</p>
                  </div>
                  {benchmarkComparisonChartOption ? (
                    <ReactECharts
                      option={benchmarkComparisonChartOption}
                      style={CHART_STYLE}
                      notMerge
                    />
                  ) : (
                    <div className="flex h-80 items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      暂无可绘制的图表数据
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">轮次走势</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {activeBenchmarkChartResult
                        ? `${activeBenchmarkChartResult.model} 的每轮总耗时和首字时间。`
                        : "点击上表中的模型查看详情。"}
                    </p>
                  </div>
                  {benchmarkRoundChartOption ? (
                    <ReactECharts
                      option={benchmarkRoundChartOption}
                      style={CHART_STYLE}
                      notMerge
                    />
                  ) : (
                    <div className="flex h-80 items-center justify-center rounded-xl bg-zinc-50 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                      选择一个已有测速结果的模型后，这里显示轮次曲线
                    </div>
                  )}
                </div>
              </div>

              {/* Detail modal */}
              {activeBenchmarkDetailResult ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/60 px-4" onClick={() => setBenchmarkDetailModel("")}>
                  <div className="max-h-[min(78vh,42rem)] w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
                      <div>
                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                          {activeBenchmarkDetailResult.model}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          查看该模型每一轮的总耗时、首字时间和错误信息。
                        </p>
                      </div>
                      <button
                        type="button"
                        className={smallBtn}
                        onClick={() => setBenchmarkDetailModel("")}
                      >
                        <FaTimesCircle aria-hidden />
                        <span>关闭</span>
                      </button>
                    </div>

                    <div className="max-h-[calc(min(78vh,42rem)-5rem)] overflow-y-auto px-4 py-4">
                      {/* Summary mini-cards */}
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">状态</p>
                          <p
                            className={`mt-1 text-sm font-semibold ${
                              activeBenchmarkDetailResult.status === "error" ? "text-red-700 dark:text-red-300" : "text-zinc-900 dark:text-zinc-100"
                            }`}
                          >
                            {activeBenchmarkDetailResult.status === "error" ? "失败" : "完成"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">平均</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatDurationLabel(activeBenchmarkDetailResult.speed?.avgMs)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">中位</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatDurationLabel(activeBenchmarkDetailResult.speed?.medianMs)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/60">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">首字中位</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {formatDurationLabel(activeBenchmarkDetailResult.speed?.firstTokenMedianMs)}
                          </p>
                        </div>
                      </div>

                      {activeBenchmarkDetailResult.detail ? (
                        <div
                          className={`mt-3 rounded-2xl border px-3 py-2.5 text-sm leading-6 ${
                            activeBenchmarkDetailResult.status === "error"
                              ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-300"
                          }`}
                        >
                          {activeBenchmarkDetailResult.detail}
                        </div>
                      ) : null}

                      {/* Round detail table */}
                      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                            <tr>
                              <th className="px-4 py-3">轮次</th>
                              <th className="px-4 py-3">状态</th>
                              <th className="px-4 py-3">总耗时</th>
                              <th className="px-4 py-3">首字时间</th>
                              <th className="px-4 py-3">错误信息</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getBenchmarkRoundDetails(activeBenchmarkDetailResult).map((detail) => (
                              <tr
                                key={`${activeBenchmarkDetailResult.model}-detail-${detail.round}`}
                                className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                              >
                                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">第 {detail.round} 轮</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      detail.ok ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                    }`}
                                  >
                                    <StatusIconSmall ok={detail.ok} />
                                    <span>{detail.ok ? "成功" : "失败"}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                  {detail.ok ? formatDurationLabel(detail.elapsedMs) : "-"}
                                </td>
                                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                                  {detail.ok ? formatDurationLabel(detail.firstTokenMs) : "-"}
                                </td>
                                <td className="px-4 py-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                                  {detail.error || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* History trend */}
                      {(configItem?.benchmarkHistory?.[activeBenchmarkDetailResult.model]?.length || 0) > 0 ? (() => {
                        const history = configItem!.benchmarkHistory![activeBenchmarkDetailResult.model];
                        const last3 = history.slice(-3);
                        return (
                          <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/70 dark:bg-blue-950/30">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                              历史趋势（最近 {last3.length} 次 / 共 {history.length} 次）
                            </p>
                            <ul className="mt-2 space-y-1.5">
                              {last3.map((entry, idx) => (
                                <li key={`${entry.testedAt}-${idx}`} className="flex flex-wrap items-center gap-x-3 text-xs text-blue-800 dark:text-blue-300">
                                  <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">{entry.testedAt ? toDateTimeLabel(new Date(entry.testedAt)) : "-"}</span>
                                  <span>平均 {formatDurationLabel(entry.speed?.avgMs)}</span>
                                  <span>中位 {formatDurationLabel(entry.speed?.medianMs)}</span>
                                  <span>首字 {formatDurationLabel(entry.speed?.firstTokenMedianMs)}</span>
                                  <span>成功率 {formatSuccessRateLabel(entry.speed?.successRate)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })() : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
              选择模型并开始测试后，这里会展示最新结果、轮次明细和图表。
            </div>
          )}
        </section>
      </div>

      <NoticeToast />
    </main>
  );
}
